"""
backend/tests/test_voice_reliability.py

Exhaustive test suite for Voice Pipeline Reliability, Low-Latency Instrumentation,
and Stall Elimination Engine (Task 1).

Acceptance Criteria:
1. Non-PII per-stage timing tracking across answer, session_start, config_load,
   lookup, disclosure_composed, first_tts_byte, user_speech_end, stt_final,
   llm_first_token, tool_start, tool_end, tts_first_byte, audio_playout.
2. Opening greeting plays once without stall or freeze.
3. Plain reply latency flow tracking.
4. Tool execution completing under 700ms does NOT trigger conversational filler.
5. Tool execution exceeding 700ms triggers conversational filler line in caller language/gender.
6. Tool exceeding hard cap (5.0s) times out gracefully and returns fallback without freezing session.
7. Failed tool with exception returns fallback gracefully.
8. Mid-call no-audio watchdog suppresses when tool is running.
9. Mid-call no-audio watchdog retries once and speaks courteous recovery prompt if dead air persists.
"""

import asyncio
import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.voice_reliability_service import (
    VoiceTimingTracker,
    ToolExecutionGuard,
    InCallNoAudioWatchdog,
    get_conversational_filler,
    get_tool_fallback_message,
    FILLER_LINES,
    TOOL_FALLBACK_LINES,
)


class TestVoiceTimingTracker:
    """Verifies per-stage monotonic timing tracking with strict zero-PII sanitization."""

    def test_all_lifecycle_stages_tracked(self):
        tracker = VoiceTimingTracker(room_id="call_test_room_12345", turn_id=1)
        stages = [
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
            "audio_playout",
        ]
        for stage in stages:
            t = tracker.mark(stage)
            assert t > 0

        metrics = tracker.get_all_metrics()
        for stage in stages:
            assert stage in metrics

        # Elapsed duration calculation
        dur = tracker.get_duration_ms("answer", "audio_playout")
        assert dur is not None
        assert dur >= 0.0

    def test_pii_sanitization_in_timing_logs(self, caplog):
        caplog.set_level("INFO")
        tracker = VoiceTimingTracker(room_id="call_phone_9876543210", turn_id=2)
        
        # Test phone number and email masking in extra log info
        tracker.mark("lookup", extra="Caller phone: +919876543210 email: user.test@trinetraedu-ai.com")
        
        log_text = caplog.text
        # Ensure raw phone and email NEVER appear in logs
        assert "+919876543210" not in log_text
        assert "user.test@trinetraedu-ai.com" not in log_text
        assert "[PHONE_MASKED]" in log_text
        assert "[EMAIL_MASKED]" in log_text

    def test_room_id_masked(self):
        tracker = VoiceTimingTracker(room_id="room_live_customer_9876543210")
        assert "9876543210" not in tracker.masked_room or tracker.masked_room == "43210" or len(tracker.masked_room) <= 8


class TestLanguageAndGenderFallbacks:
    """Verifies multilingual and gendered conversational filler and fallback lines."""

    def test_filler_lines_languages_and_genders(self):
        # Hinglish
        h_f = get_conversational_filler("hinglish", "female")
        assert "rahi hoon" in h_f or "moment" in h_f or "check" in h_f
        h_m = get_conversational_filler("hinglish", "male")
        assert "raha hoon" in h_m or "moment" in h_m or "check" in h_m

        # Hindi
        hi_f = get_conversational_filler("hindi", "female")
        assert "रही हूँ" in hi_f
        hi_m = get_conversational_filler("hindi", "male")
        assert "रहा हूँ" in hi_m

        # English
        en_f = get_conversational_filler("english", "female")
        assert "moment" in en_f.lower() or "checking" in en_f.lower()

    def test_tool_fallback_lines(self):
        fb_h_f = get_tool_fallback_message("hinglish", "female")
        assert "live details" in fb_h_f.lower() or "call back" in fb_h_f.lower()

        fb_en = get_tool_fallback_message("english", "male")
        assert "trouble accessing" in fb_en.lower()


