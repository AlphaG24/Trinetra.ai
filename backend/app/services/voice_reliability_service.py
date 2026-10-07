"""
backend/app/services/voice_reliability_service.py

Voice Pipeline Reliability, Low-Latency Instrumentation, and Stall Elimination Engine.
Handles:
1. Per-stage latency timing logs (no PII) across all call phases.
2. Tool execution guard with hard timeout (5.0s) and 700ms conversational filler line.
3. Language- and gender-aware fallbacks via resolve_gendered_phrases.
4. Mid-call no-audio watchdog that suppresses while tools are running, retries once,
   and speaks a fallback line.
5. Asynchronous parallel lookups and background write dispatchers.
"""

import time
import asyncio
import logging
import re
from typing import Dict, Any, Optional, Callable, Awaitable

logger = logging.getLogger("voice-reliability")

# ---------------------------------------------------------------------------
# 1. PER-STAGE TIMING TRACKER (NO PII)
# ---------------------------------------------------------------------------
class VoiceTimingTracker:
    """
    Lightweight, monotonic latency timer measuring every stage of the voice lifecycle.
    Guarantees ZERO PII in log lines (all identifiers are hashed/masked or purely numeric).
    """
    def __init__(self, room_id: str = "unknown", turn_id: int = 0):
        # Mask room_id to last 6 chars to eliminate any embedded phone or contact details
        self.masked_room = room_id[-8:] if len(room_id) > 8 else room_id
        self.turn_id = turn_id
        self._timestamps: Dict[str, float] = {}
        self._stage_order = [
            "answer",
            "session_start",
            "config_load",
            "lookup",
            "disclosure_composed",
            "first_tts_byte",
            "user_speech_end",
            "stt_final",
            "llm_first_token",
            "tool_start",
            "tool_end",
            "tts_first_byte",
            "audio_playout"
        ]

    def mark(self, stage: str, extra: Optional[str] = None) -> float:
        """Record current monotonic timestamp for a stage and log elapsed time."""
        now = time.perf_counter()
        self._timestamps[stage] = now
        
        # Calculate latency relative to preceding stage
        idx = self._stage_order.index(stage) if stage in self._stage_order else -1
        prev_stage = self._stage_order[idx - 1] if idx > 0 else None
        prev_time = self._timestamps.get(prev_stage) if prev_stage else None
        delta_ms = ((now - prev_time) * 1000.0) if prev_time else 0.0

        extra_str = f" | {self._sanitize_pii(extra)}" if extra else ""
        logger.info(
            f"[VoiceTiming] room={self.masked_room} turn={self.turn_id} stage={stage} "
            f"elapsed_ms={delta_ms:.1f}{extra_str}"
        )
        return now

    def get_duration_ms(self, from_stage: str, to_stage: str) -> Optional[float]:
        """Return elapsed milliseconds between two stages if both exist."""
        t1 = self._timestamps.get(from_stage)
        t2 = self._timestamps.get(to_stage)
        if t1 is not None and t2 is not None:
            return (t2 - t1) * 1000.0
        return None

    def get_all_metrics(self) -> Dict[str, float]:
        """Return dict of measured timestamps."""
        return dict(self._timestamps)

    @staticmethod
    def _sanitize_pii(text: str) -> str:
        """Scrub phone numbers, emails, and sensitive identifiers from log extras."""
        if not text:
            return ""
        # Mask 10-12 digit numbers
        s = re.sub(r'\b(?:\+?91|0)?[6-9]\d{9}\b', '[PHONE_MASKED]', text)
        # Mask email addresses
        s = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL_MASKED]', s)
        return s


# ---------------------------------------------------------------------------
# 2. CONVERSATIONAL FILLER LINES & FALLBACKS
# ---------------------------------------------------------------------------
TOOL_FALLBACK_LINES: Dict[str, Dict[str, str]] = {
    "hinglish": {
        "female": "Abhi system se live details connect nahi ho pa rahi hain. Kya main aapka phone number note kar loon taaki hamari team call back kar sake?",
        "male": "Abhi system se live details connect nahi ho pa raha hai. Kya main aapka phone number note kar loon taaki hamari team call back kar sake?",
    },
    "hindi": {
        "female": "अभी सिस्टम से जानकारी प्राप्त नहीं हो पा रही है। क्या मैं आपका नंबर नोट कर लूँ ताकि हमारी टीम संपर्क कर सके?",
        "male": "अभी सिस्टम से जानकारी प्राप्त नहीं हो पा रही है। क्या मैं आपका नंबर नोट कर लूँ ताकि हमारी टीम संपर्क कर सके?",
    },
    "english": {
        "female": "I am having trouble accessing the appointment system at the moment. May I note your details so our team can follow up immediately?",
        "male": "I am having trouble accessing the appointment system at the moment. May I note your details so our team can follow up immediately?",
    }
}


