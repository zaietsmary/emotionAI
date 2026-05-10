import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.api.vision_router import router as vision_router
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.utils.model_loader import get_model
from app.api.voice_router import router as voice_router
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    get_model()   
    yield
    await close_mongo_connection()

app = FastAPI(
    title="Emotion Detection System",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vision_router)
app.include_router(voice_router)

@app.get("/", include_in_schema=False)
async def root():
    """Redirects the root URL to the interactive API documentation."""
    return RedirectResponse(url="/docs")