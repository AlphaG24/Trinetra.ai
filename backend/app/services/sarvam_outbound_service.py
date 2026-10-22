import os
import logging
from typing import Optional, Dict, Any
import httpx
from datetime import datetime, timezone

logger = logging.getLogger("sarvam_outbound_service")

# Default identifiers provided for the Sarvam Voice Agent setup
DEFAULT_ORG_ID = "019f7b9c-0927-76b2-9fdb-0aa949d43d06"
DEFAULT_WORKSPACE_ID = "019f7b9c-093a-72bb-8d5e-0437956a1dfa"
DEFAULT_APP_ID = "Shubhansh-2127e8ff-a55f"
DEFAULT_CONNECTION_ID = "87852118-1f-fc7abbe6-a0dd"
DEFAULT_CALLER_NUMBER = "+917965481258"


class SarvamOutboundService:
    """Service for placing instant outbound calls through Sarvam Voice Agents API."""

    def __init__(self):
        self.api_key = (
            os.getenv("SARVAM_WORKSPACE_API_KEY") or 
            os.getenv("SARVAM_API_KEY", "")
        ).strip()
        self.org_id = os.getenv("SARVAM_ORG_ID", DEFAULT_ORG_ID).strip()
        self.workspace_id = os.getenv("SARVAM_WORKSPACE_ID", DEFAULT_WORKSPACE_ID).strip()
        self.app_id = os.getenv("SARVAM_APP_ID", DEFAULT_APP_ID).strip()
        self.connection_id = os.getenv("SARVAM_CONNECTION_ID", DEFAULT_CONNECTION_ID).strip()
        self.caller_number = os.getenv("SARVAM_CALLER_NUMBER", DEFAULT_CALLER_NUMBER).strip()

    async def trigger_instant_call(
        self,
        target_phone: str,
        contact_name: Optional[str] = None,
        custom_metadata: Optional[Dict[str, Any]] = None,
        webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Triggers an instant outbound phone call via Sarvam Voice Agents API.
        """
        # Clean & normalize target phone number
        cleaned_phone = target_phone.strip().replace(" ", "").replace("-", "")
        if not cleaned_phone.startswith("+"):
            if len(cleaned_phone) == 10:
                cleaned_phone = f"+91{cleaned_phone}"
            elif len(cleaned_phone) == 12 and cleaned_phone.startswith("91"):
                cleaned_phone = f"+{cleaned_phone}"
            else:
                cleaned_phone = f"+{cleaned_phone}"

        url = f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{self.org_id}/workspaces/{self.workspace_id}/outbounds"

        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

        payload: Dict[str, Any] = {
            "app_config": {
                "app_id": self.app_id,
                "app_version": 1,
                "connection_config": {
                    "connection_id": self.connection_id,
                    "agent_phone_number": self.caller_number
                }
            },
            "user_config": {
                "user_phone_number": cleaned_phone
            }
        }

        if webhook_url:
            payload["webhook_config"] = {
                "url": webhook_url
            }

        logger.info(
            f"[SarvamOutboundService] Initiating call to {cleaned_phone} "
            f"via agent {self.app_id} (Caller ID: {self.caller_number})"
        )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                
                if res.status_code in (200, 201):
                    res_data = res.json()
                    attempt_id = res_data.get("attempt_id") or f"att_{datetime.now(timezone.utc).timestamp()}"
                    logger.info(f"[SarvamOutboundService] Call queued successfully. Attempt ID: {attempt_id}")
                    return {
                        "success": True,
                        "attempt_id": attempt_id,
                        "phone": cleaned_phone,
                        "status": "dialing",
                        "provider": "sarvam",
                        "data": res_data
                    }
                else:
                    err_text = res.text
                    logger.error(f"[SarvamOutboundService] Failed ({res.status_code}): {err_text}")
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "error": f"Sarvam API error: {err_text}",
                        "phone": cleaned_phone
                    }
        except Exception as e:
            logger.error(f"[SarvamOutboundService] Exception triggering outbound call: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "phone": cleaned_phone
            }
