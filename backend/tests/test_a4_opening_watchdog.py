"""
tests/test_a4_opening_watchdog.py

A4: Playout watchdog timeout scales dynamically with opening greeting duration:
  timeout = max(15.0, estimated_duration * 1.5 + 3.0)
Ensures the watchdog can NEVER fire during legitimate playback, even for
longer greetings, while maintaining a strict ceiling against frozen sessions.
"""
import pytest
import asyncio
from app.services.disclosure_service import (
    estimate_opening_duration,
    calculate_opening_watchdog_timeout,
    compose_single_opening_greeting,
)


class TestA4OpeningWatchdogScaling:
    """Verifies that the playout watchdog timeout scales properly with duration."""

    def test_empty_and_none_use_minimum_floor(self):
        """Empty or None text must default to minimum 15.0 seconds."""
        assert calculate_opening_watchdog_timeout(None) == 15.0
        assert calculate_opening_watchdog_timeout("") == 15.0
        assert calculate_opening_watchdog_timeout("   ") == 15.0

    def test_short_greeting_clamps_to_15s_floor(self):
        """Short greetings whose scaled duration is <15s must clamp to 15.0s."""
        short_text = "Namaste! How can I help you today?"
        est = estimate_opening_duration(short_text)
        # Short greeting is roughly 2-4 seconds
        assert est < 8.0
        # Scaled (est * 1.5 + 3.0) is < 15.0, so should clamp to 15.0
        timeout = calculate_opening_watchdog_timeout(short_text)
        assert timeout == 15.0

    def test_watchdog_always_strictly_greater_than_estimated_duration(self):
        """Watchdog timeout must always exceed estimated duration by at least 1.5x + 3s."""
        samples = [
            "Hello, this is a quick message.",
            "Namaste! Main Trinetra AI se Vikram bol raha hoon. Service quality ke liye yeh call record ki ja sakti hai. Aapka loan application approve ho gaya hai.",
            "Good morning! I am calling from Apollo Healthcare on behalf of Dr. Sharma regarding your scheduled consultation tomorrow afternoon. Please confirm if you will be available.",
            "வணக்கம்! நான் திரினேத்ரா ஏஐ இருந்து பேசுகிறேன். இந்த அழைப்பு பதிவு செய்யப்படலாம்.",
        ]
        for s in samples:
            est = estimate_opening_duration(s)
            timeout = calculate_opening_watchdog_timeout(s)
            assert timeout >= 15.0
            assert timeout >= est * 1.5 + 3.0, f"Watchdog {timeout} should be >= est*1.5+3 ({est * 1.5 + 3.0})"

    def test_long_greeting_scales_watchdog_safely_above_15s(self):
        """A lengthy greeting must scale the watchdog well past the 15s floor."""
        long_text = (
            "Namaste! Main Trinetra AI se Priya bol rahi hoon. Service quality aur compliance ke liye "
            "yeh call record ki ja sakti hai. Hum aapke business ke liye AI customer support automate "
            "karne me madad karte hain. Kya aapke paas 2 minute hain taaki hum aapke workflow ke baare "
            "me baat kar sakein aur aapko ek live demo dikha sakein?"
        )
        est = estimate_opening_duration(long_text)
        assert est > 10.0, f"Expected estimated duration >10s, got {est}"
        timeout = calculate_opening_watchdog_timeout(long_text)
        assert timeout > 18.0, f"Expected scaled watchdog >18s, got {timeout}"
        assert timeout >= est * 1.5 + 3.0

    def test_multilingual_composed_greetings_watchdog(self):
        """Verifies watchdog calculation on actual composed greetings across all supported languages."""
        languages = ["hinglish", "hi", "mr", "ta", "te", "kn", "bn", "gu", "en"]
        for lang in languages:
            greeting, _, _ = compose_single_opening_greeting(
                dashboard_greeting="Aapka order process ho raha hai. Kya aap confirm kar sakte hain?",
                agent_name="Vikram",
                business_name="Trinetra Logistics",
                direction="inbound",
                language=lang,
                gender_tag="male",
            )
            est = estimate_opening_duration(greeting)
            timeout = calculate_opening_watchdog_timeout(greeting)
            assert est > 0.0, f"Estimated duration for {lang} must be positive"
            assert timeout >= 15.0, f"Timeout for {lang} must be >= 15.0s, got {timeout}"
            assert timeout >= est * 1.5 + 3.0


class TestA4AsyncWatchdogSimulation:
    """Simulates async speech playback with the watchdog timeout."""

    @pytest.mark.asyncio
    async def test_legitimate_playback_completes_without_watchdog_firing(self):
        """Simulates legitimate playback taking 100ms; should finish without timeout."""
        greeting = "Namaste! Main Trinetra AI se bol raha hoon."
        watchdog_timeout = calculate_opening_watchdog_timeout(greeting)
        assert watchdog_timeout >= 15.0

        async def _mock_speech():
            await asyncio.sleep(0.05)
            return "played_ok"

        result = await asyncio.wait_for(_mock_speech(), timeout=watchdog_timeout)
        assert result == "played_ok"

    @pytest.mark.asyncio
    async def test_frozen_session_triggers_timeout_error(self):
        """A frozen playout task properly raises asyncio.TimeoutError at the specified timeout."""
        watchdog_timeout = 0.05  # Use small timeout for test speed

        async def _frozen_speech():
            await asyncio.sleep(1.0)
            return "never_reached"

        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(_frozen_speech(), timeout=watchdog_timeout)
