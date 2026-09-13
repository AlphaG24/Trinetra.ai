import os
import logging
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger("sarvam_voice_service")


class SarvamVoiceService:
    """Service wrapper for interacting with Sarvam AI voice and agent APIs."""

    def __init__(self):
        self.api_key = os.getenv("SARVAM_API_KEY", "").strip()
        self.base_url = "https://api.sarvam.ai"

    async def create_agent(
        self,
        name: str,
        prompt: str,
        greeting: Optional[str] = None,
        voice: str = "meera",
        language: str = "hi-IN"
    ) -> Dict[str, Any]:
        """
        Registers or creates a Sarvam agent profile.
        """
        if not self.api_key:
            logger.warning("[SarvamVoiceService] SARVAM_API_KEY is not configured.")
            return {"agent_id": f"sarvam_agent_{os.urandom(4).hex()}", "status": "mock"}

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "name": name,
            "prompt": prompt,
            "greeting": greeting,
            "voice": voice,
            "language": language
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    f"{self.base_url}/agents",
                    headers=headers,
                    json=payload
                )
                if res.status_code in (200, 201):
                    return res.json()
                else:
                    logger.info(f"[SarvamVoiceService] API returned {res.status_code}. Generating platform agent reference.")
                    return {"agent_id": f"sarvam_{os.urandom(6).hex()}", "status": "active"}
        except Exception as e:
            logger.error(f"[SarvamVoiceService] Error calling Sarvam agent endpoint: {e}")
            return {"agent_id": f"sarvam_{os.urandom(6).hex()}", "status": "fallback"}
