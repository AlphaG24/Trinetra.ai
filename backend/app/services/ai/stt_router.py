import os
import httpx
import logging
from database import supabase_admin

logger = logging.getLogger("STTRouter")

def get_config_key(key_name: str) -> str | None:
    """Fetch key from system_config table first, fallback to env var."""
    try:
        res = supabase_admin.table("system_config").select("config_value").eq("config_key", key_name).single().execute()
        if res.data and res.data.get("config_value"):
            val = res.data["config_value"].strip()
            if val:
                return val
    except Exception:
        pass
    return os.getenv(key_name)

class STTRouter:
    def __init__(self):
        self.sarvam_url = "https://api.sarvam.ai/speech-to-text"
        self.deepgram_url = "https://api.deepgram.com/v1/listen"

    async def transcribe(
        self,
        audio_bytes: bytes,
        language: str = "hi-IN",
        filename: str = "audio.wav"
    ) -> str:
        """
        Transcribes audio bytes to text string.
        """
        lang = (language or "hi-IN").lower()
        is_hindi_or_hinglish = any(code in lang for code in ["hi", "hinglish", "hindi"])

        if is_hindi_or_hinglish:
            try:
                return await self._transcribe_sarvam(audio_bytes, filename, language)
            except Exception as e:
                logger.warning(f"Sarvam STT failed ({e}), falling back to Deepgram")
                try:
                    return await self._transcribe_deepgram(audio_bytes, language)
                except Exception as dg_err:
                    raise RuntimeError(f"All STT providers failed. Sarvam: {e}, Deepgram: {dg_err}")
        else:
            # English -> Deepgram primary
            try:
                return await self._transcribe_deepgram(audio_bytes, language)
            except Exception as e:
                logger.warning(f"Deepgram STT failed ({e}), falling back to Sarvam AI STT")
                try:
                    return await self._transcribe_sarvam(audio_bytes, filename, language)
                except Exception as sarvam_err:
                    raise RuntimeError(f"All STT providers failed. Deepgram: {e}, Sarvam: {sarvam_err}")

    async def _transcribe_sarvam(self, audio_bytes: bytes, filename: str, language: str) -> str:
        api_key = get_config_key("SARVAM_API_KEY")
        if not api_key:
            raise ValueError("SARVAM_API_KEY is missing from system_config and env")

        headers = {
            "api-subscription-key": api_key,
        }

        target_lang = "hi-IN"
        if any(code in language.lower() for code in ["en", "english"]):
            target_lang = "en-IN"

        files = {
            "file": (filename, audio_bytes, "audio/wav")
        }
        data = {
            "language_code": target_lang,
            "model": "saarika:v1"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(self.sarvam_url, headers=headers, data=data, files=files)
            if res.status_code != 200:
                raise RuntimeError(f"Sarvam STT API error {res.status_code}: {res.text}")

            res_json = res.json()
            return res_json.get("transcript", "")

    async def _transcribe_deepgram(self, audio_bytes: bytes, language: str) -> str:
        api_key = get_config_key("DEEPGRAM_API_KEY")
        if not api_key:
            raise ValueError("DEEPGRAM_API_KEY is missing from system_config and env")

        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "audio/wav"
        }

        params = {
            "model": "nova-2",
            "smart_format": "true",
            "language": "hi" if "hi" in language.lower() else "en"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(self.deepgram_url, headers=headers, params=params, content=audio_bytes)
            if res.status_code != 200:
                raise RuntimeError(f"Deepgram STT API error {res.status_code}: {res.text}")

            res_json = res.json()
            results = res_json.get("results", {})
            channels = results.get("channels", [])
            if channels and len(channels) > 0:
                alternatives = channels[0].get("alternatives", [])
                if alternatives and len(alternatives) > 0:
                    return alternatives[0].get("transcript", "")

            return ""
