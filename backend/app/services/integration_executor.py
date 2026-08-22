import httpx
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from datetime import datetime
from database import supabase_admin

logger = logging.getLogger("integration-executor")
logger.setLevel(logging.INFO)

class IntegrationExecutor:
    def __init__(self):
        pass

    def _replace_placeholders(self, template: str, data: dict) -> str:
        if not template:
            return ""
        result = template
        for key, val in data.items():
            result = result.replace(f"{{{{{key}}}}}", str(val if val is not None else ""))
        return result

    async def _get_agent_integrations(self, agent_id: str):
        try:
            # Fetch connected integrations for this agent
            res = await asyncio.to_thread(
                supabase_admin.table("agent_integrations")
                .select("*, integration_types(*)")
                .eq("agent_id", agent_id)
                .eq("is_connected", True)
                .execute
            )
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching agent integrations: {e}")
            return []

    async def on_lead_captured(self, agent_id: str, lead_data: dict):
        logger.info(f"Triggering lead captured integrations for agent {agent_id}")
        integrations = await self._get_agent_integrations(agent_id)
        for integration in integrations:
            itype = integration.get("integration_types") or {}
            slug = itype.get("slug")
            config = integration.get("config") or {}
            
            # Check trigger settings
            triggers = config.get("event_triggers", {})
            if not triggers.get("lead_captured", True):
                continue
                
            await self._dispatch(slug, "lead_captured", config, lead_data)

    async def on_call_completed(self, agent_id: str, call_data: dict):
        logger.info(f"Triggering call completed integrations for agent {agent_id}")
        integrations = await self._get_agent_integrations(agent_id)
        for integration in integrations:
            itype = integration.get("integration_types") or {}
            slug = itype.get("slug")
            config = integration.get("config") or {}
            
            # Check trigger settings
            triggers = config.get("event_triggers", {})
            if not triggers.get("call_completed", True):
                continue
                
            await self._dispatch(slug, "call_completed", config, call_data)

    async def on_callback_scheduled(self, agent_id: str, callback_data: dict):
        logger.info(f"Triggering callback scheduled integrations for agent {agent_id}")
        integrations = await self._get_agent_integrations(agent_id)
        for integration in integrations:
            itype = integration.get("integration_types") or {}
            slug = itype.get("slug")
            config = integration.get("config") or {}
            
            # Check trigger settings
            triggers = config.get("event_triggers", {})
            if not triggers.get("callback_scheduled", True):
                continue
                
            await self._dispatch(slug, "callback_scheduled", config, callback_data)

    async def _dispatch(self, slug: str, event_type: str, config: dict, data: dict):
        try:
            # Merge event_type into template context
            context = {**data, "event_type": event_type}
            
            # Ensure friendly formatting of basic placeholder defaults
            if "contact_name" not in context:
                context["contact_name"] = context.get("prospect_name", "Unknown")
            if "contact_phone" not in context:
                context["contact_phone"] = context.get("prospect_phone", "")
            
            # Retrieve custom template or default to a standard placeholder string
            template = config.get("message_template") or ""
            if not template:
                if slug == "telegram":
                    template = "🔔 *Trinetra Alert*: {{event_type}}\nProspect: {{contact_name}} ({{contact_phone}})\nSummary: {{call_summary}}"
                elif slug == "smtp-email":
                    template = "<h3>Trinetra AI Notification</h3><p>Event: <strong>{{event_type}}</strong></p><p>Prospect: {{contact_name}} ({{contact_phone}})</p><p>Summary: {{call_summary}}</p>"
                else:
                    template = "Trinetra AI Event Alert: {{event_type}} - {{contact_name}} ({{contact_phone}})"
                    
            formatted_msg = self._replace_placeholders(template, context)
            
            if slug == "telegram":
                await self._send_telegram(config, formatted_msg)
            elif slug == "webhook":
                await self._send_webhook(config, event_type, formatted_msg, data)
            elif slug == "smtp-email":
                await self._send_email(config, event_type, formatted_msg, data)
            elif slug == "whatsapp":
                await self._send_whatsapp(config, formatted_msg)
        except Exception as e:
            logger.error(f"Failed to dispatch integration {slug} for event {event_type}: {e}")

    async def _send_telegram(self, config: dict, message: str):
        token = config.get("telegram_bot_token")
        chat_id = config.get("telegram_chat_id")
        if not token or not chat_id:
            logger.warning("Telegram bot token or chat ID is missing in config.")
            return
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown"
            })
            if res.status_code != 200:
                logger.error(f"Telegram API error: {res.text}")

    async def _send_whatsapp(self, config: dict, message: str):
        phone_id = config.get("whatsapp_phone_id")
        token = config.get("whatsapp_access_token")
        logger.info(f"WhatsApp mock dispatch: phone_id={phone_id}, message={message[:100]}")

    async def _send_webhook(self, config: dict, event_type: str, message: str, data: dict):
        url = config.get("webhook_url")
        if not url:
            logger.warning("Webhook URL is missing in config.")
            return
        payload = {
            "event": event_type,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        headers = {}
        secret = config.get("webhook_secret")
        if secret:
            headers["X-Trinetra-Signature"] = secret
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=10.0)
            if res.status_code not in (200, 201, 204):
                logger.error(f"Webhook HTTP error status={res.status_code} response={res.text}")

    async def _send_email(self, config: dict, event_type: str, message: str, data: dict):
        host = config.get("smtp_host")
        port = int(config.get("smtp_port") or 587)
        username = config.get("smtp_username")
        password = config.get("smtp_password")
        to_email = config.get("notification_email") or data.get("contact_email")
        
        if not (host and username and password and to_email):
            logger.warning("SMTP configuration is incomplete. Skipping email send.")
            return
            
        sender_name = config.get("sender_display_name", "Trinetra AI Alerts")
        reply_to = config.get("reply_to")
        
        subject = f"Trinetra AI: New {event_type.replace('_', ' ').title()}"
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{username}>"
        msg["To"] = to_email
        if reply_to:
            msg["Reply-To"] = reply_to
            
        part = MIMEText(message, "html")
        msg.attach(part)
        
        def send_sync():
            with smtplib.SMTP(host, port) as server:
                server.starttls()
                server.login(username, password)
                server.sendmail(username, to_email, msg.as_string())
                
        await asyncio.to_thread(send_sync)
        logger.info(f"Notification email successfully sent to {to_email}")
