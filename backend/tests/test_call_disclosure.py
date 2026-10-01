import pytest
from app.services.disclosure_service import (
    DISCLOSURE_VARIANTS,
    DISCLOSURE_TEMPLATES,
    normalize_language_code,
    select_disclosure_variant,
    validate_owner_disclosure_wording,
    build_compliant_greeting,
    handle_caller_recording_decline,
)


def test_all_variants_disclose_ai_and_recording():
    """Verify that every single variant in every language discloses both AI assistant identity and recording notice."""
    for lang, directions in DISCLOSURE_TEMPLATES.items():
        for direction, variants in directions.items():
            for variant_name, text in variants.items():
                text_lower = text.lower()
                # Verify AI assistant is present
                assert any(k in text_lower for k in ["ai assistant", "ai", "asistente de ia"]), (
                    f"Variant {variant_name} in {lang}/{direction} missing AI disclosure: {text}"
                )
                # Verify recording is present
                assert any(k in text_lower for k in ["record", "recorded", "रिकॉर्ड", "பதிவு", "రికార్డ్", "रेकॉर्ड", "grabada", "graba"]), (
                    f"Variant {variant_name} in {lang}/{direction} missing recording notice: {text}"
                )


def test_multilingual_default_greetings():
    """Test greeting generation across all required languages."""
    languages = ["en", "hi", "hinglish", "ta", "te", "mr", "es"]
    for lang in languages:
        greeting, variant, norm_lang = build_compliant_greeting(
            raw_greeting=None,
            clean_name="Aditi",
            business_name="Acme Health",
            direction="outbound",
            language=lang,
            purpose="annual consultation",
            variant="standard"
        )
        assert variant == "standard"
        assert norm_lang == normalize_language_code(lang)
        assert "Aditi" in greeting or "Acme Health" in greeting
        # Must contain AI assistant and recording keywords
        g_lower = greeting.lower()
        assert any(k in g_lower for k in ["ai assistant", "ai", "asistente de ia"])
        assert any(k in g_lower for k in ["record", "recorded", "रिकॉर्ड", "பதிவு", "రికార్డ్", "रेकॉर्ड", "grabada"])


def test_user_greeting_enhancement_adds_missing_disclosures():
    """When an owner supplies a custom sales pitch without disclosure, disclosure is prepended."""
    custom_pitch = "Special 50% discount on solar panels today! Would you like details?"
    greeting, variant, _ = build_compliant_greeting(
        raw_greeting=custom_pitch,
        clean_name="Vikram",
        business_name="Solar India",
        direction="outbound",
        language="en"
    )
    # Check that custom pitch is preserved
    assert custom_pitch in greeting
    g_lower = greeting.lower()
    assert "an ai assistant" in g_lower
    assert "solar india" in g_lower
    assert "this call may be recorded" in g_lower


def test_user_greeting_already_compliant_not_duplicated():
    """When an owner greeting already discloses AI assistant and recording, do not duplicate."""
    already_compliant = "Hello, I am Vikram, an AI assistant from Solar India. This call is recorded. Do you have 2 minutes?"
    greeting, _, _ = build_compliant_greeting(
        raw_greeting=already_compliant,
        clean_name="Vikram",
        business_name="Solar India",
        direction="outbound",
        language="en"
    )
    # Should not repeat "This is Vikram, an AI assistant"
    assert greeting.count("AI assistant") == 1
    assert greeting.count("recorded") == 1


def test_consent_modes_suffix():
    """Verify stay_on_line and spoken_or_keypress suffixes are properly appended."""
    # stay_on_line
    g_stay, _, _ = build_compliant_greeting(
        raw_greeting=None,
        clean_name="Aarav",
        business_name="FinCorp",
        direction="inbound",
        language="en",
        consent_mode="stay_on_line"
    )
    assert "By staying on the line, you consent to this recorded AI call." in g_stay

    # spoken_or_keypress
    g_keypress, _, _ = build_compliant_greeting(
        raw_greeting=None,
        clean_name="Aarav",
        business_name="FinCorp",
        direction="outbound",
        language="en",
        consent_mode="spoken_or_keypress"
    )
    assert "Please say 'yes' or press 1 to continue, or press 2 to decline." in g_keypress


def test_owner_custom_wording_validation():
    """Ensure owners cannot remove AI identity statement or recording notice."""
    # Valid custom wording
    valid_wording = "Hi! I am an AI assistant with Nova Tech. This call is recorded to help you better."
    is_valid, errors = validate_owner_disclosure_wording(valid_wording)
    assert is_valid is True
    assert len(errors) == 0

    # Missing AI statement
    bad_wording_no_ai = "Hi! I am a virtual assistant with Nova Tech. This call is recorded."
    is_valid, errors = validate_owner_disclosure_wording(bad_wording_no_ai)
    assert is_valid is False
    assert any("AI assistant" in e for e in errors)

    # Missing recording notice
    bad_wording_no_rec = "Hi! I am an AI assistant with Nova Tech. How can I help you today?"
    is_valid, errors = validate_owner_disclosure_wording(bad_wording_no_rec)
    assert is_valid is False
    assert any("recorded" in e for e in errors)


