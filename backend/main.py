import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from voice_router import router as voice_router, telegram_router
from telemetry_router import router as telemetry_router

app = FastAPI(title="Trinetra API")

# Configure CORS so Next.js can talk to this backend securely
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://trinetraedu-ai.com",
        "https://www.trinetraedu-ai.com",
        "https://msme.trinetraedu-ai.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(voice_router)
app.include_router(telegram_router)
app.include_router(telemetry_router)

@app.get("/")
def read_root():
    return {"message": "Trinetra Voice AI Backend is Active"}

