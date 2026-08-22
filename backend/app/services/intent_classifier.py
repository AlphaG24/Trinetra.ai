"""
Intent Classifier Service
=========================
Classifies user speech into one of the enabled personality types using Groq LLM.

SAFETY RULES:
- This module is ONLY imported and used when an agent has 2+ personalities enabled.
- All classification is wrapped in try/except with a 500ms timeout.
- Any failure → returns 'general' (or first enabled personality) as safe fallback.
- Never raises exceptions to the caller.
"""

import asyncio
import logging
import os
from typing import Dict

import httpx

logger = logging.getLogger("intent-classifier")

SUPPORTED_INTENTS = ['sales', 'support', 'appointment', 'lead_qualifier', 'general']

CLASSIFICATION_TIMEOUT_SECONDS = 0.5  # Hard 500ms timeout per spec


class IntentClassifier:
    """Classifies user speech into one of the enabled personality types."""

    def __init__(self):
        self._groq_api_key = os.getenv("GROQ_API_KEY", "")

    async def classify(
        self,
        user_message: str,
        enabled_personalities: Dict[str, bool],
        conversation_context: str = "",
    ) -> str:
        """
        Classify user intent based on message and conversation context.

        Args:
            user_message: The latest utterance from the user.
            enabled_personalities: Dict mapping personality type → bool (from agent.personalities JSONB).
            conversation_context: Concatenated recent transcript for context (last ~500 chars used).

        Returns:
            One of SUPPORTED_INTENTS that is enabled for this agent.
            Falls back to 'general' or first enabled personality on any failure.
        """
        if not user_message or not user_message.strip():
            return self._fallback(enabled_personalities)

        # Only classify if 2+ personalities are enabled (caller ensures this, but double-check)
        enabled_list = [k for k, v in enabled_personalities.items() if v and k in SUPPORTED_INTENTS]
        if len(enabled_list) < 2:
            return enabled_list[0] if enabled_list else "general"

        try:
            intent = await asyncio.wait_for(
                self._call_groq(user_message, enabled_personalities, conversation_context),
                timeout=CLASSIFICATION_TIMEOUT_SECONDS,
            )
            return intent
        except asyncio.TimeoutError:
            logger.warning(
                f"[IntentClassifier] Timeout after {CLASSIFICATION_TIMEOUT_SECONDS}s — using fallback"
            )
            return self._fallback(enabled_personalities)
        except Exception as e:
            logger.warning(f"[IntentClassifier] Classification error (falling back): {e}")
            return self._fallback(enabled_personalities)

    async def _call_groq(
        self,
        user_message: str,
        enabled_personalities: Dict[str, bool],
        conversation_context: str,
    ) -> str:
        """Make a Groq API call to classify intent. Returns a valid intent string."""
        enabled_list = [k for k, v in enabled_personalities.items() if v and k in SUPPORTED_INTENTS]
        enabled_str = ", ".join(enabled_list)

        prompt = f"""You are an intent classifier for a voice AI agent. Based on the user's message and conversation context, determine the user's primary intent.

Conversation context (last few exchanges):
{conversation_context[-500:] if conversation_context else "No previous context"}

User's latest message:
"{user_message}"

Classify the intent into exactly ONE of these ENABLED categories for this agent: {enabled_str}

Category definitions:
- sales: User is interested in buying, pricing, product features, comparisons, or wants to purchase
- support: User needs help, has a problem, complaint, technical issue, or wants assistance
- appointment: User wants to book, reschedule, or cancel an appointment/meeting/callback
- lead_qualifier: User is a new inquiry, asking general questions, seems like a potential lead but unclear intent
- general: Casual conversation, greetings, or doesn't fit any specific category

Respond with ONLY one word from the enabled list above. No explanation. No punctuation."""

        async with httpx.AsyncClient(timeout=0.45) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self._groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 10,
                },
            )
            res.raise_for_status()
            data = res.json()

        raw = data["choices"][0]["message"]["content"].strip().lower()

        # Sanitize — strip punctuation just in case
        import re
        raw = re.sub(r"[^a-z_]", "", raw)

        # Validate — must be one of the enabled personalities
        if raw in enabled_personalities and enabled_personalities.get(raw, False):
            return raw

        # If classified intent is not enabled, fallback to first enabled or general
        return self._fallback(enabled_personalities)

    @staticmethod
    def _fallback(enabled_personalities: Dict[str, bool]) -> str:
        """Return the first enabled personality, or 'general'."""
        for intent in SUPPORTED_INTENTS:
            if enabled_personalities.get(intent, False):
                return intent
        return "general"