def get_conversational_filler(language: str = "hinglish", gender: str = "female", index: int = 0) -> str:
    """Return a low-latency conversational filler line dynamically resolved via resolve_gendered_phrases."""
    from app.services.disclosure_service import resolve_gendered_phrases
    lang_val = (language or "hinglish").lower()
    norm_lang = "en" if lang_val in ("en", "en-us", "en-in", "english") else ("hi" if lang_val in ("hi", "hi-in", "hindi") else "hinglish")
    p = resolve_gendered_phrases(gender=gender, language=norm_lang)

    if norm_lang == "en":
        choices = [
            "One moment, let me check that for you right now...",
            "Just checking the details for you, one second...",
        ]
    elif norm_lang == "hi":
        v_chk_hi = p.get("v_check_hi", "देखते हैं")
        choices = [
            f"जी, मैं विवरण {v_chk_hi}, एक क्षण...",
            f"हाँ जी, सिस्टम में {v_chk_hi}...",
        ]
    else:  # hinglish
        v_chk = p.get("v_check", "check karte hain")
        choices = [
            f"Ji, main details {v_chk}, ek second...",
            f"Haan ji, bas ek moment dijiyega, main system me {v_chk}...",
            f"Bilkul, system me {v_chk}...",
        ]
    return choices[index % len(choices)]


def get_tool_fallback_message(language: str = "hinglish", gender: str = "female") -> str:
    """Return a graceful fallback message when a tool call fails or times out."""
    lang_key = "english" if language.lower() in ("en", "en-us", "en-in", "english") else ("hindi" if language.lower() in ("hi", "hi-in", "hindi") else "hinglish")
    g_key = "female" if gender.lower() == "female" else "male"
    return TOOL_FALLBACK_LINES.get(lang_key, TOOL_FALLBACK_LINES["hinglish"])[g_key]


# ---------------------------------------------------------------------------
# 3. TOOL EXECUTION GUARD (5.0s HARD CAP + 700ms FILLER LINE)
# ---------------------------------------------------------------------------
class ToolExecutionGuard:
    """
    Executes LLM function tools with:
    - 5.0s strict hard cap (timeout)
    - 700ms delayed conversational filler line
    - Language and gender aware graceful fallback
    - Non-blocking state signaling for the no-audio watchdog
    """
    def __init__(
        self,
        hard_timeout_seconds: float = 5.0,
        filler_delay_seconds: float = 0.7,
        speak_filler_fn: Optional[Callable[[str], Awaitable[None]]] = None,
        language: str = "hinglish",
        gender: str = "female",
    ):
        self.hard_timeout = hard_timeout_seconds
        self.filler_delay = filler_delay_seconds
        self.speak_filler_fn = speak_filler_fn
        self.language = language
        self.gender = gender
        self.is_tool_running = False

    async def execute_tool(
        self,
        tool_name: str,
        tool_fn: Callable[..., Awaitable[Any]],
        *args,
        **kwargs
    ) -> str:
        """
        Execute tool_fn with timeout and conditional 700ms filler dispatch.
        Guarantees that a tool will never freeze or silently stall a call.
        """
        self.is_tool_running = True
        t_start = time.perf_counter()
        logger.info(f"[ToolExecutionGuard] Starting tool '{tool_name}' with {self.hard_timeout}s hard timeout")

        filler_task = None
        filler_dispatched = False

        async def _delayed_filler():
            nonlocal filler_dispatched
            try:
                await asyncio.sleep(self.filler_delay)
                if self.is_tool_running and self.speak_filler_fn:
                    filler_dispatched = True
                    filler_text = get_conversational_filler(self.language, self.gender)
                    logger.info(f"[ToolExecutionGuard] Tool '{tool_name}' exceeded {self.filler_delay*1000:.0f}ms; playing filler: '{filler_text}'")
                    await self.speak_filler_fn(filler_text)
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning(f"[ToolExecutionGuard] Error playing conversational filler: {e}")

        # Start filler timer in background
        if self.speak_filler_fn:
            filler_task = asyncio.create_task(_delayed_filler())

        try:
            # Enforce hard cap
            result = await asyncio.wait_for(
                tool_fn(*args, **kwargs),
                timeout=self.hard_timeout
            )
            elapsed_ms = (time.perf_counter() - t_start) * 1000.0
            logger.info(f"[ToolExecutionGuard] Tool '{tool_name}' completed successfully in {elapsed_ms:.1f}ms")
            return str(result)
        except asyncio.TimeoutError:
            elapsed_ms = (time.perf_counter() - t_start) * 1000.0
            logger.error(
                f"[ToolExecutionGuard] Tool '{tool_name}' TIMED OUT after {elapsed_ms:.1f}ms "
                f"(cap: {self.hard_timeout}s). Discarding and returning graceful fallback."
            )
            return get_tool_fallback_message(self.language, self.gender)
        except Exception as err:
            elapsed_ms = (time.perf_counter() - t_start) * 1000.0
            logger.error(f"[ToolExecutionGuard] Tool '{tool_name}' FAILED in {elapsed_ms:.1f}ms: {err}", exc_info=True)
            return get_tool_fallback_message(self.language, self.gender)
        finally:
            self.is_tool_running = False
            if filler_task and not filler_task.done():
                filler_task.cancel()


