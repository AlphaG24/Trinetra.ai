import os
import httpx
import logging
from app.services.telephony.base import TelephonyProvider
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

class ExotelAdapter(TelephonyProvider):
    def __init__(self):
        self.base_url = "https://api.exotel.com/v1/Accounts"

    async def provision_number(self, area_code: str) -> dict:
        # Exotel numbers are provisioned via the Exotel console or relationship managers for Indian CLI compliance.
        logger.info(f"Provisioning requested for Exotel CLI under area code: {area_code}")
        return {
            "status": "pending_manual_verification",
            "message": "Exotel Indian virtual number requests require physical address & GST verification."
        }

    async def make_call(self, to_number: str, from_number: str, agent_config: dict) -> dict:
        account_sid = get_config_key("EXOTEL_ACCOUNT_SID")
        api_key = get_config_key("EXOTEL_API_KEY")
        api_token = get_config_key("EXOTEL_API_TOKEN")

        if not all([account_sid, api_key, api_token]):
            raise ValueError("Exotel credentials (SID, Key, or Token) missing from system_config/env")

        # Exotel Outbound Connect Endpoint
        url = f"{self.base_url}/{account_sid}/Calls/connect.json"
        
        # Form Data payload
        payload = {
            "From": from_number,
            "To": to_number,
            "CallerId": from_number,
            "Url": agent_config.get("webhook_url", ""),
            "CallType": "trans",
            "Record": "true"
        }

        # Basic Auth using API Key and API Token
        auth = (api_key, api_token)

        async with httpx.AsyncClient() as client:
            res = await client.post(url, data=payload, auth=auth)
            if res.status_code not in [200, 201]:
                raise RuntimeError(f"Exotel outbound connect failed: {res.text}")
            
            data = res.json()
            call_info = data.get("Call", {})
            return {
                "status": "success",
                "call_sid": call_info.get("Sid"),
                "provider": "exotel"
            }

    async def handle_inbound(self, call_sid: str, from_number: str) -> dict:
        return {
            "status": "success",
            "action": "connect_agent",
            "call_sid": call_sid
        }

    async def end_call(self, call_sid: str) -> dict:
        account_sid = get_config_key("EXOTEL_ACCOUNT_SID")
        api_key = get_config_key("EXOTEL_API_KEY")
        api_token = get_config_key("EXOTEL_API_TOKEN")

        if not all([account_sid, api_key, api_token]):
            raise ValueError("Exotel credentials missing")

        url = f"{self.base_url}/{account_sid}/Calls/{call_sid}.json"
        payload = {"Status": "completed"}
        auth = (api_key, api_token)

        async with httpx.AsyncClient() as client:
            res = await client.post(url, data=payload, auth=auth)
            if res.status_code != 200:
                raise RuntimeError(f"Exotel end call failed: {res.text}")
            return res.json()

    async def get_recording(self, call_sid: str) -> str:
        account_sid = get_config_key("EXOTEL_ACCOUNT_SID")
        api_key = get_config_key("EXOTEL_API_KEY")
        api_token = get_config_key("EXOTEL_API_TOKEN")

        if not all([account_sid, api_key, api_token]):
            raise ValueError("Exotel credentials missing")

        url = f"{self.base_url}/{account_sid}/Calls/{call_sid}.json"
        auth = (api_key, api_token)

        async with httpx.AsyncClient() as client:
            res = await client.get(url, auth=auth)
            if res.status_code != 200:
                raise RuntimeError(f"Exotel fetch call failed: {res.text}")
            data = res.json()
            call_info = data.get("Call", {})
            return call_info.get("RecordingUrl", "")
