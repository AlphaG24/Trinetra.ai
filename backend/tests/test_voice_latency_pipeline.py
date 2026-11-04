"""
Test Suite for Phase 6: Voice Pipeline Latency Hardening (<100ms Target).
Fulfills Changes.md Item 91:
1. Low-latency Silero VAD parameter tuning (150ms speech duration, 250ms silence).
2. Sub-300ms endpointing delay & speculative token generation (preemptive_generation=True).
3. Zero-delay telephony prebuffer (1-frame playout onset, eliminating 80ms jitter delay).
4. Native 8kHz telephony sampling passthrough to eliminate audioop.ratecv overhead & crackles.
5. VoiceTimingTracker sub-100ms pipeline evaluation and stage duration assertions.
"""

import os
import sys
import time
import pytest
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.voice_reliability_service import VoiceTimingTracker
import agent


# =====================================================================
# 1. VAD PARAMETERS & ENDPOINTING DELAY TESTS
# =====================================================================

def test_silero_vad_low_latency_tuning():
    """Verify Silero VAD is loaded with responsive, low-latency thresholds."""
    with patch("livekit.plugins.silero.VAD.load") as mock_vad_load:
        # Reset cached VAD
        agent._vad_model = None
        mock_instance = MagicMock()
        mock_vad_load.return_value = mock_instance

        vad = agent.get_vad_model()
        mock_vad_load.assert_called_once()
        kwargs = mock_vad_load.call_args[1]

        # Verify speech duration is 150ms (0.15s) for instant response
        assert kwargs["min_speech_duration"] == 0.15
        # Verify silence duration is 250ms (0.25s) down from 550ms
        assert kwargs["min_silence_duration"] == 0.25
        # Activation threshold 0.50
        assert kwargs["activation_threshold"] == 0.50


def test_vikram_agent_endpointing_delay_optimized():
    """Verify VikramAgent is initialized with 300ms endpointing delay."""
    with patch("livekit.agents.Agent.__init__") as mock_super_init, \
         patch("agent.get_vad_model") as mock_vad, \
         patch("livekit.plugins.sarvam.TTS") as mock_tts:

        # Test agent initialization
        a = agent.VikramAgent(
            instructions="Test instructions",
            voice_provider="sarvam",
            voice_id="shubh",
            sample_rate=8000
        )

        mock_super_init.assert_called_once()
        super_kwargs = mock_super_init.call_args[1]

        # Min endpointing delay must be 0.30s (300ms) down from 0.90s
        assert super_kwargs["min_endpointing_delay"] == 0.30
        assert super_kwargs["max_endpointing_delay"] == 1.2
        assert super_kwargs["min_consecutive_speech_delay"] == 0.15


# =====================================================================
# 2. NATIVE 8KHZ TELEPHONY SAMPLING PASSTHROUGH
# =====================================================================

def test_telephony_sample_rate_passthrough():
    """Verify telephony channels pass 8000Hz to Sarvam TTS to eliminate resampling overhead."""
    with patch("livekit.agents.Agent.__init__"), \
         patch("agent.get_vad_model"), \
         patch("livekit.plugins.sarvam.TTS") as mock_sarvam_tts:

        # Call with native telephony sample rate 8000
        a = agent.VikramAgent(
            instructions="Test",
            voice_provider="sarvam",
            voice_id="shubh",
            sample_rate=8000
        )

        mock_sarvam_tts.assert_called_once()
        tts_kwargs = mock_sarvam_tts.call_args[1]
        assert tts_kwargs["speech_sample_rate"] == 8000


# =====================================================================
# 3. TELEPHONY PREBUFFER ZERO-DELAY ASSERTIONS
# =====================================================================

def test_telephony_prebuffer_onset():
    """Verify that voice_router prebuffer starts playing on the very first frame."""
    import voice_router

    # Read voice_router code to ensure min_prebuffer_bytes == frame_size
    vr_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "voice_router.py")
    with open(vr_path, "r", encoding="utf-8") as f:
        src = f.read()

    assert "min_prebuffer_bytes = frame_size" in src
    # Ensure old 3-frame (120ms) delay is completely eliminated
    assert "min_prebuffer_bytes = frame_size * 3" not in src


# =====================================================================
# 4. VOICE TIMING TRACKER LATENCY EVALUATIONS
# =====================================================================

def test_voice_timing_tracker_sub_100ms_check():
    """Verify VoiceTimingTracker evaluates sub-100ms intermediate processing."""
    tracker = VoiceTimingTracker(room_id="room-test-100ms")

    t0 = time.perf_counter()
    tracker._timestamps["user_speech_end"] = t0
    tracker._timestamps["stt_final"] = t0 + 0.030        # 30ms STT
    tracker._timestamps["llm_first_token"] = t0 + 0.085  # 55ms LLM First Token (Groq)
    tracker._timestamps["tts_first_byte"] = t0 + 0.120   # 35ms TTS First Byte (Sarvam)
    tracker._timestamps["audio_playout"] = t0 + 0.140

    # STT -> LLM First Token took (85 - 30) = 55ms <= 100ms
    assert tracker.is_sub_100ms_pipeline() is True

    turn_latency = tracker.get_turn_taking_latency_ms()
    assert turn_latency is not None
    assert round(turn_latency) == 140


def test_voice_timing_tracker_detects_lag():
    """Verify VoiceTimingTracker detects when pipeline exceeds 100ms."""
    tracker = VoiceTimingTracker(room_id="room-test-lag")

    t0 = time.perf_counter()
    tracker._timestamps["user_speech_end"] = t0
    tracker._timestamps["stt_final"] = t0 + 0.040
    tracker._timestamps["llm_first_token"] = t0 + 0.250  # 210ms (exceeded 100ms)

    assert tracker.is_sub_100ms_pipeline() is False
