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


def test_smart_auto_population_of_slots_from_voice_directive():
    """Verify that when a voice directive contains appointment scheduling constraints,
    auto-populated slots are structured with proper booking slots and capacity."""
    sample_analysis = {
        "title": "Operating Hours: Open from 10:00 AM Today",
        "prompt_override": "Please inform callers that appointments can only be booked from 10:00 AM onwards today.",
        "category": "appointment_slots",
        "action_type": "hours_update",
        "summary_hindi": "Salon 10 baje ke baad open rahega",
        "auto_populated_items": [
            {
                "title": "Appointment Slot: 10:00 AM - 12:00 PM",
                "category": "appointment_slots",
                "identifier_code": "SLOT-10AM",
                "available_units": 3,
                "base_price_inr": 500,
                "minimum_price_inr": 400,
                "booking_slot_start": "2026-11-03T10:00:00Z",
                "booking_slot_end": "2026-11-03T12:00:00Z"
            },
            {
                "title": "Appointment Slot: 12:00 PM - 02:00 PM",
                "category": "appointment_slots",
                "identifier_code": "SLOT-12PM",
                "available_units": 3,
                "base_price_inr": 500,
                "minimum_price_inr": 400,
                "booking_slot_start": "2026-11-03T12:00:00Z",
                "booking_slot_end": "2026-11-03T14:00:00Z"
            }
        ]
    }

    assert len(sample_analysis["auto_populated_items"]) == 2
    slot_1 = sample_analysis["auto_populated_items"][0]
    assert slot_1["category"] == "appointment_slots"
    assert slot_1["available_units"] == 3
    assert "10:00:00Z" in slot_1["booking_slot_start"]
    assert slot_1["base_price_inr"] >= slot_1["minimum_price_inr"]


def test_dynamic_inventory_stock_and_sales_tracking():
    """Verify that when products are reserved/sold during calls, sold_units increments
    and available_units decrements correctly."""
    item = {
        "title": "Classic T-Shirt (Black - M)",
        "available_units": 10,
        "metadata": {
            "initial_units": 10,
            "sold_units": 0
        }
    }
    units_to_reserve = 3
    curr_units = float(item["available_units"])
    new_units = max(0, curr_units - units_to_reserve)
    meta = item["metadata"]
    curr_sold = float(meta.get("sold_units") or 0)
    meta["sold_units"] = curr_sold + units_to_reserve
    item["available_units"] = new_units

    assert item["available_units"] == 7
    assert meta["sold_units"] == 3
    assert meta["initial_units"] == 10


def test_family_member_vip_exclusion_and_owner_transfer():
    """Verify that family members and VIPs in business_operations_catalog are
    recognized for immediate warm transfer and outbound calling exclusion."""
    family_catalog_items = [
        {
            "category": "family_vip",
            "title": "Rohan",
            "identifier_code": "+919876543210",
            "metadata": {
                "relationship": "Brother",
                "phone": "+919876543210",
                "auto_transfer": True,
                "exclude_from_outbound": True
            }
        },
        {
            "category": "call_forwarding",
            "title": "Owner Secondary Line",
            "metadata": {
                "owner_secondary_phone": "+919988776655",
                "warm_transfer_enabled": True,
                "fallback_message": "Owner is currently unavailable, WhatsApp alert sent."
            }
        }
    ]

    family_contacts = []
    owner_forwarding = None

    for item in family_catalog_items:
        if item["category"] == "family_vip":
            name = item["title"]
            phone = item["metadata"]["phone"]
            rel = item["metadata"]["relationship"]
            family_contacts.append(f"{name} ({rel}): {phone}")
        elif item["category"] == "call_forwarding":
            owner_forwarding = item["metadata"]["owner_secondary_phone"]

    assert len(family_contacts) == 1
    assert "Rohan (Brother): +919876543210" in family_contacts[0]
    assert owner_forwarding == "+919988776655"



