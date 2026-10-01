import pytest
from app.services.disclosure_service import (
    compose_single_opening_greeting,
    strip_dashboard_self_introduction,
    render_cached_opening_greeting,
    normalize_language_code,
    invalidate_greeting_cache,
    get_greeting_cache_key,
    _COMPOSED_GREETING_CACHE,
    persist_call_disclosure,
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


def test_22_realistic_dashboard_greetings_safe_stripping_and_composition():
    """
    Test set of 22 realistic dashboard greetings covering:
    - English, Hindi, Hinglish
    - 'Hello, I'm calling about your appointment tomorrow'
    - Greetings with NO self-introduction
    - Greetings that already say agent and business names
    - Greetings with purpose, offer, medical, financial, and appointments
    Ensures safe sentence stripping and compliant single opening composition.
    """
    test_cases = [
        # (id, raw_greeting, agent, biz, lang, is_outbound, caller_name)
        (1, "Hello, I'm calling about your appointment tomorrow.", "Arika", "Trinetra", "en", True, None),
        (2, "Hello! Main Arika bol rahi hoon trinetra se. kaise hain aap?", "Arika", "Trinetra", "hinglish", False, None),
        (3, "Hi, this is Vikram from Solar India. Are you looking to cut your electric bills?", "Vikram", "Solar India", "en", True, None),
        (4, "नमस्ते! मैं त्रिनेत्र से रिया बोल रही हूँ। क्या आप नए कोर्स के बारे में जानना चाहते हैं?", "रिया", "त्रिनेत्र", "hi", False, None),
        (5, "Special 50% discount on all solar panels today! Would you like to schedule a demo?", "Vikram", "Solar India", "en", True, None),
        (6, "Namaste, we have a scheduled call regarding your property inquiry.", "Arika", "Trinetra", "hinglish", True, None),
        (7, "Good morning! Just checking in to see if you received our proposal.", "Sarah", "Acme", "en", True, None),
        (8, "Hello! I am calling from Apollo Clinic to confirm your doctor visit at 4 PM.", "Arika", "Apollo Clinic", "en", True, None),
        (9, "Aapka order deliver hone wala hai, kya aap address confirm karenge?", "Arika", "Trinetra", "hinglish", True, None),
        (10, "Hello, my name is Priya from EduTech. Are you available for a 2-minute quick chat?", "Priya", "EduTech", "en", True, None),
        (11, "Main Vikram bol raha hoon. Kya aapko loan ki zaroorat hai?", "Vikram", "FinServe", "hinglish", True, None),
        (12, "Hello! Main Trinetra AI se Arika bol rahi hoon, ek AI assistant. Call quality ke liye record hogi. Kaise hain aap?", "Arika", "Trinetra", "hinglish", False, None),
        (13, "Hello! This is Sarah from Acme Corp, an AI assistant. This call is recorded. How can I assist you today?", "Sarah", "Acme Corp", "en", False, None),
        (14, "Hello!", "Arika", "Trinetra", "hinglish", False, None),
        (15, "Good morning", "Sarah", "Acme", "en", False, None),
        (16, "Hey, I wanted to follow up on the demo request you submitted on our website.", "Arika", "Trinetra", "en", True, None),
        (17, "Hi! Are you still looking for a 3BHK flat in Whitefield?", "Vikram", "RealtyPro", "en", True, None),
        (18, "नमस्ते! आपके कल के अपॉइंटमेंट की पुष्टि के लिए यह कॉल है।", "रिया", "त्रिनेत्र", "hi", True, None),
        (19, "Main Rohan bol raha hoon City Hospital se. Aapki test reports ready hain.", "Rohan", "City Hospital", "hinglish", True, None),
        (20, "Hello! I'm reaching out from HDFC Bank to inform you about your card upgrade.", "Priya", "HDFC Bank", "en", True, None),
        (21, "Namaste ji, kya main jaan sakta hoon ki aapki meeting kab schedule karni hai?", "Arika", "Trinetra", "hinglish", False, None),
        (22, "Hi, thank you for contacting customer support. How can I help you today?", "SupportAgent", "Trinetra", "en", False, None),
    ]

    for cid, raw, agent, biz, lang, is_outbound, cname in test_cases:
        direction = "outbound" if is_outbound else "inbound"
        composed, _, _ = compose_single_opening_greeting(
            dashboard_greeting=raw,
            agent_name=agent,
            business_name=biz,
            caller_name=cname,
            direction=direction,
            language=lang
        )

        # 1. AI identity must be stated in every greeting
        assert ("ai assistant" in composed.lower() or "ai" in composed.lower()), f"Case {cid} missing AI disclosure"

        # 2. Recording notice must be present
        assert any(term in composed.lower() for term in ["record", "रिकॉर्ड", "grabada", "பதிவு", "రికార్డ్"]), f"Case {cid} missing recording notice"

        # 3. Agent name must appear at most once in introduction
        assert composed.count(agent) <= 1, f"Case {cid} duplicated agent name '{agent}'"

        # 4. Critical check: Case 1 ("I'm calling about your appointment tomorrow") must preserve appointment
        if cid == 1:
            assert "appointment tomorrow" in composed.lower(), "Case 1 must preserve 'appointment tomorrow'!"

        # 5. Case 5 (Offer with no intro) must preserve the 50% discount and demo question
        if cid == 5:
            assert "50% discount" in composed and "schedule a demo" in composed

        # 6. Case 18 (Hindi appointment) must preserve Hindi appointment text
        if cid == 18:
            assert "अपॉइंटमेंट की पुष्टि" in composed


def test_safety_rule_never_removes_non_intro_sentences():
    """
    Safety Rule: If stripping would remove more than about half the text or leave nothing
    meaningful, keep the owner's text and only prepend the mandatory disclosure.
    Never remove a sentence that is not a self-introduction.
    """
    # Case A: Owner text is entirely a business action sentence containing "I am calling"
    raw_action = "Hello, I am calling about your appointment tomorrow."
    stripped = strip_dashboard_self_introduction(raw_action, "Arika", "Trinetra")
    # Must preserve the action sentence
    assert "calling about your appointment tomorrow" in stripped.lower()

    # Case B: Multi-sentence with non-intro sentence
    raw_multi = "Hi, this is Vikram from Solar India. We have prepared the 5kW rooftop solar estimate for your property."
    stripped_multi = strip_dashboard_self_introduction(raw_multi, "Vikram", "Solar India")
    assert "5kW rooftop solar estimate" in stripped_multi
    assert "Vikram" not in stripped_multi  # intro sentence was safely stripped

    # Case C: Composed greeting keeps owner's text and prepends disclosure
    composed, _, _ = compose_single_opening_greeting(
        dashboard_greeting=raw_action,
        agent_name="Arika",
        business_name="Trinetra",
        language="en"
    )
    assert "an ai assistant" in composed.lower()
    assert "appointment tomorrow" in composed.lower()


def test_caller_name_privacy_withholds_sensitive_details_until_confirmed():
    """
    Requirement 2: Caller name is used ONLY to greet.
    For outbound or inbound calls matched by phone number, do not share personal,
    financial, or appointment details until the person confirms their identity
    (e.g., 'Kya main Rahul ji se baat kar rahi hoon?').
    """
    # Outbound call with matched caller name and sensitive appointment details
    sensitive_appointment_greeting = "Hello, I am calling from Apollo Clinic regarding your cancer screening appointment tomorrow at 10 AM."
    opening, _, _ = compose_single_opening_greeting(
        dashboard_greeting=sensitive_appointment_greeting,
        agent_name="Arika",
        business_name="Apollo Clinic",
        caller_name="Rahul Sharma",
        direction="outbound",
        language="hinglish",
        verify_identity=True
    )

    # 1. Greets by name warmly
    assert "Namaste Rahul ji!" in opening

    # 2. Asks identity verification prompt
    assert "Kya main Rahul ji se baat kar rahi hoon?" in opening

    # 3. CRITICAL PRIVACY RULE: Must NOT blurt out cancer screening or appointment in opening!
    assert "cancer" not in opening.lower()
    assert "screening" not in opening.lower()
    assert "10 am" not in opening.lower()

    # English version test
    opening_en, _, _ = compose_single_opening_greeting(
        dashboard_greeting="We are following up on your pending loan balance of 50,000 rupees.",
        agent_name="David",
        business_name="BankCorp",
        caller_name="Rahul Sharma",
        direction="outbound",
        language="en",
        verify_identity=True
    )
    assert "Hello Rahul!" in opening_en
    assert "Am I speaking with Rahul?" in opening_en
    # Must NOT disclose loan balance in opening before identity confirmation
    assert "50,000" not in opening_en
    assert "loan balance" not in opening_en


def test_cache_invalidation_on_attribute_changes():
    """
    Requirement 3: When the dashboard greeting, agent name, business name,
    language, or A/B variant changes, the cached composed greeting must refresh.
    Also verifies explicit cache eviction via invalidate_greeting_cache().
    """
    agent_id = "test-agent-123"
    invalidate_greeting_cache(agent_id)

    # 1. Base greeting
    g1, v1, l1 = compose_single_opening_greeting(
        dashboard_greeting="Hello! How can I help you?",
        agent_name="Arika",
        business_name="Trinetra",
        language="en",
        variant="standard",
        agent_id=agent_id
    )
    k1 = get_greeting_cache_key(agent_id, "Hello! How can I help you?", "Arika", "Trinetra", "en", variant="standard")
    assert k1 in _COMPOSED_GREETING_CACHE

    # 2. Dashboard greeting changes -> must produce different cache key & refreshed greeting
    g2, v2, l2 = compose_single_opening_greeting(
        dashboard_greeting="Hello! Do you want to see our pricing?",
        agent_name="Arika",
        business_name="Trinetra",
        language="en",
        variant="standard",
        agent_id=agent_id
    )
    k2 = get_greeting_cache_key(agent_id, "Hello! Do you want to see our pricing?", "Arika", "Trinetra", "en", variant="standard")
    assert k1 != k2
    assert "pricing" in g2
    assert "pricing" not in g1

    # 3. Agent name changes -> refreshes
    g3, _, _ = compose_single_opening_greeting(
        dashboard_greeting="Hello! How can I help you?",
        agent_name="Priya",
        business_name="Trinetra",
        language="en",
        agent_id=agent_id
    )
    assert "Priya" in g3 and "Arika" not in g3

    # 4. Business name changes -> refreshes
    g4, _, _ = compose_single_opening_greeting(
        dashboard_greeting="Hello! How can I help you?",
        agent_name="Arika",
        business_name="NexGen AI",
        language="en",
        agent_id=agent_id
    )
    assert "NexGen AI" in g4

    # 5. Language changes -> refreshes
    g5, _, l5 = compose_single_opening_greeting(
        dashboard_greeting="Hello! How can I help you?",
        agent_name="Arika",
        business_name="Trinetra",
        language="hi",
        agent_id=agent_id
    )
    assert l5 == "hi"
    assert "नमस्ते!" in g5

    # 6. A/B Variant changes -> refreshes
    g6, v6, _ = compose_single_opening_greeting(
        dashboard_greeting="Hello! How can I help you?",
        agent_name="Arika",
        business_name="Trinetra",
        language="en",
        variant="short",
        agent_id=agent_id
    )
    assert v6 == "concise"

    # 7. Explicit cache invalidation flushes entries for this agent
    invalidate_greeting_cache(agent_id)
    assert k1 not in _COMPOSED_GREETING_CACHE
    assert k2 not in _COMPOSED_GREETING_CACHE


def test_opening_disclosure_duration_logging():
    """
    Requirement 4: Log final composed opening text and its duration.
    Verifies durations across languages for both standard and concise wording.
    Ensures concise variants stay strictly <= 10.0 seconds.
    """
    languages = ["hinglish", "en", "hi", "ta", "te"]
    standard_durations = {}
    concise_durations = {}

    for lang in languages:
        # Standard composed opening
        comp_std, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Main aapki kya madad kar sakti hoon?",
            agent_name="Arika",
            business_name="Trinetra",
            language=lang,
            variant="standard"
        )
        dur_std = round(len(comp_std.split()) / 2.3, 1)
        standard_durations[lang] = dur_std

        # Concise composed opening
        comp_concise, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Main aapki kya madad kar sakti hoon?",
            agent_name="Arika",
            business_name="Trinetra",
            language=lang,
            variant="concise"
        )
        dur_concise = round(len(comp_concise.split()) / 2.3, 1)
        concise_durations[lang] = dur_concise

        # Concise variants must strictly stay under 10 seconds
        assert dur_concise <= 10.0, f"Concise duration for {lang} ({dur_concise}s) exceeds 10s limit!"

    assert all(d > 0 for d in standard_durations.values())
    assert all(d <= 10.0 for d in concise_durations.values())
