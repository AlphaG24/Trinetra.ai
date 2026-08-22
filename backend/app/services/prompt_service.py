"""
Prompt Service
==============
Loads and caches system prompts for different personality types.
Priority: in-memory cache → Supabase prompt_templates table → local .txt file fallback.

SAFETY RULES:
- This module is ONLY used when an agent has 2+ personalities enabled.
- Never modifies existing prompt .txt files (read-only).
- Falls back gracefully at every level — never raises to caller.
"""

import asyncio
import logging
import os
from typing import Dict, Optional

logger = logging.getLogger("prompt-service")

# Maps personality type → local .txt fallback filename
PROMPT_FILE_MAP: Dict[str, str] = {
    "sales": "sales_agent.txt",
    "support": "support_agent.txt",
    "appointment": "appointment_agent.txt",
    "lead_qualifier": "lead_qualifier.txt",
    "general": "vikram_sharma.txt",
}

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "prompts")


class PromptService:
    """
    Loads and manages system prompts for different personality types.
    Uses a simple in-process cache that persists for the lifetime of the worker process.
    Admin edits to prompt_templates are picked up after process restart or explicit invalidation.
    """

    def __init__(self, supabase_client):
        self._supabase = supabase_client
        self._cache: Dict[str, str] = {}

    async def get_prompt(self, personality_type: str) -> str:
        """
        Get the system prompt for a personality type.

        Resolution order:
        1. In-memory cache (fastest, per-process)
        2. Supabase prompt_templates table (admin-managed)
        3. Local .txt file (never-fail fallback)

        Args:
            personality_type: One of 'sales', 'support', 'appointment', 'lead_qualifier', 'general'

        Returns:
            The system prompt string. Never raises.
        """
        # 1. Cache hit
        if personality_type in self._cache:
            return self._cache[personality_type]

        # 2. Try Supabase
        db_prompt = await self._fetch_from_db(personality_type)
        if db_prompt:
            self._cache[personality_type] = db_prompt
            return db_prompt

        # 3. Fallback to local file
        file_prompt = self._load_from_file(personality_type)
        self._cache[personality_type] = file_prompt
        return file_prompt

    async def _fetch_from_db(self, personality_type: str) -> Optional[str]:
        """Fetch prompt from Supabase prompt_templates table. Returns None on any failure."""
        try:
            result = await asyncio.to_thread(
                self._supabase.table("prompt_templates")
                .select("system_prompt")
                .eq("personality_type", personality_type)
                .eq("is_active", True)
                .single()
                .execute
            )
            if result.data and result.data.get("system_prompt"):
                logger.debug(f"[PromptService] Loaded '{personality_type}' from Supabase")
                return result.data["system_prompt"]
        except Exception as e:
            logger.warning(
                f"[PromptService] Could not fetch '{personality_type}' from DB (will use file): {e}"
            )
        return None

    def _load_from_file(self, personality_type: str) -> str:
        """
        Load prompt from backend/prompts/ directory (read-only, never modifies files).
        Returns a minimal inline fallback if the file is not found.
        """
        filename = PROMPT_FILE_MAP.get(personality_type, "vikram_sharma.txt")
        path = os.path.normpath(os.path.join(PROMPTS_DIR, filename))
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                logger.debug(
                    f"[PromptService] Loaded '{personality_type}' from file: {filename}"
                )
                return content
        except Exception as e:
            logger.warning(
                f"[PromptService] Could not load file '{filename}' for '{personality_type}': {e}"
            )
            # Absolute last resort — inline minimal prompt
            return f"You are a helpful AI assistant handling a {personality_type} inquiry. Be professional, concise, and helpful."

    def invalidate_cache(self, personality_type: Optional[str] = None) -> None:
        """
        Invalidate the cache so the next call re-fetches from DB.
        If personality_type is None, clears all cache entries.
        """
        if personality_type:
            self._cache.pop(personality_type, None)
            logger.info(f"[PromptService] Cache invalidated for '{personality_type}'")
        else:
            self._cache.clear()
            logger.info("[PromptService] Full cache cleared")

    def inject_business_context(
        self, base_prompt: str, agent_data: dict, personality_style: str = ""
    ) -> str:
        """
        Inject business context (company name, agent name, personality style, etc.)
        into a base prompt by replacing template placeholders.

        Args:
            base_prompt: The raw prompt from DB or file.
            agent_data: The agent row from Supabase.
            personality_style: The personality style suffix (professional/friendly/etc.)

        Returns:
            The prompt with placeholders replaced and business context appended.
        """
        import re

        # Replace placeholders
        agent_name = agent_data.get("name", "Agent")
        # Remove [slug] prefix and - Demo / - Trial suffix
        agent_name = re.sub(r"^\[[^\]]+\]\s*", "", agent_name)
        agent_name = re.sub(r"\s*-\s*(Demo|Trial)\s*$", "", agent_name, flags=re.IGNORECASE)

        # Company name comes from the agent's system_prompt context (already injected upstream)
        prompt = base_prompt.replace("{{agent_name}}", agent_name)
        prompt = prompt.replace("{agentName}", agent_name)

        # Append personality style suffix if provided
        if personality_style:
            prompt += personality_style

        return prompt
