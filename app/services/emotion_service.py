import cv2

import numpy as np
from datetime import datetime
from app.schemas.emotion import EmotionSchema
import google.generativeai as genai
import os
import asyncio 
import tensorflow as tf
from tensorflow.keras.applications.convnext import preprocess_input
from collections import deque
import json
from datetime import datetime
import time
from app.db.mongodb import save_emotion_result
from collections import Counter

tf.config.run_functions_eagerly(False)
_GLOBAL_LAST_AI_REQUEST_TIME = 0

tf.config.threading.set_intra_op_parallelism_threads(2)
tf.config.threading.set_inter_op_parallelism_threads(2)

EMOTION_VALUES = {
    "happy": 1.0,
    "surprise": 0.6,
    "neutral": 0.0,
    "sad": -0.6,
    "fear": -0.8,
    "disgust": -0.8,
    "angry": -1.0
}

class EmotionService:
    def __init__(self, model, repository):
        self.model = model 
        self.repository = repository 
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.classes = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
        self.save_interval = 2
        self.last_save_time = 0
        self.emotion_buffer = deque(maxlen=5)

        api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        self.ai_client = genai.GenerativeModel('models/gemini-flash-lite-latest')
        try:
            self.loop = asyncio.get_running_loop()
        except RuntimeError:
            self.loop = asyncio.get_event_loop()


    async def get_history_list(self, limit: int = 10):
        """Отримує історію з репозиторію."""
        return await self.repository.get_history_list(limit)
    
    async def get_stats(self):
        """Отримує загальну статистику."""
        return await self.repository.get_emotion_stats()

    async def clear_history(self):
        """Очищає всю історію."""
        return await self.repository.delete_all_logs()


    async def analyze_and_save(self, frame):
        """
        Точка входу, яку викликає генератор. 
        Вона миттєво віддає роботу в окремий потік.
        """
        return await asyncio.to_thread(self._sync_analyze, frame)

    def _sync_analyze(self, frame):
        """
        Синхронна функція, де відбувається вся важка математика.
        Вона працює в окремому потоці і не блокує відео.
        """
        dominant_emotion, confidence, box = None, None, None
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 8)

        for (x, y, w, h) in faces:
            face_roi = frame[y:y+h, x:x+w]
            rgb_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
            
            face_roi_norm = cv2.normalize(rgb_face, None, 0, 255, cv2.NORM_MINMAX)
            resized = cv2.resize(face_roi_norm, (224, 224)) 
            img_array = np.expand_dims(resized, axis=0)
            
            processed_img = img_array.astype(np.float32) / 127.5 - 1.0

            prediction_raw = self.model(processed_img, training=False)
            prediction = prediction_raw.numpy()[0]
            self.emotion_buffer.append(prediction)
            
            smoothed_prediction = np.mean(self.emotion_buffer, axis=0)
            
            dominant_idx = np.argmax(smoothed_prediction)
            dominant_emotion = self.classes[dominant_idx]
            confidence = float(smoothed_prediction[dominant_idx])

            emotions_map = { 
                self.classes[i]: round(float(smoothed_prediction[i]), 4) 
                for i in range(len(self.classes))
            }
            box = (x, y, w, h)
            current_time = time.time()
            
            if current_time - self.last_save_time > self.save_interval:
                if confidence is not None and confidence > 0.30: 
                    try:
                        # Формуємо схему точно так, як було раніше
                        emotion_data = EmotionSchema(
                            emotions_map=emotions_map, 
                            dominant_emotion=dominant_emotion,
                            confidence=round(confidence, 2),
                            timestamp=datetime.now()
                        )
                        
                        # Передаємо в головний цикл замість create_task
                        loop_to_use = self.loop
                        if loop_to_use and loop_to_use.is_running():
                            asyncio.run_coroutine_threadsafe(
                                self.repository.create_log(emotion_data), 
                                loop_to_use
                            )
                        self.last_save_time = current_time
                    except Exception as e:
                        print(f"Error saving log: {e}")
            
            break
            
        return dominant_emotion, confidence, box

    async def get_smart_ai_recommendation(self, user_text: str = None, audio_emotion: str = None):
        global _GLOBAL_LAST_AI_REQUEST_TIME
        current_time = time.time()


        if not user_text:
            seconds_passed = current_time - _GLOBAL_LAST_AI_REQUEST_TIME
            if seconds_passed < 60:
                return {"recommendation": f"⚠️ Зачекайте ще {int(60 - seconds_passed)} сек."}
            _GLOBAL_LAST_AI_REQUEST_TIME = current_time

        recent_logs = await self.repository.get_recent_voice_logs(minutes=30)
        dominant_audio_emotion = "neutral"

        if recent_logs:
            if not user_text:
                user_text = " ".join([log.get('transcription', '') or '' for log in recent_logs])
            
            tones = [log.get('audio_emotion') for log in recent_logs if log.get('audio_emotion')]
            if audio_emotion: 
                tones.append(audio_emotion) 
                
            if tones:
                dominant_audio_emotion = Counter(tones).most_common(1)[0][0]
        else:
            dominant_audio_emotion = audio_emotion or "neutral"

        stats = await self.repository.get_stats_for_period(minutes=30) or {}
        has_stats = any(v is not None and v > 0 for v in stats.values()) if stats else False

        if not has_stats and not user_text:
            return {"recommendation": "Не бачу активності. Попрацюйте перед камерою! 🎥🎤"}

        mood_description = ", ".join([f"{k}: {int((v or 0)*100)}%" for k, v in stats.items()]) if stats else "немає даних"
        dominant_state = max(stats, key=lambda k: stats.get(k) or 0) if has_stats else "neutral"

        text_emotion = "neutral"
        if user_text and user_text.strip():
            try:
                class_response = await self.ai_client.generate_content_async(
                    f"Визнач емоцію тексту (1 слово): {user_text}. Список: happy, surprise, neutral, sad, disgust, fear, angry."
                )
                candidate = class_response.text.strip().lower()
                if candidate in self.classes:
                    text_emotion = candidate
            except: pass

        session_data = f"- Домінуюча міміка: {dominant_state}\n"
        
        if user_text and user_text.strip():
            session_data += f"- Слова користувача: {user_text}\n"
            session_data += f"- Домінуючий тон голосу (за 30 хв): {dominant_audio_emotion}\n"
            instruction = "Аналізуй і слова, і міміку."
        else:
            instruction = "Аналізуй ТІЛЬКИ міміку. НЕ ЗГАДУЙ про те, що користувач мовчить, це нормально."

        try:
            prompt = (
                f"Ти — емпатичний психолог та емоційний коуч. Твоє завдання: надати розгорнуту підтримку та мультимедійну пораду.\n"
                f"ДАНІ СЕАНСУ:\n"
                f"{session_data}\n"
                f"ІНСТРУКЦІЯ: {instruction}\n\n"
                f"ФОРМАТУВАННЯ (Markdown):\n"
                f"1. **Аналіз стану**: Почни з детального (2-3 речення) опису того, що ти відчуваєш у стані користувача.\n"
                f"2. **Твої кроки**: Використовуй маркований список `-` для 2-3 конкретних дій.\n"
                f"3. **Рекомендації**: Окремим рядком порадь конкретний **фільм**, **музичний альбом/жанр** або **книгу**.\n\n"
                f"Мова: Українська. Тон: Професійний, глибокий. Обмеження: до 600 символів. Починай без вступів."
            )
            response = await self.ai_client.generate_content_async(prompt)
            return {
                "recommendation": response.text,
                "text_emotion": text_emotion,
                "audio_emotion": audio_emotion or "neutral",
                "transcription": user_text or "",
                "detected_face": dominant_state
            }
        except Exception as e:
            return {"recommendation": f"Помилка ШІ: {str(e)}", "text_emotion": text_emotion, "detected_face": dominant_state}

    async def get_combined_timeline(self, limit: int = 20):
        """
        Фінальна версія: Weighted Fusion + Top-3 аналітика.
        Використовує вже збережені результати аналізу (без повторних запитів до ШІ).
        """
        try:
            raw_data = await self.repository.get_history_list(limit=limit * 2)
            
            faces = [d for d in raw_data if "emotions_map" in d]
            voices = [d for d in raw_data if "audio_emotion" in d]
            
            combined = []
            used_voices_ids = set()

            for f in faces:
                f_map = {k: float(v) for k, v in f.get("emotions_map", {}).items()}
                
                try:
                    f_time = datetime.fromisoformat(f["timestamp"])
                except:
                    continue

                matching_v = None
                for v in voices:
                    try:
                        v_time = datetime.fromisoformat(v["timestamp"])
                        if abs((f_time - v_time).total_seconds()) < 10:
                            matching_v = v
                            break
                    except:
                        continue
                
                if matching_v:
                    v_emo = matching_v.get("audio_emotion", "").lower()
                    if v_emo:
                        f_map[v_emo] = f_map.get(v_emo, 0.0) + 0.9 
                    
                    t_emo = matching_v.get("text_emotion", "").lower()
                    if t_emo and t_emo in ["happy", "sad", "angry", "fear", "disgust", "surprise"]:
                        f_map[t_emo] = f_map.get(t_emo, 0.0) + 0.8 
                    
                    used_voices_ids.add(matching_v.get("id"))


                total_weight = sum(f_map.values())
                if total_weight > 0:
                    normalized = {k: (v / total_weight) for k, v in f_map.items()}
                else:
                    normalized = f_map

                top_3 = dict(sorted(normalized.items(), key=lambda x: x[1], reverse=True)[:3])

                combined.append({
                    "id": f.get("id"),
                    "timestamp": f["timestamp"],
                    "emotions_map": top_3,
                    "dominant_emotion": max(top_3, key=top_3.get) if top_3 else "neutral",
                    "source": "fusion" if matching_v else "camera"
                })

            for v in voices:
                if v.get("id") not in used_voices_ids:
                    combined.append({
                        "id": v.get("id"),
                        "timestamp": v["timestamp"],
                        "audio_emotion": v.get("audio_emotion", "neutral"), 
                        "text_emotion": v.get("text_emotion"), 
                        "source": "voice"
                    })

            combined.sort(key=lambda x: str(x["timestamp"]), reverse=True)
            return combined[:limit]

        except Exception as e:
            print(f"Error in get_combined_timeline: {e}")
            return []

    async def get_text_sentiment(self, text: str):
        if not text or len(text) < 3: return "neutral", 0.0
        try:
            prompt = f"Проаналізуй текст: '{text}'. Формат JSON: {{\"emotion\": \"назва\", \"polarity\": 0.5}}"
            response = await self.ai_client.generate_content_async(prompt)
            data = json.loads(response.text.replace('```json', '').replace('```', '').strip())
            return data.get("emotion", "neutral"), data.get("polarity", 0.0)
        except: return "neutral", 0.0


    async def generate_smart_advice(self):
            try:
                history = await self.repository.get_history_list(limit=10) 
                if not history:
                    return "Я ще вивчаю ваш настрій. Посміхніться в камеру! 😊"

                negatives = ["sad", "angry", "disgust", "fear"]
                bad_mood_count = sum(1 for log in history if log.get('dominant_emotion') in negatives)

                if bad_mood_count > 7:
                    return "⚠️ Ви виглядаєте втомлено. Можливо, час зробити невелику перерву?"
                if bad_mood_count > 3:
                    return "Спробуйте трохи відволіктися або випити склянку води. 💧"
            
                return "Ви в чудовому стані! Продовжуйте в тому ж дусі. ✨"
            except Exception as e:
                print(f"Error in generate_smart_advice: {e}")
                return "Зберігайте спокій та продовжуйте роботу. Все під контролем! ✨"

        