@pytest.mark.asyncio
async def test_caller_recording_decline_handler():
    """Verify decline path handles recording revocation gracefully."""
    outcome = await handle_caller_recording_decline(
        supabase_client=None,  # Offline test without DB client
        room_name="test-room-123",
        allow_unrecorded_continuation=True
    )
    assert outcome["action"] == "continue_unrecorded"
    assert "stopped recording" in outcome["spoken_response"]


def test_disclosure_always_plays_before_pitch():
    """
    Verify that AI identity and recording disclosure ALWAYS play before any
    promotional sales pitch, across multiple custom owner greetings.
    """
    from app.services.disclosure_service import build_compliant_greeting

    promotional_pitches = [
        "Special 50% discount on solar panels today! Would you like details?",
        "Hamare paas aapke liye exclusive home loan offer hai 7.5% interest rate par.",
        "We are offering pre-approved credit cards with zero annual fees. Do you have 2 minutes?",
    ]

    for pitch in promotional_pitches:
        greeting, _, _ = build_compliant_greeting(
            raw_greeting=pitch,
            clean_name="Aditi",
            business_name="Nova Tech",
            direction="outbound",
            language="hinglish"
        )

        g_lower = greeting.lower()
        # Find index of disclosure and index of pitch
        ai_idx = g_lower.find("ai assistant")
        rec_idx = g_lower.find("record")
        pitch_idx = g_lower.find(pitch.lower()[:20])

        assert ai_idx != -1, f"Missing AI disclosure in: {greeting}"
        assert rec_idx != -1, f"Missing recording notice in: {greeting}"
        assert pitch_idx != -1, f"Pitch missing in: {greeting}"
        # Critical Requirement: Disclosure must strictly precede the sales pitch
        assert ai_idx < pitch_idx, f"AI disclosure must appear before pitch: {greeting}"
        assert rec_idx < pitch_idx, f"Recording disclosure must appear before pitch: {greeting}"


def test_india_and_eu_outbound_defaults_to_affirmative_consent():
    """
    Verify that outbound marketing calls in India (+91) and the EU default to
    'spoken_or_keypress' affirmative consent, and 'stay_on_line' is prohibited.
    [CONFIRM WITH A LAWYER: India DPDP Act 2023 Sec 6 / EU GDPR Art 7].
    """
    from app.services.disclosure_service import resolve_jurisdiction_consent_mode

    # 1. India (+91) outbound marketing call defaults to spoken_or_keypress
    mode_in = resolve_jurisdiction_consent_mode(
        configured_mode=None,
        phone_number="+919876543210",
        call_direction="outbound",
        is_marketing=True
    )
    assert mode_in == "spoken_or_keypress"

    # 2. India outbound call with 10-digit format defaults to spoken_or_keypress
    mode_in_10digit = resolve_jurisdiction_consent_mode(
        configured_mode=None,
        phone_number="9876543210",
        call_direction="outbound",
        is_marketing=True
    )
    assert mode_in_10digit == "spoken_or_keypress"

    # 3. EU (+49 Germany) outbound marketing call defaults to spoken_or_keypress
    mode_eu = resolve_jurisdiction_consent_mode(
        configured_mode=None,
        phone_number="+4915123456789",
        country_code="DE",
        call_direction="outbound",
        is_marketing=True
    )
    assert mode_eu == "spoken_or_keypress"

    # 4. Prohibited default: stay_on_line requested in India is overridden unless lawyer confirmed
    mode_overridden = resolve_jurisdiction_consent_mode(
        configured_mode="stay_on_line",
        phone_number="+919876543210",
        call_direction="outbound",
        is_marketing=True,
        lawyer_confirmed=False
    )
    assert mode_overridden == "spoken_or_keypress", "stay_on_line must never be default in India/EU"

    # 5. Lawyer-confirmed explicit override is permitted
    mode_lawyer_ok = resolve_jurisdiction_consent_mode(
        configured_mode="stay_on_line",
        phone_number="+919876543210",
        call_direction="outbound",
        is_marketing=True,
        lawyer_confirmed=True
    )
    assert mode_lawyer_ok == "stay_on_line"


def test_disclosure_handles_caller_barge_in():
    """
    Verify that when a caller speaks over the disclosure (barge-in):
    1. Disclosure delivery is marked initiated/completed.
    2. Caller utterance is preserved and prioritized for next action.
    """
    from app.services.disclosure_service import handle_greeting_barge_in

    greeting = "Hello, this is Aditi, an AI assistant from Acme Corp. This call is recorded. Is now a good time?"
    caller_speech = "Hello? Who is calling? I am driving right now."

    result = handle_greeting_barge_in(
        disclosure_text=greeting,
        caller_interruption_text=caller_speech,
        is_interrupted=True
    )

    assert result["disclosure_delivered"] is True
    assert result["caller_barge_in"] is True
    assert result["caller_utterance"] == caller_speech
    assert result["next_action"] == "respond_to_caller_utterance"

