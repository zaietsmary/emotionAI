import cv2
import os
from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.services.emotion_service import EmotionService
from app.repositories.emotion_repository import EmotionRepository
from app.db.mongodb import get_collection
import asyncio 
from fastapi import Request
from app.db.mongodb import connect_to_mongo, db_helper
from app.services.camera_service import camera_manager
from app.utils.model_loader import get_model
from app.services.emotion_service import EMOTION_VALUES
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder


os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'

router = APIRouter(prefix="/vision")

model = get_model()

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def get_service_instance():
    global model 
    if db_helper.db is None:
        print("WARN: Database not initialized for camera yet")
    repo = EmotionRepository(db_helper.db)
    return EmotionService(model=model, repository=repo)

async def get_emotion_service(
    db: Annotated[any, Depends(get_collection)] 
) -> EmotionService:
    """
    Dependency provider for EmotionService.
    
    Ensures the database connection is active and injects the pre-loaded 
    model into the service instance.
    """
    global model 
    
    if db is None:
        await connect_to_mongo()
        db = db_helper.db
    
    if db is None:
        raise RuntimeError("Failed to initialize the database.")
        
    repo = EmotionRepository(db)
    return EmotionService(model=model, repository=repo)


async def generate_frames(request: Request, service: EmotionService):
    """
    Generator that captures frames from the camera and streams them as MJPEG.
    
    Every 30th frame is sent for emotion analysis as a background task
    to prevent video lag.
    """
    camera_manager.start()
    frame_count = 0
    
    try:
        while True:
            if await request.is_disconnected(): 
                break
            success, frame = camera_manager.get_frame()
            if not success or frame is None:
                await asyncio.sleep(0.01)
                continue
            frame_count += 1
            if frame_count % 30 == 0:
                analysis_frame = frame.copy()
                asyncio.create_task(service.analyze_and_save(analysis_frame))

            stream_frame = cv2.resize(frame, (640, 480)) # Або (800, 600)
            ret, buffer = cv2.imencode('.jpg', stream_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
            if not ret:
                continue
                
            yield (b'--frame\r\n' 
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            await asyncio.sleep(0.003) 

    finally:
        camera_manager.stop()

@router.get("/video_feed")
async def video_feed(request: Request, service: EmotionService = Depends(get_emotion_service)):
    """
    Endpoint for real-time video streaming with embedded emotion analysis.
    """
    return StreamingResponse(
        generate_frames(request, service),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

async def get_emotion_repository():
    """
    Dependency provider for EmotionRepository.
    """
    db = db_helper.db 
    if db is None:
        from app.db.mongodb import get_db
        db = await get_db()
        
    return EmotionRepository(db)


@router.get("/history")
async def get_history(
    limit: int = 10,
    repository: EmotionRepository = Depends(get_emotion_repository)
):
    try:
        history = await repository.get_history_list(limit=limit)
        return jsonable_encoder(history) 
    except Exception as e:
        print(f"Помилка серіалізації історії: {e}")
        return []

@router.delete("/history/clear/all", summary="Clear all emotion logs")
async def clear_all_history(
    service: EmotionService = Depends(get_emotion_service)
):
    """Deletes all emotion records from the database."""
    count = await service.clear_history()
    return {"message": f"Історію очищено. Видалено записів: {count}"}

@router.get("/stats", summary="Get emotion statistics")
async def get_emotion_stats(
    service: Annotated[EmotionService, Depends(get_emotion_service)]
):
    """
    Returns prepared data for the dashboard.
    """
    return await service.get_stats()

@router.get("/ai-advice", summary="Get quick feedback")
async def get_ai_advice(
    service: Annotated[EmotionService, Depends(get_emotion_service)]
):
    """
    An endpoint that returns quick deterministic advice.
    """
    try:
        advice = await service.generate_smart_advice()
        return {"advice": advice}
    except Exception as e:
        print(f"Error: {e}")
        return {"advice": "Зберігайте спокій та продовжуйте роботу. Все під контролем! ✨"}
    
@router.get("/ai-recommendation", summary="Get Gemini AI psychological profile")
async def get_ai_rec(service: EmotionService = Depends(get_emotion_service)):
    """
    Connects to Gemini AI to generate a professional psychological 
    recommendation based on the last 30 minutes of facial activity.
    """
    try:
        response = await service.get_smart_ai_recommendation()
        if isinstance(response, dict):
            return response
        if hasattr(response, 'text'):
            return {"recommendation": response.text}
            
        return {"recommendation": str(response)}
        
    except Exception as e:
        print(f"Error: {e}")
        return {"recommendation": "Вибачте, сталася помилка при генерації поради. Спробуйте пізніше."}
    
@router.get("/combined-history")
async def get_combined_history(
    limit: int = 20, 
    service: EmotionService = Depends(get_emotion_service)
):
    """
    Повертає об'єднану історію (камера + голос), відсортовану за часом.
    """
    try:
        combined_data = await service.get_combined_timeline(limit=limit)
        
        return combined_data
    except Exception as e:
        print(f"Error fetching combined history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/history/date/{date_str}")
async def get_history_by_date(date_str: str, service: EmotionService = Depends(get_emotion_service)):
    # date_str прийде як "2024-05-22"
    data = await service.repository.get_history_by_date(date_str)
    return data