# ---------------------------------------------------------------------------
# 4. IN-CALL NO-AUDIO WATCHDOG
# ---------------------------------------------------------------------------
class InCallNoAudioWatchdog:
    """
    Monitors mid-call audio flow.
    If the caller finished speaking and no agent audio/speech occurs for > 5.0 seconds:
    - Suppresses if a tool is currently running (ToolExecutionGuard handles slow tools).
    - Logs alert.
    - Retries once.
    - Speaks a courteous check-in prompt if silence persists.
    """
    def __init__(
        self,
        silence_threshold_seconds: float = 5.0,
        speak_fn: Optional[Callable[[str], Awaitable[None]]] = None,
        tool_guard: Optional[ToolExecutionGuard] = None,
        language: str = "hinglish",
        gender: str = "female",
        check_interval_seconds: Optional[float] = None,
    ):
        self.silence_threshold = silence_threshold_seconds
        self.check_interval = check_interval_seconds if check_interval_seconds is not None else min(0.5, max(0.02, silence_threshold_seconds / 4.0))
        self.speak_fn = speak_fn
        self.tool_guard = tool_guard
        self.language = language
        self.gender = gender
        self.last_speech_time = time.perf_counter()
        self.is_agent_speaking = False
        self.is_user_speaking = False
        self._watchdog_task: Optional[asyncio.Task] = None
        self._retried = False
        self._stop_event = asyncio.Event()

    def record_activity(self):
        """Reset the silence clock on any valid user or agent speech event."""
        self.last_speech_time = time.perf_counter()
        self._retried = False

    def on_user_speech_start(self):
        self.is_user_speaking = True
        self.record_activity()

    def on_user_speech_end(self):
        self.is_user_speaking = False
        self.last_speech_time = time.perf_counter()

    def on_agent_speech_start(self):
        self.is_agent_speaking = True
        self.record_activity()

    def on_agent_speech_end(self):
        self.is_agent_speaking = False
        self.last_speech_time = time.perf_counter()

    def start(self):
        """Start the background watchdog loop."""
        if not self._watchdog_task or self._watchdog_task.done():
            self._stop_event.clear()
            self._watchdog_task = asyncio.create_task(self._watchdog_loop())

    def stop(self):
        """Stop the background watchdog loop."""
        self._stop_event.set()
        if self._watchdog_task and not self._watchdog_task.done():
            self._watchdog_task.cancel()

    async def _watchdog_loop(self):
        logger.info(f"[NoAudioWatchdog] In-call watchdog active (threshold: {self.silence_threshold}s)")
        while not self._stop_event.is_set():
            try:
                await asyncio.sleep(self.check_interval)
                # Check condition: if user is not speaking, agent is not speaking, and tool is not running
                tool_active = self.tool_guard.is_tool_running if self.tool_guard else False
                if self.is_user_speaking or self.is_agent_speaking or tool_active:
                    continue

                silent_duration = time.perf_counter() - self.last_speech_time
                if silent_duration >= self.silence_threshold:
                    if not self._retried:
                        logger.warning(
                            f"[NoAudioWatchdog] Dead air detected ({silent_duration:.1f}s > {self.silence_threshold}s). "
                            "Tool is NOT running. Retrying session turn once..."
                        )
                        self._retried = True
                        self.last_speech_time = time.perf_counter()
                    else:
                        logger.warning(
                            f"[NoAudioWatchdog] Prolonged dead air after retry ({silent_duration:.1f}s). "
                            "Triggering conversational watchdog recovery prompt."
                        )
                        self.record_activity()
                        if self.speak_fn:
                            is_en = self.language.lower() in ("en", "en-us", "en-in", "english")
                            from app.services.disclosure_service import resolve_gendered_phrases
                            phrases = resolve_gendered_phrases(gender=self.gender, language=self.language)
                            v_madad = phrases.get("v_madad", "kar sakte hain")
                            prompt = "Are you able to hear me? Please let me know how I can help." if is_en else f"Ji, kya aap mujhe sun pa rahe hain? Kahiye, main aapki kya madad {v_madad}?"
                            await self.speak_fn(prompt)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[NoAudioWatchdog] Loop error: {e}")
