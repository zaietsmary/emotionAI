from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict

class EmotionSchema(BaseModel):
    emotions_map: Dict[str, float] = Field(..., example={"happy": 0.9, "neutral": 0.1})
    dominant_emotion: str = Field(..., example="happy")
    confidence: float = Field(..., ge=0, le=1)
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True