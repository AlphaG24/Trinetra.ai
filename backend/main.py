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

import httpx
import asyncio

async def _nat_keepalive_loop():
    ngrok_url = "https://unclip-mundane-those.ngrok-free.dev"
    async with httpx.AsyncClient(timeout=4.0) as client:
        while True:
            await asyncio.sleep(10.0)
            try:
                await client.get(ngrok_url, headers={"ngrok-skip-browser-warning": "true"})
            except Exception:
                pass

@app.on_event("startup")
async def app_startup():
    try:
        from agent import run_agent
        print("[Startup] Agent runner pre-warmed successfully.", flush=True)
    except Exception as e:
        print(f"[Startup] Pre-warm agent warning: {e}", flush=True)
    asyncio.create_task(_nat_keepalive_loop())

@app.get("/")
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
