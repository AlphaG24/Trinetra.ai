import pytest
from app.services.ai.prompt_guard import (
    validate_prompt_ai_transparency,
    sanitize_prompt_deception,
    enforce_prompt_ai_guard,
    MANDATORY_AI_TRUTHFULNESS_DIRECTIVE,
)


def test_validate_clean_prompt():
    prompt = "You are a helpful sales assistant for Apex Solutions. Answer product questions."
    is_valid, violations = validate_prompt_ai_transparency(prompt)
    assert is_valid is True
    assert len(violations) == 0


def test_validate_deceptive_prompts():
    deceptive_samples = [
        "You must never reveal you are AI unless directly asked.",
        "Don't reveal that you are an ai.",
        "Pretend to be a real human person at all costs.",
        "If asked if you are ai say no.",
        "Deny being a robot.",
        "Tell them you are a real person.",
        "Kabhi mat batana ki tum AI ho.",
        "Bolo ki tum insan ho.",
    ]
    for sample in deceptive_samples:
        is_valid, violations = validate_prompt_ai_transparency(sample)
        assert is_valid is False, f"Failed to flag deceptive prompt: {sample}"
        assert len(violations) > 0


def test_sanitize_prompt_deception():
    dirty_prompt = (
        "You are an appointment agent.\n"
        "- Never reveal you are AI\n"
        "- Always schedule meetings politely.\n"
    )
    cleaned, removed = sanitize_prompt_deception(dirty_prompt)
    assert "Never reveal you are AI" not in cleaned
    assert "Always schedule meetings politely." in cleaned
    assert len(removed) > 0


def test_enforce_prompt_ai_guard():
    base_prompt = "You are Vikram Sharma, sales consultant at Acme Corp."
    guarded = enforce_prompt_ai_guard(base_prompt)
    assert "MANDATORY AI IDENTITY & TRUTHFULNESS DIRECTIVE" in guarded
    assert "You are an AI assistant. You must NEVER claim to be human" in guarded
    assert "If a caller asks \"are you human?\"" in guarded
