"""
tests/test_a1d_gender_resolver.py

A1d: Gender resolver tests.
  1. Every voice in the Sarvam catalog resolves to a known gender (no untagged voices).
  2. Marathi gendered forms are correct (male/female/neutral).
  3. Scan test: fail if new hardcoded gendered verbs appear outside disclosure_service.py.

Staging branch only. Do not remove or relax these tests.
"""
import os
import re
import pytest
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent import SARVAM_MALE_VOICES, SARVAM_FEMALE_VOICES
from app.services.disclosure_service import resolve_agent_gender, resolve_gendered_phrases


# ---------------------------------------------------------------------------
# Catalog snapshots from disclosure_service.py (must stay in sync)
# ---------------------------------------------------------------------------
_DS_MALE = [
    "shubh", "aditya", "rahul", "rohan", "amit", "dev", "ratan", "varun",
    "manan", "sumit", "kabir", "aayan", "ashutosh", "advait", "anand",
    "tarun", "sunny", "mani", "gokul", "vijay", "mohit", "rehan", "soham",
    "arvind", "neel", "arjun", "amol"
]
_DS_FEMALE = [
    "aditi", "ritu", "priya", "neha", "pooja", "simran", "kavya", "ishita", "shreya",
    "roopa", "tanya", "shruti", "suhani", "kavitha", "rupali", "anushka", "manisha",
    "vidya", "arya", "abhilash", "karun", "hitesh", "amelia", "sophia", "diya", "meera",
    "pavithra", "sita", "radha", "leela", "maya", "shimmer", "alloy", "nova", "fable", "rachel",
    "domi", "bella", "elli", "sarah"
]


# ---------------------------------------------------------------------------
# 1. Every voice in the catalog resolves to the right gender
# ---------------------------------------------------------------------------
class TestCatalogMaleVoices:
    @pytest.mark.parametrize("voice", SARVAM_MALE_VOICES)
    def test_male_voice_resolves_to_male(self, voice):
        gender, source = resolve_agent_gender(voice=voice)
        assert gender == "male", (
            f"Voice '{voice}' should resolve to 'male' but got '{gender}' "
            f"(source: {source}). Add it to male_catalog in disclosure_service.py."
        )
        assert source == "voice_catalog"


class TestCatalogFemaleVoices:
    @pytest.mark.parametrize("voice", SARVAM_FEMALE_VOICES)
    def test_female_voice_resolves_to_female(self, voice):
        gender, source = resolve_agent_gender(voice=voice)
        assert gender == "female", (
            f"Voice '{voice}' should resolve to 'female' but got '{gender}' "
            f"(source: {source}). Add it to female_catalog in disclosure_service.py."
        )
        assert source == "voice_catalog"


class TestCatalogConsistency:
    def test_male_catalogs_are_in_sync(self):
        not_in_ds = [v for v in SARVAM_MALE_VOICES if v not in _DS_MALE]
        assert not not_in_ds, (
            f"Voices in agent.py SARVAM_MALE_VOICES missing from "
            f"disclosure_service.py male_catalog: {not_in_ds}"
        )

    def test_female_catalogs_are_in_sync(self):
        not_in_ds = [v for v in SARVAM_FEMALE_VOICES if v not in _DS_FEMALE]
        assert not not_in_ds, (
            f"Voices in agent.py SARVAM_FEMALE_VOICES missing from "
            f"disclosure_service.py female_catalog: {not_in_ds}"
        )

    def test_no_voice_appears_in_both_catalogs(self):
        overlap = set(SARVAM_MALE_VOICES) & set(SARVAM_FEMALE_VOICES)
        assert not overlap, (
            f"Voices appear in BOTH catalogs (impossible): {overlap}"
        )


# ---------------------------------------------------------------------------
# 2. Neutral + explicit priority tests
# ---------------------------------------------------------------------------
class TestNeutralFallback:
    def test_unknown_voice_returns_neutral(self):
        gender, source = resolve_agent_gender(voice="z_totally_unknown_xyz")
        assert gender == "neutral"
        assert source == "unresolved"

    def test_no_inputs_returns_neutral(self):
        gender, source = resolve_agent_gender()
        assert gender == "neutral"
        assert source == "unresolved"

    def test_guessed_gender_logged_as_guessed(self):
        gender, source = resolve_agent_gender(agent_name="Vikram")
        assert gender == "male"
        assert source == "guessed"

    def test_explicit_beats_voice(self):
        gender, source = resolve_agent_gender(gender="female", voice="shubh")
        assert gender == "female"
        assert source == "explicit"


