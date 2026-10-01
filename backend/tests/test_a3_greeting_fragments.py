"""
tests/test_a3_greeting_fragments.py

A3: Drop leading/trailing greeting fragments (e.g., "Ji,", "Namaste,", "Hello!")
from the remainder/dashboard text when the opening greeting already contains one.
Prevents double-greeting like:
  "Namaste Rahul ji! ... Ji, kya aap available hain?"
22 regression cases.
"""
import pytest
from app.services.disclosure_service import compose_single_opening_greeting


# ---------------------------------------------------------------------------
# Helper: extract the part of greeting after mandatory disclosure
# ---------------------------------------------------------------------------
def _tail(greeting: str) -> str:
    """Return last sentence(s) of the greeting for inspection."""
    return greeting.strip()


DOUBLE_GREETING_PATTERNS = [
    "ji, ji",
    "namaste namaste",
    "hello hello",
    "namaste! namaste",
    "ji! ji",
    "नमस्ते नमस्ते",
]


def _has_double_greeting(text: str) -> bool:
    t = text.lower()
    for pat in DOUBLE_GREETING_PATTERNS:
        if pat in t:
            return True
    return False


# ---------------------------------------------------------------------------
# Parameterized 22-case regression suite
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("case_id,dashboard,agent,biz,lang,direction,caller,expected_absent,expected_present", [
    # 1. Leading "Ji," stripped
    (1, "Ji, kya aap available hain?", "Arika", "Trinetra", "hinglish", "inbound", None,
     ["namaste ji,", "ji, ji"], ["kya aap available"]),
    # 2. Leading "Namaste!" stripped
    (2, "Namaste! Kya main aapki madad kar sakta hoon?", "Arjun", "Trinetra", "hinglish", "inbound", None,
     ["namaste namaste", "namaste! namaste"], ["madad"]),
    # 3. Leading "Hello!" stripped
    (3, "Hello! How can I help you today?", "Aria", "Trinetra", "en", "inbound", None,
     ["hello! hello", "hello hello"], ["help you today"]),
    # 4. Leading "Hi," stripped
    (4, "Hi, please hold while I check your details.", "Dev", "Trinetra", "en", "inbound", None,
     ["hello hi", "hi, hi"], ["please hold"]),
    # 5. Leading "नमस्ते!" stripped (Hindi)
    (5, "नमस्ते! आपकी सहायता करने में खुशी होगी।", "रिया", "त्रिनेत्र", "hi", "inbound", None,
     ["नमस्ते नमस्ते", "नमस्ते! नमस्ते"], ["सहायता"]),
    # 6. Leading "नमस्कार!" stripped (Marathi)
    (6, "नमस्कार! आपले स्वागत आहे.", "प्रिया", "ट्रिनेत्र", "mr", "inbound", None,
     ["नमस्कार नमस्कार", "नमस्कार! नमस्कार"], ["स्वागत"]),
    # 7. Trailing "ji" stripped
    (7, "Aapka kaam ho jayega, ji.", "Kabir", "Trinetra", "hinglish", "inbound", None,
     [", ji.", "ji ji"], ["kaam ho jayega"]),
    # 8. Trailing "जी" stripped
    (8, "Bilkul, main aapki madad karunga, जी।", "Rohan", "Trinetra", "hinglish", "inbound", None,
     ["जी ji", "namaste जी"], ["madad"]),
    # 9. No double greeting when no fragment present
    (9, "Aapka order confirm ho gaya hai.", "Dev", "QuickShop", "hinglish", "inbound", None,
     [], ["order confirm"]),  # No fragments to strip; content preserved
    # 10. "Hey!" stripped
    (10, "Hey! Is there anything I can assist you with?", "Sam", "Acme", "en", "inbound", None,
     ["hello hey"], ["assist"]),
    # 11. Named caller — no double greeting even with name
    (11, "Ji, kya Rahul ji available hain?", "Arika", "Trinetra", "hinglish", "inbound", "Rahul Sharma",
     ["ji, ji", "namaste ji, ji"], []),  # Sensitive check: no doubled ji
    # 12. Identity confirmation prompt not stripped (should_confirm_identity path)
    (12, "Your appointment is confirmed.", "Priya", "ClinicX", "hinglish", "outbound", "Anita Verma",
     ["appointment"], ["anita", "baat kar"]),  # Identity prompt, not dashboard text
    # 13. "Haan," leading
    (13, "Haan, bilkul main help kar sakti hoon.", "Priya", "Trinetra", "hinglish", "inbound", None,
     ["namaste haan,"], ["bilkul"]),
    # 14. Multi-word leading fragment "Namaste ji,"
    (14, "Namaste ji, kya main kuch puch sakta hoon?", "Dev", "Trinetra", "hinglish", "inbound", None,
     ["namaste namaste"], ["puch"]),
    # 15. English — "Hello there," not double-stripped (only exact "Hello" triggers)
    (15, "Hello there, welcome to our service!", "Aria", "Trinetra", "en", "inbound", None,
     ["hello hello"], []),  # "Hello there" — strip leading "Hello" only
    # 16. Tamil greeting stripped
    (16, "வணக்கம்! உங்களுக்கு எப்படி உதவலாம்?", "Kavya", "Trinetra", "ta", "inbound", None,
     ["வணக்கம் வணக்கம்"], ["உதவலாம்"]),
    # 17. No stripping on default fallback remainder ("How may I help you")
    (17, None, "Aria", "Trinetra", "en", "inbound", None,
     ["hello hello"], ["how may i help"]),
    # 18. No stripping on outbound default fallback
    (18, None, "Dev", "Trinetra", "hinglish", "outbound", None,
     ["namaste namaste"], ["do minute"]),
    # 19. Remainder is only "Ji" — strips cleanly, uses fallback
    (19, "Ji.", "Priya", "Trinetra", "hinglish", "inbound", None,
     ["namaste ji. ji", "ji. ji"], []),
    # 20. Mixed case "JI," stripped
    (20, "JI, kya main madad kar sakti hoon?", "Riya", "Trinetra", "hinglish", "inbound", None,
     ["namaste ji, ji", "ji, ji"], ["madad"]),
    # 21. "Namaskar," leading (Hinglish variant)
    (21, "Namaskar, main aapki baat sun raha hoon.", "Dev", "Trinetra", "hinglish", "inbound", None,
     ["namaste namaskar"], ["baat sun"]),
    # 22. "Jee" trailing stripped
    (22, "Bilkul, hum aapke liye ready hain, jee.", "Dev", "Trinetra", "hinglish", "inbound", None,
     ["namaste jee", "ji jee"], ["ready hain"]),
])
def test_greeting_fragment_stripping(
    case_id, dashboard, agent, biz, lang, direction, caller,
    expected_absent, expected_present
):
    greeting, _, _ = compose_single_opening_greeting(
        dashboard_greeting=dashboard,
        agent_name=agent,
        business_name=biz,
        caller_name=caller,
        direction=direction,
        language=lang,
        gender_tag=None,
    )
    g_lower = greeting.lower()

    # No double greetings
    assert not _has_double_greeting(greeting), \
        f"Case {case_id}: double greeting detected in: {greeting}"

    for absent in expected_absent:
        assert absent.lower() not in g_lower, \
            f"Case {case_id}: '{absent}' should have been stripped, got: {greeting}"

    for present in expected_present:
        assert present.lower() in g_lower, \
            f"Case {case_id}: '{present}' expected in remainder, got: {greeting}"
