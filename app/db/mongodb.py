from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import asyncio

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/emotion_db")

class MongoDB:
    """Singleton-like class to manage MongoDB connection state."""
    client: AsyncIOMotorClient = None
    db = None

db_helper = MongoDB()

async def connect_to_mongo():
    """
    Initializes the MongoDB connection. 
    Should be called during FastAPI startup (lifespan event).
    """
    try:
        db_helper.client = AsyncIOMotorClient(
            MONGO_URL,
            maxPoolSize=10,
            minPoolSize=1
        )
        db_helper.db = db_helper.client["emotion_db"]
        
        await db_helper.client.admin.command('ping')
        print(f"[MongoDB] Connected successfully to: emotion_db")
    except Exception as e:
        print(f"[MongoDB] Connection error: {e}")
        db_helper.db = None

async def get_collection():
    """
    Dependency injection helper to provide the database instance.
    Includes a short wait-and-retry logic if the DB isn't ready yet.
    """
    retry_count = 0
    while db_helper.db is None and retry_count < 5:
        print("[MongoDB] Database not ready, retrying...")
        await asyncio.sleep(0.5)
        retry_count += 1
    
    if db_helper.db is None:
        return None
        
    return db_helper.db

async def close_mongo_connection():
    """Closes the MongoDB connection. Should be called on shutdown."""
    if db_helper.client:
        db_helper.client.close()
        print("[MongoDB] Connection closed.")

async def save_emotion_result(emotion_label: str, confidence: float):
    """
    Метод швидкого запису. 
    Додаємо source, щоб запис не загубився в історії.
    """
    database = await get_collection()
    if database is not None:
        safe_confidence = float(confidence or 0.0) 
        
        document = {
            "dominant_emotion": emotion_label, 
            "confidence": safe_confidence,
            "timestamp": datetime.now(timezone.utc),
            "source": "camera" 
        }
        
        await database.emotions_history.insert_one(document)