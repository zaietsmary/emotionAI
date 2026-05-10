import uuid
import os
from app.utils.audio_processor import process_voice_to_text
from app.services.aggregator_service import AggregatorService


class VoiceService:
    def __init__(self, repo):
        self.repo = repo
        self.aggregator = AggregatorService(repo)

    async def handle_voice_message(self, audio_bytes: bytes):
        temp_path = f"temp_{uuid.uuid4()}.wav"
        
        try:
            with open(temp_path, "wb") as f:
                f.write(audio_bytes)
                
            text = await process_voice_to_text(temp_path)
            
            if not text:
                return {"error": "Голос не розпізнано"}

            result = await self.aggregator.get_multimodal_advice(text)
            
            return result

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)