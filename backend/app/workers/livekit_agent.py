import os
import asyncio
import logging
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import sarvam, silero
import yaml

load_dotenv()

logger = logging.getLogger("LiveKitAgent")
logger.setLevel(logging.INFO)

if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

def generate_agent_token(room_name: str) -> str:
    import uuid
    import jwt
    from datetime import datetime

    api_key = (os.getenv("LIVEKIT_API_KEY") or "devkey").strip()
    api_secret = (os.getenv("LIVEKIT_API_SECRET") or "secretsecretsecretsecretsecret12").strip()

    now = int(datetime.utcnow().timestamp())
    identity = f"agent_vikram_{uuid.uuid4().hex[:4]}"

    payload = {
        "exp": now + 86400,
        "iss": api_key,
        "nbf": now - 5,
        "sub": identity,
        "name": "Vikram Sharma (AI Agent)",
        "video": {
            "room": room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True
        }
    }
    token = jwt.encode(payload, api_secret, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token

def load_system_prompt() -> str:
    try:
        prompt_path = os.path.join(
            os.path.dirname(__file__),
            "..", "services", "ai", "prompt_templates", "sales_manager.yaml"
        )
        with open(prompt_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("system_prompt", "")
    except Exception as e:
        logger.error(f"Failed to load system prompt: {e}")
        return "You are Vikram Sharma, a helpful Hinglish senior sales manager at Trinetra AI."

async def run_agent(room_name: str):
    livekit_url = os.getenv("LIVEKIT_URL", "ws://127.0.0.1:7880").strip()
    system_prompt = load_system_prompt()
    token = generate_agent_token(room_name)

    logger.info(f"Connecting to room {room_name} at {livekit_url}")

    room = rtc.Room()

    try:
        sarvam_tts = sarvam.TTS(target_language_code="hi-IN", model="bulbul:v3", speaker="shubh", speech_sample_rate=8000, output_audio_codec="linear16", max_session_duration=0)  # type: ignore
    except TypeError:
        sarvam_tts = sarvam.TTS(target_language_code="hi-IN", model="bulbul:v3", speaker="shubh", speech_sample_rate=8000, output_audio_codec="linear16")
        if hasattr(sarvam_tts, "_pool"):
            try:
                sarvam_tts._pool._max_session_duration = 0
            except Exception:
                pass

    agent = Agent(
        instructions=system_prompt,
        stt=sarvam.STT(language="unknown", model="saaras:v3", flush_signal=True),
        llm=sarvam.LLM(model="sarvam-30b"),
        tts=sarvam_tts,
    )

    session = AgentSession(vad=silero.VAD.load())

    done = asyncio.Event()

    @room.on("disconnected")
    def on_disconnected(reason):
        logger.info(f"Room disconnected: {reason}")
        done.set()

    try:
        await room.connect(livekit_url, token)
        logger.info("Connected to room!")

        await session.start(room=room, agent=agent)
        logger.info("Agent session started")

        await session.say("Namaste ji, main Trinetra AI se Vikram bol raha hoon. Kaise hain aap?")

        await done.wait()

    except Exception as e:
        logger.error(f"Agent error: {e}")
    finally:
        logger.info("Agent session ended.")
        try:
            await room.disconnect()
        except Exception:
            pass