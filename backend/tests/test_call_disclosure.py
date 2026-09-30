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
    # Check that AI assistant and recording notices were prepended
    g_lower = greeting.lower()
    assert "an ai assistant from solar india" in g_lower
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
