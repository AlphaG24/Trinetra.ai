from datetime import datetime
import httpx
import logging
from database import supabase_admin

logger = logging.getLogger("IntegrationService")

class IntegrationService:
    """Manages integration connections and actions"""
    
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client or supabase_admin
    
    async def get_available_integrations(self) -> list:
        """Get all active integration types"""
        result = await self.supabase.table("integration_types") \
            .select("*").eq("is_active", True).execute()
        return result.data
    
    async def get_agent_integrations(self, agent_id: str) -> list:
        """Get integrations configured for an agent"""
        result = await self.supabase.table("agent_integrations") \
            .select("*, integration_types!inner(*)") \
            .eq("agent_id", agent_id).execute()
        return result.data
    
    async def connect_integration(self, agent_id: str, org_id: str, integration_type_id: str, config: dict) -> dict:
        """Connect an integration to an agent"""
        # Upsert the integration config
        result = await self.supabase.table("agent_integrations").upsert({
            "agent_id": agent_id,
            "organization_id": org_id,
            "integration_type_id": integration_type_id,
            "config": config,
            "is_connected": True,
            "connected_at": datetime.utcnow().isoformat(),
            "status": "connected"
        }).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return {}
    
    async def disconnect_integration(self, integration_id: str):
        """Disconnect an integration"""
        await self.supabase.table("agent_integrations").update({
            "is_connected": False,
            "status": "disconnected"
        }).eq("id", integration_id).execute()
    
    async def test_connection(self, slug: str, config: dict) -> dict:
        """Validate credentials without persisting"""
        if slug == "telegram":
            bot_token = config.get("telegram_bot_token")
            chat_id = config.get("telegram_chat_id")
            if not bot_token:
                return {"success": False, "error": "Bot token is required"}
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(f"https://api.telegram.org/bot{bot_token}/getMe")
                    if resp.status_code == 200 and resp.json().get("ok"):
                        # If chat_id is provided, try to send a test message as well
                        if chat_id:
                            test_msg = "🔔 Trinetra AI Integration Test Success! Your Telegram alerts are now connected."
                            await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                                "chat_id": chat_id,
                                "text": test_msg
                            })
                        return {"success": True, "message": "Telegram connection verified successfully!"}
                    return {"success": False, "error": resp.json().get("description") or "Invalid bot token"}
            except Exception as e:
                return {"success": False, "error": f"Failed to connect to Telegram: {str(e)}"}
        
        elif slug == "webhook":
            webhook_url = config.get("webhook_url")
            if not webhook_url:
                return {"success": False, "error": "Webhook URL is required"}
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(webhook_url, json={
                        "event": "test_ping",
                        "message": "Trinetra Integration Test"
                    }, timeout=5.0)
                    if resp.status_code >= 200 and resp.status_code < 300:
                        return {"success": True, "message": "Webhook test ping succeeded!"}
                    return {"success": False, "error": f"Webhook returned status code {resp.status_code}"}
            except Exception as e:
                return {"success": False, "error": f"Failed to contact webhook: {str(e)}"}

        elif slug == "smtp-email":
            host = config.get("smtp_host")
            port = config.get("smtp_port")
            username = config.get("smtp_username")
            password = config.get("smtp_password")
            if not all([host, port, username, password]):
                return {"success": False, "error": "All SMTP credentials are required"}
            return {"success": True, "message": "SMTP credentials format verified (connection simulated)"}

        elif slug == "whatsapp":
            twilio_sid = config.get("twilio_sid")
            auth_token = config.get("auth_token")
            from_number = config.get("phone_number") or config.get("from_number") or config.get("from")
            target_phone = config.get("target_phone")
            if twilio_sid and auth_token:
                try:
                    async with httpx.AsyncClient() as client:
                        # 1. Verify Twilio account credentials
                        resp = await client.get(
                            f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}.json",
                            auth=(twilio_sid, auth_token),
                            timeout=6.0
                        )
                        if resp.status_code == 401:
                            return {"success": False, "error": "Authentication failed: Invalid Twilio Account SID or Auth Token."}
                        elif resp.status_code != 200:
                            return {"success": False, "error": f"Twilio returned status {resp.status_code}"}

                        # 2. If target_phone and from_number provided, send actual test message
                        if target_phone and from_number:
                            import re
                            def clean_num(n):
                                c = re.sub(r'[^\d+]', '', str(n).replace("whatsapp:", ""))
                                if not c.startswith('+'):
                                    c = '+91' + c if len(c) == 10 else '+' + c
                                return f"whatsapp:{c}"

                            from_w = clean_num(from_number)
                            to_w = clean_num(target_phone)
                            post_url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
                            msg_resp = await client.post(
                                post_url,
                                auth=(twilio_sid, auth_token),
                                data={
                                    "From": from_w,
                                    "To": to_w,
                                    "Body": "🔔 Trinetra AI WhatsApp Test: Your Twilio WhatsApp integration is active and working successfully!"
                                },
                                timeout=10.0
                            )
                            if msg_resp.status_code in (200, 201):
                                msg_data = msg_resp.json()
                                return {"success": True, "message": f"Test WhatsApp message sent successfully! Twilio SID: {msg_data.get('sid')}"}
                            else:
                                err_info = msg_resp.json() if msg_resp.headers.get("content-type", "").startswith("application/json") else {}
                                err_msg = err_info.get("message") or msg_resp.text
                                return {"success": False, "error": f"Twilio dispatch failed: {err_msg}"}

                        return {"success": True, "message": "Twilio WhatsApp account credentials verified successfully!"}
                except Exception as e:
                    return {"success": False, "error": f"Failed to verify Twilio credentials: {str(e)}"}

            phone_id = config.get("whatsapp_phone_id")
            token = config.get("whatsapp_access_token")
            if not phone_id or not token:
                return {"success": False, "error": "Twilio SID & Auth Token (or Meta Phone ID & Access Token) are required"}
            return {"success": True, "message": "WhatsApp credentials format verified"}

        elif slug == "google-calendar":
            client_id = config.get("google_client_id")
            client_secret = config.get("google_client_secret")
            refresh_token = config.get("google_refresh_token")
            if not all([client_id, client_secret, refresh_token]):
                return {"success": False, "error": "Google Client ID, Secret, and Refresh Token are required"}
            return {"success": True, "message": "Google Calendar credentials format verified"}

        elif slug == "zoho-crm":
            client_id = config.get("zoho_client_id")
            client_secret = config.get("zoho_client_secret")
            refresh_token = config.get("zoho_refresh_token")
            if not all([client_id, client_secret, refresh_token]):
                return {"success": False, "error": "Zoho Client ID, Secret, and Refresh Token are required"}
            return {"success": True, "message": "Zoho CRM credentials format verified"}

        elif slug == "salesforce":
            client_id = config.get("salesforce_client_id")
            client_secret = config.get("salesforce_client_secret")
            token = config.get("salesforce_security_token")
            url = config.get("salesforce_instance_url")
            if not all([client_id, client_secret, token, url]):
                return {"success": False, "error": "Salesforce Client ID, Secret, Token, and URL are required"}
            return {"success": True, "message": "Salesforce credentials format verified"}
        
        elif slug in ("calendar", "cal.com"):
            api_key = config.get("cal_api_key") or config.get("apiKey")
            event_type_id = config.get("event_type_id") or config.get("eventTypeId")
            if not api_key:
                return {"success": False, "error": "Cal.com API key is required"}
            try:
                headers = {"Authorization": f"Bearer {api_key}"}
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://api.cal.com/v2/event-types",
                        headers=headers,
                        timeout=10.0
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        groups = data.get("data", {}).get("eventTypeGroups", [])
                        event_types = []
                        for g in groups:
                            event_types.extend(g.get("eventTypes", []))

                        msg = f"Cal.com connection verified successfully! Found {len(event_types)} event type(s)."
                        if event_type_id:
                            matched_et = next((et for et in event_types if str(et.get("id")) == str(event_type_id) or str(et.get("slug")) == str(event_type_id)), None)
                            if matched_et:
                                msg += f" Event type '{matched_et.get('title', event_type_id)}' (ID: {matched_et.get('id')}) is valid."
                            else:
                                available_desc = ", ".join(f"{et.get('title')} (ID: {et.get('id')})" for et in event_types[:4])
                                msg += f" (Note: Event Type ID '{event_type_id}' was not found. Available: {available_desc})."
                        return {"success": True, "message": msg}
                    elif resp.status_code in (401, 403):
                        return {"success": False, "error": "Authentication failed: Invalid Cal.com API key."}
                    else:
                        return {"success": False, "error": f"Cal.com returned status code {resp.status_code}"}
            except Exception as e:
                return {"success": False, "error": f"Failed to contact Cal.com: {str(e)}"}

        return {"success": False, "error": f"Testing not supported for integration type: {slug}"}

    async def send_telegram_notification(self, agent_id: str, message: str):
        """Send a Telegram notification for an agent"""
        integration = await self._get_connected(agent_id, "telegram")
        if integration:
            bot_token = integration["config"].get("telegram_bot_token")
            chat_id = integration["config"].get("telegram_chat_id")
            if bot_token and chat_id:
                try:
                    async with httpx.AsyncClient() as client:
                        await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                            "chat_id": chat_id,
                            "text": message,
                            "parse_mode": "HTML"
                        })
                except Exception as e:
                    logger.error(f"Failed to dispatch Telegram alert: {str(e)}")
    
    async def _get_connected(self, agent_id: str, integration_slug: str):
        """Get a connected integration by slug"""
        result = await self.supabase.table("agent_integrations") \
            .select("*, integration_types!inner(*)") \
            .eq("agent_id", agent_id) \
            .eq("integration_types.slug", integration_slug) \
            .eq("is_connected", True).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
