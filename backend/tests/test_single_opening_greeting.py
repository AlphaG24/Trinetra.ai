import pytest
from app.services.disclosure_service import (
    compose_single_opening_greeting,
    strip_dashboard_self_introduction,
    render_cached_opening_greeting,
    normalize_language_code,
)


def test_user_reported_case_hinglish_removes_duplicate_intro():
    """
    Direct regression test for the user's reported bug:
    Dashboard greeting: 'Hello! Main Arika bol rahi hoon trinetra se. kaise hain aap?'
    Must NOT repeat 'Main Arika bol rahi hoon' or 'Hello!'.
    Must produce exactly ONE opening greeting with mandatory AI disclosure and the remaining question.
    """
    dashboard_greeting = "Hello! Main Arika bol rahi hoon trinetra se. kaise hain aap?"
    greeting, variant, norm_lang = compose_single_opening_greeting(
        dashboard_greeting=dashboard_greeting,
        agent_name="Arika",
        business_name="Trinetra",
        caller_name=None,
        direction="inbound",
        language="hinglish",
        gender_tag="female"
    )

    assert norm_lang == "hinglish"
    # AI assistant statement must be present
    assert "ek ai assistant" in greeting.lower()
    # Recording notice must be present
    assert "record" in greeting.lower()
    # Business name must be present
    assert "Trinetra" in greeting
    # Remaining question must be present
    assert "kaise hain aap" in greeting.lower()

    # CRITICAL: Agent name and self intro must occur EXACTLY ONCE
    assert greeting.count("Arika") == 1
    assert greeting.lower().count("bol rahi hoon") == 1
    # Must not have duplicated greeting words
    assert greeting.lower().count("hello") + greeting.lower().count("namaste") == 1


def test_english_case_disclosure_before_sales_pitch():
    """
    English case: Dashboard pitch must follow strictly AFTER mandatory disclosure,
    and agent intro must not duplicate.
    """
    dashboard_greeting = "Hi, this is Vikram from Solar India. Are you interested in reducing electricity costs?"
    greeting, _, norm_lang = compose_single_opening_greeting(
        dashboard_greeting=dashboard_greeting,
        agent_name="Vikram",
        business_name="Solar India",
        caller_name=None,
        direction="outbound",
        language="en",
        gender_tag="male",
        purpose="solar panel subsidy"
    )

    assert norm_lang == "en"
    # Vikram appears exactly once
    assert greeting.count("Vikram") == 1
    # AI assistant declared
    assert "an ai assistant" in greeting.lower()
    # Outbound purpose declared
    assert "solar panel subsidy" in greeting
    # Recording notice declared
    assert "recorded" in greeting.lower()

    # Disclosure statements must appear BEFORE the sales pitch question
    disclosure_idx = greeting.lower().index("an ai assistant")
    pitch_idx = greeting.lower().index("reducing electricity costs")
    assert disclosure_idx < pitch_idx, "Mandatory AI disclosure must precede the pitch"


def test_hindi_case_with_and_without_caller_name():
    """
    Hindi case: Verifies Devanagari script, proper honorific ('जी'),
    name inclusion when known, and omission when unknown.
    """
    # 1. Unknown caller: no name, generic Namaste
    g_unknown, _, _ = compose_single_opening_greeting(
        dashboard_greeting="नमस्ते! मैं त्रिनेत्र से रिया बोल रही हूँ। क्या आप नए कोर्स के बारे में जानना चाहते हैं?",
        agent_name="रिया",
        business_name="त्रिनेत्र",
        caller_name=None,
        direction="inbound",
        language="hi",
        gender_tag="female"
    )
    assert "रिया" in g_unknown
    assert g_unknown.count("रिया") == 1
    assert "AI assistant" in g_unknown
    assert "रिकॉर्ड" in g_unknown
    assert "जी" not in g_unknown
    assert "क्या आप नए कोर्स" in g_unknown

    # 2. Known caller: includes first name with 'जी' honorific
    g_known, _, _ = compose_single_opening_greeting(
        dashboard_greeting="नमस्ते! मैं त्रिनेत्र से रिया बोल रही हूँ। क्या आप नए कोर्स के बारे में जानना चाहते हैं?",
        agent_name="रिया",
        business_name="त्रिनेत्र",
        caller_name="रोहन शर्मा",
        direction="inbound",
        language="hi",
        gender_tag="female"
    )
    assert "नमस्ते रोहन जी!" in g_known
    assert g_known.count("रिया") == 1
    assert "AI assistant" in g_known
    assert "क्या आप नए कोर्स" in g_known


def test_name_included_when_known_and_omitted_when_not():
    """
    Verify honorific handling across languages:
    - Hinglish: 'Rahul ji'
    - English: 'Rahul'
    - Unknown/None/Bogus: Omitted cleanly with no stray commas or slots
    """
    # Hinglish with known caller
    g_hinglish_known, _, _ = compose_single_opening_greeting(
        dashboard_greeting="Main aapki kya madad kar sakti hoon?",
        agent_name="Arika",
        business_name="Trinetra",
        caller_name="Rahul Verma",
        language="hinglish"
    )
    assert "Namaste Rahul ji!" in g_hinglish_known

    # Hinglish with bogus/unknown caller
    for bogus in [None, "", "   ", "Unknown", "unknown caller", "inbound caller", "None", "null"]:
        g_bogus, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Main aapki kya madad kar sakti hoon?",
            agent_name="Arika",
            business_name="Trinetra",
            caller_name=bogus,
            language="hinglish"
        )
        assert "Namaste!" in g_bogus
        assert "ji" not in g_bogus
        assert "None" not in g_bogus
        assert "unknown" not in g_bogus.lower()


def test_empty_dashboard_greeting_uses_default_template():
    """
    Rule 4: If dashboard greeting is empty or None, fallback to clean compliant template.
    """
    greeting, _, _ = compose_single_opening_greeting(
        dashboard_greeting=None,
        agent_name="Arika",
        business_name="Trinetra",
        caller_name=None,
        direction="inbound",
        language="hinglish"
    )
    assert "Namaste!" in greeting
    assert "Main Trinetra se Arika bol rahi hoon, ek AI assistant." in greeting
    assert "Service quality ke liye yeh call record ki ja sakti hai." in greeting
    assert "Main aapki kya madad kar sakti hoon?" in greeting


def test_caching_and_fast_rendering():
    """
    Tests pre-caching greeting in template_mode at agent save time
    and fast O(1) rendering at call time by inserting name into {caller_name_slot}.
    """
    cached_template, _, _ = compose_single_opening_greeting(
        dashboard_greeting="Hello! Main Arika bol rahi hoon trinetra se. kaise hain aap?",
        agent_name="Arika",
        business_name="Trinetra",
        template_mode=True,
        language="hinglish"
    )
    assert "{caller_name_slot}" in cached_template

    # Call time with known caller
    rendered_known = render_cached_opening_greeting(cached_template, caller_name="Amit Patel", language="hinglish")
    assert "Namaste Amit ji!" in rendered_known
    assert "{caller_name_slot}" not in rendered_known
    assert "kaise hain aap?" in rendered_known.lower()

    # Call time with unknown caller
    rendered_unknown = render_cached_opening_greeting(cached_template, caller_name=None, language="hinglish")
    assert "Namaste!" in rendered_unknown
    assert "{caller_name_slot}" not in rendered_unknown
    assert "  " not in rendered_unknown
