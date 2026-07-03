import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from voice_router import router as voice_router, telegram_router
from telemetry_router import router as telemetry_router

app = FastAPI(title="Trinetra API")

# Configure CORS so Next.js can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)
app.include_router(telegram_router)
app.include_router(telemetry_router)

@app.get("/")
def read_root():
    return {"message": "Trinetra Voice AI Backend is Active"}

