import os
import httpx
import logging
from database import supabase_admin

logger = logging.getLogger("TTSRouter")

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

class TTSRouter:
    def __init__(self):
        self.sarvam_url = "https://api.sarvam.ai/text-to-speech"
        self.elevenlabs_base_url = "https://api.elevenlabs.io/v1/text-to-speech"

    async def synthesize(
        self,
        text: str,
        language: str = "hi-IN",
        plan_tier: str = "starter",
        voice_id: str | None = None,
        output_format: str | None = None,
        voice_provider: str | None = None,
        voice_speed: float | None = None,
        voice_pitch: float | None = None
    ) -> tuple[bytes, str]:
        """
        Synthesizes speech audio from text.
        Returns tuple: (audio_bytes, content_type)
        """
        provider = (voice_provider or "").lower().strip()
        if provider == "elevenlabs":
            return await self._synthesize_elevenlabs(text, voice_id, output_format, voice_speed, voice_pitch)
        elif provider == "sarvam":
            return await self._synthesize_sarvam(text, language, voice_id, voice_speed, voice_pitch)

        lang = (language or "hi-IN").lower()
        tier = (plan_tier or "starter").lower()

        # Route logic: English + (enterprise or growth) -> ElevenLabs primary
        is_english = any(code in lang for code in ["en", "english"])
        is_premium_tier = tier in ["enterprise", "growth"]

        if is_english and is_premium_tier:
            try:
                logger.info(f"[TTS ROUTER] Selected ElevenLabs (English, Premium Tier: {tier})")
                audio, content_type = await self._synthesize_elevenlabs(text, voice_id, output_format, voice_speed, voice_pitch)
                return audio, content_type
            except Exception as e:
                logger.warning(f"[TTS ROUTER] ElevenLabs TTS failed ({e}), falling back to Sarvam AI TTS")

        # Primary for Hindi/Hinglish or Fallback for English: Sarvam AI
        try:
            logger.info(f"[TTS ROUTER] Selected Sarvam AI (Language: {language})")
            return await self._synthesize_sarvam(text, language, voice_id, voice_speed, voice_pitch)
        except Exception as sarvam_err:
            logger.error(f"[TTS ROUTER] Sarvam AI TTS failed: {sarvam_err}")
            # Final fallback to ElevenLabs if key exists
            try:
                logger.info("[TTS ROUTER] Falling back to ElevenLabs")
                return await self._synthesize_elevenlabs(text, voice_id, output_format, voice_speed, voice_pitch)
            except Exception as el_err:
                raise RuntimeError(f"All TTS providers failed. Sarvam: {sarvam_err}, ElevenLabs: {el_err}")

    async def _synthesize_sarvam(self, text: str, language: str, speaker: str | None = None, voice_speed: float | None = None, voice_pitch: float | None = None) -> tuple[bytes, str]:
        api_key = get_config_key("SARVAM_API_KEY")
        if not api_key:
            raise ValueError("SARVAM_API_KEY is missing from system_config and env")

        target_lang = "hi-IN"
        if any(code in language.lower() for code in ["en", "english"]):
            target_lang = "en-IN"

        # All valid Bulbul v3 speakers
        v3_speakers = ["shubh", "anushka", "aditya", "rahul", "rohan", "amit", "dev", "ratan", 
                       "varun", "manan", "sumit", "kabir", "aayan", "ashutosh", "advait", "anand",
                       "tarun", "sunny", "mani", "gokul", "vijay", "mohit", "rehan", "soham",
                       "ritu", "priya", "neha", "pooja", "simran", "kavya", "ishita", "shreya",
                       "roopa", "tanya", "shruti", "suhani", "kavitha", "rupali"]
        target_speaker = speaker if speaker in v3_speakers else "shubh"

        payload = {
            "inputs": [text],
            "target_language_code": target_lang,
            "speaker": target_speaker,
            "pace": voice_speed if voice_speed is not None else 1.0,
            "speech_sample_rate": 22050,
            "enable_preprocessing": True,
            "model": "bulbul:v3"
        }

        headers = {
            "api-subscription-key": api_key,
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(self.sarvam_url, json=payload, headers=headers)
            if res.status_code != 200:
                raise RuntimeError(f"Sarvam API error {res.status_code}: {res.text}")
            
            data = res.json()
            audios = data.get("audios", [])
            if not audios:
                raise RuntimeError("Sarvam API returned empty audios array")
            
            import base64
            audio_bytes = base64.b64decode(audios[0])
            return audio_bytes, "audio/wav"

    async def _synthesize_elevenlabs(self, text: str, voice_id: str | None = None, output_format: str | None = None, voice_speed: float | None = None, voice_pitch: float | None = None) -> tuple[bytes, str]:
        api_key = get_config_key("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY is missing from system_config and env")

        selected_voice = voice_id or "21m00Tcm4TlvDq8ikWAM" # Default Rachel voice ID
        url = f"{self.elevenlabs_base_url}/{selected_voice}"
        if output_format:
            url += f"?output_format={output_format}"

        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg" if not output_format else "*/*"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code != 200:
                raise RuntimeError(f"ElevenLabs API error {res.status_code}: {res.text}")
            
            content_type = "audio/mpeg"
            if output_format:
                if "pcm" in output_format:
                    content_type = "audio/pcm"
                elif "ulaw" in output_format:
                    content_type = "audio/ulaw"
            
            return res.content, content_type
