import sys
import os
import socket
import logging

# Force IPv4 socket connections to bypass broken ISP/NAT64 IPv6 routes causing 30s timeouts
_orig_getaddrinfo = socket.getaddrinfo
def _getaddrinfo_ipv4_first(host, port, family=0, type=0, proto=0, flags=0):
    if family == 0:
        family = socket.AF_INET
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _getaddrinfo_ipv4_first

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from voice_router import (
    router as voice_router, telegram_router, agents_router, telephony_audio_stream, 
    handle_exotel_voice_webhook, upload_call_recording, serve_call_recording
)
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
# Support root-level HTTP & WebSocket routes for Exotel configured with or without /api/voice prefix
app.api_route("/webhooks/voice/exotel", methods=["GET", "POST"])(handle_exotel_voice_webhook)
app.api_route("/webhooks/voice/exotel/{organization_id}", methods=["GET", "POST"])(handle_exotel_voice_webhook)
app.websocket("/webhooks/voice/exotel")(telephony_audio_stream)
app.websocket("/webhooks/voice/exotel/{room_name}")(telephony_audio_stream)
app.websocket("/webhooks/voice/exotel/stream")(telephony_audio_stream)
app.websocket("/webhooks/voice/exotel/stream/{room_name}")(telephony_audio_stream)
app.websocket("/webhooks/voice/twilio/stream/{room_name}")(telephony_audio_stream)
# Explicit routes for call recording upload and audio playback to support all client URL configurations
app.api_route("/api/voice/recordings/upload", methods=["POST"])(upload_call_recording)
app.api_route("/api/voice/webhooks/voice/recordings/upload", methods=["POST"])(upload_call_recording)
app.api_route("/webhooks/voice/recordings/upload", methods=["POST"])(upload_call_recording)
app.api_route("/recordings/upload", methods=["POST"])(upload_call_recording)
app.api_route("/api/voice/recordings/{filename}", methods=["GET"])(serve_call_recording)
app.api_route("/recordings/{filename}", methods=["GET"])(serve_call_recording)
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

@app.on_event("startup")
async def app_startup():
    try:
        from agent import run_agent
        print("[Startup] Agent runner pre-warmed successfully.", flush=True)
    except Exception as e:
        print(f"[Startup] Pre-warm agent warning: {e}", flush=True)

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"message": "Trinetra Voice AI Backend is Active"}


@app.get("/api/debug-env")
def debug_env():
    return {
        "groq_api_key_len": len(os.environ.get("GROQ_API_KEY", "")),
        "sarvam_api_key_len": len(os.environ.get("SARVAM_API_KEY", "")),
        "google_api_key_len": len(os.environ.get("GOOGLE_API_KEY", "")),
        "livekit_api_key_len": len(os.environ.get("LIVEKIT_API_KEY", "")),
        "cwd": os.getcwd()
    }