class TestToolExecutionGuard:
    """Verifies hard cap (5.0s), 700ms filler trigger, and graceful fallbacks."""

    @pytest.mark.asyncio
    async def test_fast_tool_no_filler(self):
        """A tool completing well under 700ms must NOT trigger filler speech."""
        speak_mock = AsyncMock()
        guard = ToolExecutionGuard(
            hard_timeout_seconds=5.0,
            filler_delay_seconds=0.7,
            speak_filler_fn=speak_mock,
            language="hinglish",
            gender="female",
        )

        async def _fast_db_query():
            await asyncio.sleep(0.05)
            return "SUCCESS: Slot available at 4 PM"

        res = await guard.execute_tool("check_appointment", _fast_db_query)
        assert res == "SUCCESS: Slot available at 4 PM"
        # Verify filler was NOT dispatched
        speak_mock.assert_not_called()
        assert guard.is_tool_running is False

    @pytest.mark.asyncio
    async def test_slow_tool_triggers_filler(self):
        """A tool taking longer than 700ms triggers the filler line while continuing."""
        speak_mock = AsyncMock()
        # Use a short filler delay for deterministic fast test
        guard = ToolExecutionGuard(
            hard_timeout_seconds=2.0,
            filler_delay_seconds=0.1,  # 100ms for test speed
            speak_filler_fn=speak_mock,
            language="hinglish",
            gender="female",
        )

        async def _slow_db_query():
            await asyncio.sleep(0.25)
            return "SUCCESS: Appointment verified"

        res = await guard.execute_tool("verify_appointment", _slow_db_query)
        assert res == "SUCCESS: Appointment verified"
        # Verify filler WAS dispatched
        assert speak_mock.call_count == 1
        call_arg = speak_mock.call_args[0][0]
        assert "rahi hoon" in call_arg or "moment" in call_arg or "check" in call_arg
        assert guard.is_tool_running is False

    @pytest.mark.asyncio
    async def test_tool_hard_timeout_returns_fallback(self):
        """A tool exceeding the hard timeout cap is cancelled and returns graceful fallback."""
        speak_mock = AsyncMock()
        guard = ToolExecutionGuard(
            hard_timeout_seconds=0.2,  # 200ms hard cap for fast test
            filler_delay_seconds=0.05,
            speak_filler_fn=speak_mock,
            language="hinglish",
            gender="female",
        )

        async def _hanging_db_call():
            await asyncio.sleep(10.0)
            return "Should not reach here"

        res = await guard.execute_tool("hanging_tool", _hanging_db_call)
        # Should return fallback line instead of hanging
        fallback = get_tool_fallback_message("hinglish", "female")
        assert res == fallback
        assert guard.is_tool_running is False

    @pytest.mark.asyncio
    async def test_tool_exception_returns_fallback_gracefully(self):
        """A tool throwing a database or connection error does not crash the call."""
        guard = ToolExecutionGuard(
            hard_timeout_seconds=5.0,
            filler_delay_seconds=0.7,
            language="english",
            gender="female",
        )

        async def _failing_tool():
            raise ConnectionError("Database host unreachable")

        res = await guard.execute_tool("failing_tool", _failing_tool)
        fallback = get_tool_fallback_message("english", "female")
        assert res == fallback
        assert guard.is_tool_running is False


class TestInCallNoAudioWatchdog:
    """Verifies mid-call silence watchdog behavior and coordination with tool guard."""

    @pytest.mark.asyncio
    async def test_watchdog_suppressed_when_tool_is_running(self):
        """Watchdog must never fire or collide with filler audio while a tool is active."""
        speak_mock = AsyncMock()
        guard = ToolExecutionGuard()
        guard.is_tool_running = True  # Tool in progress

        watchdog = InCallNoAudioWatchdog(
            silence_threshold_seconds=0.1,  # 100ms threshold for test
            speak_fn=speak_mock,
            tool_guard=guard,
            language="hinglish",
        )

        watchdog.start()
        # Simulate elapsed time beyond threshold while tool is running
        watchdog.last_speech_time = time.perf_counter() - 0.5
        await asyncio.sleep(0.3)
        watchdog.stop()

        # Watchdog should NOT have spoken because tool is running
        speak_mock.assert_not_called()

    @pytest.mark.asyncio
    async def test_watchdog_retries_once_then_prompts(self):
        """On prolonged dead air without active tools, watchdog retries once then prompts."""
        speak_mock = AsyncMock()
        guard = ToolExecutionGuard()
        guard.is_tool_running = False

        watchdog = InCallNoAudioWatchdog(
            silence_threshold_seconds=0.2,
            check_interval_seconds=0.04,
            speak_fn=speak_mock,
            tool_guard=guard,
            language="hinglish",
        )

        watchdog.start()
        # 1. Trigger dead air for first period
        watchdog.last_speech_time = time.perf_counter() - 0.25
        await asyncio.sleep(0.08)
        assert watchdog._retried is True
        speak_mock.assert_not_called()

        # 2. Trigger dead air for second period
        watchdog.last_speech_time = time.perf_counter() - 0.25
        await asyncio.sleep(0.08)
        watchdog.stop()

        assert speak_mock.call_count >= 1
        prompt_spoken = speak_mock.call_args[0][0]
        assert "sun pa rahe hain" in prompt_spoken or "hear me" in prompt_spoken


class TestOpeningGreetingOnce:
    """Verifies opening greeting executes once, sets flag, and records timing."""

    @pytest.mark.asyncio
    async def test_opening_greeting_played_once_and_times(self):
        from agent import VikramAgent

        mock_session = MagicMock()
        mock_handle = asyncio.Future()
        mock_handle.set_result(None)  # Simulate instant completion
        mock_session.say.return_value = mock_handle
        mock_session.history = MagicMock()
        mock_session.history.messages = []

        timing_tracker = VoiceTimingTracker(room_id="test_room_123")

        # Mock super().__init__ to avoid LiveKit audio plugin hardware/network calls in unit test
        with patch.object(VikramAgent, '__init__', return_value=None):
            agent = VikramAgent()
            agent._session = mock_session
            agent._has_introduced_self = False
            agent.timing_tracker = timing_tracker
            agent.prospect_name = "Rahul"
            agent.bot_name = "Vikram"
            agent.business_name = "Trinetra"
            agent.gender = "male"
            agent.language = "hinglish"

            with patch.object(VikramAgent, 'session', new=mock_session):
                agent.room = MagicMock()
                agent.room.name = "test-room"
                agent.room.remote_participants = {"remote1": MagicMock(identity="caller-phone")}
                agent.greeting_message = "Namaste! Main Vikram bol raha hoon."

                # First call -> plays greeting
                await agent.on_enter()
                assert agent._has_introduced_self is True
                assert mock_session.say.call_count == 1
                assert "disclosure_composed" in timing_tracker.get_all_metrics()
                assert "audio_playout" in timing_tracker.get_all_metrics()

                # Second call -> suppressed by _has_introduced_self guard
                await agent.on_enter()
                assert mock_session.say.call_count == 1  # Still 1
