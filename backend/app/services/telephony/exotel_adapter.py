import os
import uuid
import httpx
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone

from app.services.telephony.base import (
    AbstractTelephonyProvider, 
    DIDType, 
    NumberStatus, 
    AvailableNumber, 
    ProvisionedNumber
)
from database import supabase_admin

logger = logging.getLogger("ExotelAdapter")

def get_config_key(key_name: str) -> str | None:
    """Fetch key from system_config table first, fallback to env var."""
    try:
        res = supabase_admin.table("system_config").select("config_value").eq("config_key", key_name).single().execute()
        if res.data and res.data.get("config_value"):
            val = res.data["config_value"].strip()
            if val:
                return val
    except Exception:
        pass
    return os.getenv(key_name)

class ExotelAdapter(AbstractTelephonyProvider):
    def __init__(self):
        self.provider_name = "exotel"
        subdomain = get_config_key("EXOTEL_SUBDOMAIN") or "api.exotel.com"
        self.base_url = f"https://{subdomain.strip().rstrip('/')}/v1/Accounts"

    def _get_credentials(self) -> tuple[str, str, str]:
        account_sid = get_config_key("EXOTEL_ACCOUNT_SID")
        api_key = get_config_key("EXOTEL_API_KEY")
        api_token = get_config_key("EXOTEL_API_TOKEN")
        if not all([account_sid, api_key, api_token]):
            raise ValueError("Exotel credentials (ACCOUNT_SID, API_KEY, or API_TOKEN) missing from system_config/env")
        return account_sid, api_key, api_token

    async def list_available_numbers(self, city: Optional[str] = None, did_type: Optional[DIDType] = None) -> List[AvailableNumber]:
        """Exotel numbers are managed directly through the console or virtual numbers inventory."""
        caller_id = get_config_key("EXOTEL_CALLER_ID")
        if caller_id:
            return [AvailableNumber(
                did_id=f"exo-{uuid.uuid4().hex[:8]}",
                phone_number=caller_id,
                city=city or "India",
                area_code="IN",
                did_type=did_type or DIDType.MOBILE,
                provider="exotel",
                metadata={"caller_id": caller_id}
            )]
        return []

    async def provision_number(self, area_code: str, did_type: DIDType = DIDType.MOBILE, organization_id: str = "", phone_number: Optional[str] = None) -> ProvisionedNumber:
        caller_id = phone_number or get_config_key("EXOTEL_CALLER_ID") or "+918000000000"
        logger.info(f"Provisioned Exotel number {caller_id} for org {organization_id}")
        return ProvisionedNumber(
            trinetra_id=str(uuid.uuid4()),
            provider_number_id=f"EXO-{uuid.uuid4().hex[:8]}",
            phone_number=caller_id,
            city="India",
            area_code=area_code,
            did_type=did_type,
            status=NumberStatus.ACTIVE,
            provider="exotel",
            provisioned_at=datetime.now(timezone.utc),
            metadata={"caller_id": caller_id}
        )

    async def release_number(self, provider_number_id: str) -> bool:
        logger.info(f"[Exotel] Releasing number {provider_number_id}")
        return True

    async def get_number_status(self, provider_number_id: str) -> NumberStatus:
        return NumberStatus.ACTIVE

    async def create_call_routing(self, phone_number: str, organization_id: str) -> Dict:
        webhook_base = get_config_key("TRINETRA_WEBHOOK_BASE_URL") or os.getenv("TRINETRA_WEBHOOK_BASE_URL") or "http://localhost:8000"
        webhook_url = f"{webhook_base}/api/voice/webhooks/voice/exotel/{organization_id}"
        return {
            "routing_id": f"RT-EXO-{uuid.uuid4().hex[:8]}",
            "webhook_url": webhook_url,
            "status": "active"
        }

    async def create_outbound_session(self, agent_config: Dict) -> Dict:
        session_id = str(uuid.uuid4())
        short_id = session_id[:8]
        return {
            "session_id": session_id,
            "websocket_url": f"ws://127.0.0.1:7880/ws?session={short_id}",
            "bot_id": f"EXO-{short_id}",
            "outcome": "connected",
            "duration_seconds": 60
        }

    async def make_outbound_call(self, to_number: str, from_number: str, webhook_url: str, custom_parameters: Optional[dict] = None) -> dict:
        account_sid, api_key, api_token = self._get_credentials()
        
        # Clean destination number
        clean_to = to_number.strip()
        if clean_to.startswith("+"):
            clean_to = clean_to[1:]
            
        clean_from = from_number.strip() if from_number else (get_config_key("EXOTEL_CALLER_ID") or "")
        if clean_from.startswith("+"):
            clean_from = clean_from[1:]

        url = f"{self.base_url}/{account_sid}/Calls/connect.json"
        
        app_id = get_config_key("EXOTEL_APP_ID")
        effective_url = webhook_url
        if not effective_url and app_id:
            effective_url = f"http://my.exotel.com/{account_sid}/exoml/start_voice/{app_id}"

        payload = {
            "From": clean_to,
            "CallerId": clean_from,
            "CallType": "trans",
            "Record": "true"
        }
        if effective_url:
            payload["Url"] = effective_url

        if custom_parameters:
            if "agent_id" in custom_parameters:
                payload["CustomField"] = custom_parameters["agent_id"]

        auth = (api_key, api_token)

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, data=payload, auth=auth)
            if res.status_code not in [200, 201]:
                logger.error(f"Exotel outbound connect failed ({res.status_code}): {res.text}")
                raise RuntimeError(f"Exotel outbound connect failed: {res.text}")
            
            data = res.json()
            call_info = data.get("Call", {})
            call_sid = call_info.get("Sid")
            logger.info(f"Exotel call connected successfully: SID {call_sid}")
            return {
                "status": "success",
                "call_sid": call_sid,
                "provider": "exotel",
                "details": call_info
            }

    async def make_call(self, to_number: str, from_number: str, agent_config: dict) -> dict:
        webhook_url = agent_config.get("webhook_url", "")
        return await self.make_outbound_call(to_number, from_number, webhook_url, custom_parameters=agent_config)

    async def handle_inbound(self, call_sid: str, from_number: str) -> dict:
        return {
            "status": "success",
            "action": "connect_agent",
            "call_sid": call_sid
        }

    async def end_call(self, call_sid: str) -> dict:
        account_sid, api_key, api_token = self._get_credentials()
        url = f"{self.base_url}/{account_sid}/Calls/{call_sid}.json"
        payload = {"Status": "completed"}
        auth = (api_key, api_token)

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, data=payload, auth=auth)
            if res.status_code != 200:
                raise RuntimeError(f"Exotel end call failed: {res.text}")
            return res.json()

    async def get_recording(self, call_sid: str) -> str:
        account_sid, api_key, api_token = self._get_credentials()
        url = f"{self.base_url}/{account_sid}/Calls/{call_sid}.json"
        auth = (api_key, api_token)

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, auth=auth)
            if res.status_code != 200:
                raise RuntimeError(f"Exotel fetch call failed: {res.text}")
            data = res.json()
            call_info = data.get("Call", {})
            return call_info.get("RecordingUrl", "")

    async def validate_webhook_request(self, request_data: Dict, signature: str) -> bool:
        return True

    async def list_provisioned_numbers(self) -> list:
        caller_id = get_config_key("EXOTEL_CALLER_ID")
        return [caller_id] if caller_id else []
