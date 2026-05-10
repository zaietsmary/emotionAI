import whisper
import torch
import librosa
import numpy as np
import soundfile as sf 
import os

_whisper_model = None

def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"--- Loading Whisper model on {device} ---")
        _whisper_model = whisper.load_model("base", device=device)
    return _whisper_model

async def process_voice_to_text(audio_path: str) -> str:
    try:
        if not os.path.exists(audio_path):
            print(f"Файл не знайдено: {audio_path}")
            return ""

        model = get_whisper()
        print(f"Whisper транскрибує: {audio_path}")

        result = model.transcribe(
            audio_path, 
            fp16=torch.cuda.is_available(), 
            #language="uk"
        )
        
        detected_text = result.get('text', '').strip()
        return detected_text

    except Exception as e:
        print(f"Помилка у Whisper: {e}")
        return ""

async def analyze_audio_tone(audio_path: str) -> str:
    try:
        try:
            data, sr = sf.read(audio_path)
            # Якщо стерео - перетворюємо в моно
            if len(data.shape) > 1:
                data = np.mean(data, axis=1)
        except Exception:
            data, sr = librosa.load(audio_path, sr=None)

        if len(data) == 0:
            return "neutral"

        rms = librosa.feature.rms(y=data)[0]
        avg_energy = np.mean(rms)
        
        pitches, magnitudes = librosa.piptrack(y=data, sr=sr, fmin=75, fmax=400)
        valid_pitches = pitches[pitches > 0]
        avg_pitch = np.mean(valid_pitches) if len(valid_pitches) > 0 else 0

        print(f"DEBUG: Energy={avg_energy:.4f}, Pitch={avg_pitch:.2f}")

        if avg_energy > 0.07 and avg_pitch > 260:
            return "angry"
        elif avg_energy > 0.04 and avg_pitch > 220:
            return "happy"
        elif avg_pitch > 300:
            return "surprise"
        elif avg_energy < 0.015 and avg_pitch < 160:
            return "sad"
        elif avg_energy < 0.008:
            return "fear"
        
        return "neutral"
        
    except Exception as e:
        print(f"Помилка аналізу тону: {e}")
        return "neutral"