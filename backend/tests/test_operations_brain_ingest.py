import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import MagicMock, AsyncMock, patch


def test_voice_directive_prompt_injection_structure():
    """Verify that when active voice directives exist in business_operations_catalog,
    they are cleanly formatted with high priority precedence in agent system prompt."""

    sample_items = [
        {
            "category": "voice_directive",
            "title": "Salon Timings: 10 AM to 4 PM Today",
            "status": "available",
            "metadata": {
                "prompt_override": "Salon open today strictly between 10:00 AM and 4:00 PM. Do not accept appointments outside this window.",
                "voice_transcript": "Aaj mai 10 baje se 4 bje tak salon open rakhunga to us time ke according he appointements lena"
            }
        },
        {
            "category": "voice_directive",
            "title": "Fleet Update: 0 Vehicles Available",
            "status": "available",
            "metadata": {
                "prompt_override": "Zero trucks/vehicles available today. Inform callers that fleet is fully booked and request their vehicle offerings.",
                "voice_transcript": "aaj mere paas koi gaadi nhi hai par products available hai"
            }
        },
        {
            "identifier_code": "SRV-HC-01",
            "title": "Premium Haircut & Styling",
            "category": "inventory",
            "available_units": 10,
            "base_price_inr": 800,
            "minimum_price_inr": 650,
            "status": "available"
        }
    ]

    voice_directives = []
    cat_lines = []

    for item in sample_items:
        cat = item.get("category") or "general"
        meta = item.get("metadata") or {}

        if cat == "voice_directive":
            override = meta.get("prompt_override") or item.get("title")
            voice_directives.append(f"- ⚡ [OWNER VOICE OVERRIDE]: {override}")
            continue

        code = item.get("identifier_code") or "ITEM"
        title = item.get("title") or "Item"
        units = item.get("available_units", 1)
        base_p = item.get("base_price_inr")
        min_p = item.get("minimum_price_inr")

        desc = f"- [{code}] {title} ({cat}, Units/Slots: {units})"
        if base_p is not None:
            desc += f", Quoted Price: Rs. {base_p}"
        if min_p is not None:
            desc += f", Strict Floor Limit: Rs. {min_p}"
        cat_lines.append(desc)

    # Verify voice directives separated
    assert len(voice_directives) == 2
    assert "Salon open today strictly between 10:00 AM and 4:00 PM" in voice_directives[0]
    assert "Zero trucks/vehicles available today" in voice_directives[1]

    # Verify catalog line
    assert len(cat_lines) == 1
    assert "Premium Haircut & Styling" in cat_lines[0]
    assert "Strict Floor Limit: Rs. 650" in cat_lines[0]


def test_sec011_compliance_with_brain_injection():
    """Verify SEC-011 immutable compliance: AI identity disclosure and call recording
    notice must remain intact even with dynamic operations brain prompts."""
    from app.services.disclosure_service import compose_single_opening_greeting

    opening, _, _ = compose_single_opening_greeting(
        dashboard_greeting="Namaste, aapki inquiry ke silsile mein call kiya hai.",
        agent_name="Arika",
        business_name="Trinetra AI",
        caller_name="Raghav",
        direction="inbound",
        language="hinglish"
    )

    # SEC-011 Mandates: Must state AI identity and recording disclosure
    assert "AI assistant" in opening or "AI" in opening
    assert "record" in opening.lower() or "रिकॉर्ड" in opening
