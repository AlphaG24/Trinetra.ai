import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from voice_router import router as voice_router, telegram_router, agents_router
from telemetry_router import router as telemetry_router
from knowledge_router import router as knowledge_router
from telephony_router import router as telephony_router, numbers_router
from app.routers.campaign_router import router as campaign_router
from app.routers.dnd_router import router as dnd_router
from app.routers.analytics_router import router as analytics_router
from app.routers.integration_router import router as integration_router
from app.routers.usage_router import router as usage_router
from app.routers.blog_ai_router import router as blog_ai_router

app = FastAPI(title="Trinetra API")

# Configure CORS so Next.js can talk to this backend securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)
app.include_router(telegram_router)
app.include_router(telemetry_router)
app.include_router(knowledge_router)
app.include_router(agents_router)
app.include_router(telephony_router, prefix="/api/telephony", tags=["telephony"])
app.include_router(numbers_router)
app.include_router(campaign_router)
app.include_router(dnd_router)
app.include_router(analytics_router)
app.include_router(integration_router)
app.include_router(usage_router)
app.include_router(blog_ai_router)

@app.get("/")
def read_root():
    return {"message": "Trinetra Voice AI Backend is Active"}