# ---------------------------------------------------------------------------
# 3. Marathi gendered forms
# ---------------------------------------------------------------------------
class TestMarathiGenderedForms:
    def _g(self, tag):
        return resolve_gendered_phrases(gender=tag, language="mr")

    def test_male_v_bol_mr(self):
        assert self._g("male")["v_bol_mr"] == "बोलत आहे"

    def test_female_v_bol_mr(self):
        assert self._g("female")["v_bol_mr"] == "बोलत आहे"

    def test_male_v_samajh_mr(self):
        assert "शकतो" in self._g("male")["v_samajh_mr"]

    def test_female_v_samajh_mr(self):
        assert "शकते" in self._g("female")["v_samajh_mr"]

    def test_neutral_v_samajh_mr(self):
        assert "शकेन" in self._g("neutral")["v_samajh_mr"]

    def test_male_v_check_mr(self):
        assert self._g("male")["v_check_mr"] == "तपासतो"

    def test_female_v_check_mr(self):
        assert self._g("female")["v_check_mr"] == "तपासते"

    def test_male_v_respect_mr(self):
        assert self._g("male")["v_respect_mr"] == "आदर करतो"

    def test_female_v_respect_mr(self):
        assert self._g("female")["v_respect_mr"] == "आदर करते"

    def test_identity_confirmation_male_marathi(self):
        p = resolve_gendered_phrases(gender="male", language="mr", caller_name="Rahul")
        assert "बोलतो आहे" in p["identity_confirmation"]

    def test_identity_confirmation_female_marathi(self):
        p = resolve_gendered_phrases(gender="female", language="mr", caller_name="Priya")
        assert "बोलते आहे" in p["identity_confirmation"]

    def test_identity_confirmation_neutral_marathi(self):
        p = resolve_gendered_phrases(gender="neutral", language="mr", caller_name="Rahul")
        assert "बोलणे होत आहे" in p["identity_confirmation"]


# ---------------------------------------------------------------------------
# 4. Scan test: no new hardcoded gendered verbs outside the resolver
# ---------------------------------------------------------------------------
BACKEND_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)))

GENDERED_VERB_PATTERN = re.compile(
    r"(?:"
    r"\bbol\s+rahi\b"
    r"|\bbol\s+raha\b"
    r"|\brahi\s+hoon\b"
    r"|\braha\s+hoon\b"
    r"|\bkar\s+sakti\s+hoon\b"
    r"|\bkar\s+sakta\s+hoon\b"
    r"|\bcheck\s+karti\s+hoon\b"
    r"|\bcheck\s+karta\s+hoon\b"
    r"|\bkarti\s+hoon\b"
    r"|\bkarta\s+hoon\b"
    r"|\bchahti\s+hoon\b"
    r"|\bchahta\s+hoon\b"
    r"|\bkarungi\b"
    r"|\bkarunga\b"
    r"|\bkar\s+lungi\b"
    r"|\bkar\s+lunga\b"
    r")",
    re.IGNORECASE,
)

# Files allowed to contain gendered verb strings
ALLOWED_FILES = {
    "disclosure_service.py",           # single source of truth
    "test_single_opening_greeting.py", # checks output strings
    "test_a1d_gender_resolver.py",     # this file
    "test_a2_sensitive_detail_withholding.py", # checks output strings with identity prompts
    "test_a3_greeting_fragments.py",   # checks user dashboard greeting text
    "test_a4_opening_watchdog.py",     # checks playout watchdog scaling on sample greetings
    "test_prompt_guard_adversarial.py",
    "verify_all_agent_features.py",
    "agent.py",                        # LLM directives are negative-example strings or f-strings via resolver
    "voice_router.py",                 # TTS spelling guide only (not templates)
    "sample_revenue_extractions.py",
    "test_revenue_extractor.py",
}


def _is_exempt_line(line: str) -> bool:
    """True if the line is a comment, raw-string regex, or re.sub call."""
    stripped = line.strip()
    # Full-line comment
    if stripped.startswith("#"):
        return True
    # Regex operations
    for kw in ("re.sub(", "re.search(", "re.match(", "re.compile("):
        if kw in line:
            return True
    # Raw-string regex literals
    if ("r'" in line or 'r"' in line) and any(
        t in line for t in ("rahi", "raha", "sakti", "sakta", "karti", "karta")
    ):
        return True
    # Inline comment — strip the comment portion and re-check if the match
    # is only in the comment, not in the code
    if "#" in line:
        code_part = line[:line.index("#")]
        if not GENDERED_VERB_PATTERN.search(code_part):
            return True  # pattern only in comment, not in code
    return False


def _collect_violations():
    violations = []
    for root, dirs, files in os.walk(BACKEND_ROOT):
        dirs[:] = [d for d in dirs if d not in (".venv", "__pycache__", ".git", "node_modules")]
        for fname in files:
            if not fname.endswith(".py") or fname in ALLOWED_FILES:
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, encoding="utf-8", errors="replace") as fh:
                    for lineno, line in enumerate(fh, 1):
                        if _is_exempt_line(line) or not GENDERED_VERB_PATTERN.search(line):
                            continue
                        violations.append((fpath, lineno, line.rstrip()))
            except Exception:
                pass
    return violations


class TestNoNewHardcodedGenderedVerbs:
    """
    Fails if any .py file outside the resolver contains a hardcoded
    1st-person gendered verb in a template or f-string.
    Route new strings through resolve_gendered_phrases() instead.
    """

    def test_no_hardcoded_gendered_verbs_outside_resolver(self):
        violations = _collect_violations()
        if violations:
            detail = "\n".join(
                f"  {os.path.relpath(fp, BACKEND_ROOT)}:{ln}  =>  {txt}"
                for fp, ln, txt in violations[:25]
            )
            pytest.fail(
                f"Found {len(violations)} hardcoded gendered verb(s) outside resolver:\n"
                f"{detail}\n\n"
                "Fix: move string into resolve_gendered_phrases() and use the returned key."
            )

