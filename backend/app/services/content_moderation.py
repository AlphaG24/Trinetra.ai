import os
import json
import logging
from typing import Dict, Any, List
from groq import AsyncGroq
from database import supabase_admin
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ContentModeration:
    def __init__(self):
        self.groq_client = None
        self.api_key = os.getenv("GROQ_API_KEY")
        if self.api_key:
            self.groq_client = AsyncGroq(api_key=self.api_key)
        else:
            logger.warning("GROQ_API_KEY is not set. AI Moderation will be bypassed.")

    async def _get_banned_words(self) -> List[str]:
        try:
            response = supabase_admin.table('banned_words').select('word').execute()
            if hasattr(response, 'data') and response.data:
                return [row['word'].lower() for row in response.data]
            return []
        except Exception as e:
            logger.error(f"Failed to fetch banned words: {e}")
            return []

    async def check_content(self, text: str) -> Dict[str, Any]:
        result = {
            "is_clean": True,
            "violations": [],
            "severity": "none"
        }

        if not text or not text.strip():
            return result

        # 1. Check against banned words list
        banned_words = await self._get_banned_words()
        text_lower = text.lower()
        found_words = [word for word in banned_words if word in text_lower]
        
        if found_words:
            result["is_clean"] = False
            result["violations"].extend([f"Used banned word(s): {', '.join(found_words)}"])
            result["severity"] = "severe"  # Direct violation of hardcoded banned words is severe

        # 2. Use Groq to detect abusive/sexual/illegal content
        if self.groq_client:
            try:
                system_prompt = (
                    "You are a strict content moderation assistant. "
                    "Analyze the following text and determine if it contains abusive, sexual, illegal, or harmful language. "
                    "Respond ONLY with valid JSON in this exact format: "
                    '{"is_clean": bool, "violations": [list of strings], "severity": "none"|"mild"|"severe"}'
                )

                chat_completion = await self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Text to analyze: {text[:4000]}"}
                    ],
                    model=os.getenv("GROQ_LIGHT_LLM_MODEL", os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-20b")),
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )

                response_text = chat_completion.choices[0].message.content
                if response_text:
                    ai_result = json.loads(response_text)
                    
                    if not ai_result.get("is_clean", True):
                        result["is_clean"] = False
                        result["violations"].extend(ai_result.get("violations", []))
                        
                        ai_severity = ai_result.get("severity", "none")
                        # Escalate severity if AI found it worse
                        if ai_severity == "severe" or (ai_severity == "mild" and result["severity"] == "none"):
                            result["severity"] = ai_severity

            except Exception as e:
                logger.error(f"Groq moderation check failed: {e}")
        
        return result

    async def block_user(self, user_id: str, reason: str):
        try:
            # 1. Set profiles.is_blocked = true
            supabase_admin.table('profiles').update({'is_blocked': True}).eq('id', user_id).execute()
            
            # 2. Add to moderation logs
            supabase_admin.table('moderation_logs').insert({
                'user_id': user_id,
                'content_type': 'auto_block',
                'violation': reason,
                'severity': 'severe'
            }).execute()

            # 3. Create admin notification
            supabase_admin.table('notifications').insert({
                'title': 'User Blocked by Auto-Moderation',
                'message': f"User {user_id} was automatically blocked for: {reason}",
                'type': 'alert'
            }).execute()

            logger.info(f"User {user_id} blocked. Reason: {reason}")
        except Exception as e:
            logger.error(f"Failed to block user {user_id}: {e}")

    async def notify_admin(self, user_id: str, violation: str):
        try:
            supabase_admin.table('notifications').insert({
                'title': 'Content Moderation Alert',
                'message': f"User {user_id} triggered a moderation warning: {violation}",
                'type': 'warning'
            }).execute()
        except Exception as e:
            logger.error(f"Failed to notify admin for user {user_id}: {e}")

    async def evaluate_user_history(self, user_id: str, current_severity: str, current_violation: str):
        """
        Evaluate if user should be auto-blocked based on recent history or current severe violation.
        """
        try:
            if current_severity == "severe":
                await self.block_user(user_id, f"Severe violation: {current_violation}")
                return True

            if current_severity == "mild":
                # Check for 2+ mild violations in last 7 days
                seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
                
                # We need to query moderation logs for this user
                res = supabase_admin.table('moderation_logs').select('id').eq('user_id', user_id).eq('severity', 'mild').gte('created_at', seven_days_ago).execute()
                
                if hasattr(res, 'data') and len(res.data) >= 2: # Already had 2, or this is the 2nd
                    # But wait, this current one isn't logged yet when we call this.
                    # We usually log it right after this. If len >= 1 it means this is the 2nd.
                    if len(res.data) >= 1:
                        await self.block_user(user_id, "Repeated mild violations (2+ within 7 days).")
                        return True
                
                # Otherwise, just notify admin
                await self.notify_admin(user_id, current_violation)
                return False
                
        except Exception as e:
            logger.error(f"Failed to evaluate user history for {user_id}: {e}")
        return False
