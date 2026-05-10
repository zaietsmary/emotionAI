import os
import shutil
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException

from app.utils.audio_processor import process_voice_to_text
from app.services.emotion_service import EmotionService 
from app.repositories.emotion_repository import EmotionRepository
from app.db.mongodb import db_helper
from app.utils.model_loader import get_model 

router = APIRouter(prefix="/voice", tags=["Voice & AI Analysis"])

async def get_emotion_service() -> EmotionService:
    """Забезпечує доступ до головного сервісу емоцій."""
    if db_helper.db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    model = get_model() 
    repo = EmotionRepository(db_helper.db)
    return EmotionService(model, repo)

@router.post("/analyze-voice")
async def analyze_voice(
    file: UploadFile = File(...), 
    service: EmotionService = Depends(get_emotion_service)
):
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "webm"
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}.{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = await process_voice_to_text(temp_path)
        
        from app.utils.audio_processor import analyze_audio_tone
        audio_tone = await analyze_audio_tone(temp_path)
        
        if not text or text.strip() == "":
            return {
                "status": "warning",
                "audio_emotion": audio_tone,
                "transcription": "",
                "ai_recommendation": "Я не почув вашого голосу. 😊"
            }

        print("✨ Запит до Gemini (Мультимодальний аналіз)...")
        result = await service.get_smart_ai_recommendation(
            user_text=text, 
            audio_emotion=audio_tone
        )
        
        text_emotion = result.get("text_emotion", "neutral")

        voice_log = {
            "transcription": text,
            "audio_emotion": audio_tone,
            "text_emotion": text_emotion, 
            "timestamp": datetime.now(timezone.utc),
            "source": "microphone"
        }
        
        try:
            await service.repository.create_voice_log(voice_log)
            print("✅ Запис у БД успішний")
        except Exception as db_err:
            print(f"⚠️ Помилка запису в БД: {db_err}")

        # 5. ВІДПОВІДЬ
        return {
            "status": "success",
            "transcription": text,
            "face_emotion": result.get("detected_face"),
            "audio_emotion": audio_tone,
            "text_emotion": text_emotion,
            "ai_recommendation": result.get("recommendation")
        }

    except Exception as e:
        print(f"🔴 Помилка роутера: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(temp_path):
            try: os.remove(temp_path)
            except: pass