from app.schemas.emotion import EmotionSchema
from datetime import datetime, timedelta, timezone, time

class EmotionRepository:
    def __init__(self, db):
        """
        Initializes the repository with a database connection.
        
        Args:
            db: Motor database instance.
        Raises:
            RuntimeError: If database connection is missing.
        """
        if db is None:
            raise RuntimeError("Database connection missing! Check connect_to_mongo.")
        self.classes = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
        self.db = db
        self.collection = self.db.emotions_history

    async def create_voice_log(self, voice_data: dict):
        """Зберігаємо голос у ЗАГАЛЬНУ колекцію"""
        try:
            voice_data["timestamp"] = datetime.now() 
        
            print(f"DEBUG: Записую ЛОКАЛЬНИЙ час: {voice_data['timestamp']}")
        
            result = await self.collection.insert_one(voice_data) 
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error saving voice log: {e}")
            return None

    async def get_history_list(self, limit: int = 10):
        try:
            cursor = self.collection.find().sort("timestamp", -1).limit(limit)
            results = await cursor.to_list(length=limit)
        
            final_results = []
            for document in results:
                document["id"] = str(document["_id"])
                del document["_id"]
            
                if "timestamp" in document and isinstance(document["timestamp"], datetime):
                    document["timestamp"] = document["timestamp"].isoformat()
            
                if "emotions_map" in document:
                    sorted_emotions = sorted(
                        document["emotions_map"].items(),
                        key=lambda item: item[1],
                        reverse=True
                    )
                    document["top_emotions"] = dict(sorted_emotions[:3])
                

                final_results.append(document)
            
            return final_results
        except Exception as e:
            print(f"Repository Critical Error: {e}")
            return []
        
    async def get_voice_history(self, limit: int = 5):
        cursor = self.db.voice_history.find().sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_recent_voice_logs(self, minutes: int):
        since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        cursor = self.db.voice_logs.find({"timestamp": {"$gte": since}}).sort("timestamp", 1)
        logs = await cursor.to_list(length=100)
        return logs
    
    async def get_latest_face_emotion(self):
        """Gets the freshest emotion recorded from the camera."""
        result = await self.db["face_emotions"].find_one(
            sort=[("timestamp", -1)]
        )
        return result["emotion"] if result else "neutral"

    async def create_log(self, emotion_data: EmotionSchema):
        """Saves a new emotion record to the database."""
        doc = emotion_data.model_dump()
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)
        
    async def delete_all_logs(self):
        """Clears the entire emotion history."""
        try:
            result = await self.collection.delete_many({})
            return result.deleted_count
        except Exception as e:
            print(f"Error during history clearing: {e}")
            return 0
    
    async def get_emotion_stats(self):
        """Aggregates average intensity for all emotions for chart visualization."""
        group_stage = {"_id": None}
        for emotion_name in self.classes:
            group_stage[emotion_name] = {"$avg": f"$emotions_map.{emotion_name}"}

        pipeline = [
            {"$group": group_stage},
            {"$project": {"_id": 0}}
        ]
        cursor = self.collection.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        data_dict = result[0] if result else {e: 0 for e in self.classes}

        return {
            "labels": list(data_dict.keys()),
            "datasets": [
                {
                    "label": "Середня інтенсивність",
                    "data": list(data_dict.values()),
                }
            ]
        }
    async def get_stats_for_period(self, minutes=30):
        """Calculates the average emotion profile for the last N minutes."""
        time_threshold = datetime.now(tz=timezone.utc) - timedelta(minutes=minutes)
        group_stage = {"_id": None}
        for e in self.classes:
            group_stage[e] = {"$avg": f"$emotions_map.{e}"}
    
        pipeline = [
            {"$match": {"timestamp": {"$gte": time_threshold}}},
            {"$group": group_stage},
            {"$project": {"_id": 0}}
        ]
    
        cursor = self.collection.aggregate(pipeline)
        result = await cursor.to_list(length=1)
    
        return result[0] if result else {e: 0 for e in self.classes}
    
    async def get_latest_stats(self, limit: int = 100) -> dict:
        cursor = self.collection.find().sort("timestamp", -1).limit(limit)
        records = await cursor.to_list(length=limit)

        stats_map = {e: [] for e in self.classes}

        for doc in records:
            if "emotions_map" in doc:
                for emo, val in doc["emotions_map"].items():
                    if emo in stats_map:
                        stats_map[emo].append(val or 0.0)

            source_emo = doc.get("audio_emotion") or doc.get("text_emotion")
            if source_emo and source_emo.lower() in stats_map:
                stats_map[source_emo.lower()].append(0.8) 

        final_stats = {}
        for emo, vals in stats_map.items():
            final_stats[emo] = sum(vals) / len(vals) if vals else 0.0

        return final_stats

    async def get_history_by_date(self, date_str: str):
        try:
            day_dt = datetime.strptime(date_str, "%Y-%m-%d")
            start_of_day = day_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = day_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

            query = {
                "timestamp": {
                    "$gte": start_of_day,
                    "$lte": end_of_day
                }
            }
        
            cursor = self.collection.find(query).sort("timestamp", 1)
            results = await cursor.to_list(length=1000)

            for item in results:
                if "_id" in item:
                    item["_id"] = str(item["_id"])
        
            return results
        
        except Exception as e:
            print(f"Помилка пошуку за датою: {e}")
            return []
        