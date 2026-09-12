import httpx
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import hashlib
import json
import os
import re
from datetime import datetime
from database import supabase_admin
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger("integration-executor")
logger.setLevel(logging.INFO)

SECRET_SEED = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 'default-secret-key-seed-value'
ENCRYPTION_KEY = hashlib.sha256(SECRET_SEED.encode('utf-8')).digest()

def decrypt_val(encrypted_text: str) -> str:
    if not encrypted_text or not isinstance(encrypted_text, str):
        return ""
    try:
        parts = encrypted_text.split(':')
        if len(parts) != 2:
            return ""
        iv = bytes.fromhex(parts[0])
        ciphertext = bytes.fromhex(parts[1])
        cipher = Cipher(algorithms.AES(ENCRYPTION_KEY), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded = decryptor.update(ciphertext) + decryptor.finalize()
        pad_len = padded[-1]
        if pad_len > 16 or pad_len < 1:
            return ""
        return padded[:-pad_len].decode('utf-8')
    except Exception:
        return ""

def format_whatsapp_number(num: str) -> str:
    if not num:
        return ""
    s = str(num).strip()
    if s.startswith("whatsapp:"):
        s = s.replace("whatsapp:", "")
    cleaned = re.sub(r'[^\d+]', '', s)
    if not cleaned.startswith('+'):
        if len(cleaned) == 10:
            cleaned = '+91' + cleaned
        elif len(cleaned) == 12 and cleaned.startswith('91'):
            cleaned = '+' + cleaned
        else:
            cleaned = '+' + cleaned
    return f"whatsapp:{cleaned}"

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

    async def _get_agent_integrations(self, agent_id: str, org_id: str = None, user_id: str = None):
        integrations_list = []
        try:
            # 1. Fetch connected agent-specific integrations
            if agent_id:
                res = await asyncio.to_thread(
                    supabase_admin.table("agent_integrations")
                    .select("*, integration_types(*)")
                    .eq("agent_id", agent_id)
                    .eq("is_connected", True)
                    .execute
                )
                integrations_list.extend(res.data or [])
        except Exception as e:
            logger.error(f"Error fetching agent integrations: {e}")

        # 2. Fetch global account integrations from the `integrations` table
        try:
            query = supabase_admin.table("integrations").select("*")
            if org_id:
                query = query.eq("organization_id", org_id)
            elif user_id:
                query = query.eq("user_id", user_id)
            
            global_res = await asyncio.to_thread(query.execute)
            for row in (global_res.data or []):
                # Global WhatsApp config
                if row.get("whatsapp_access_token"):
                    w_json = decrypt_val(row["whatsapp_access_token"])
                    try:
                        w_conf = json.loads(w_json) if w_json else {}
                        if w_conf.get("twilio_sid") and w_conf.get("auth_token"):
                            integrations_list.append({
                                "integration_types": {"slug": "whatsapp"},
                                "config": {
                                    **w_conf,
                                    "event_triggers": {
                                        "call_completed": True,
                                        "lead_captured": True,
                                        "callback_scheduled": True
                                    }
                                }
                            })
                    except Exception as err:
                        logger.error(f"Error decoding global whatsapp config: {err}")

                # Global Telegram config
                if row.get("telegram_bot_token") and row.get("telegram_chat_id"):
                    t_token = decrypt_val(row["telegram_bot_token"])
                    if t_token and not t_token.startswith("{"):
                        integrations_list.append({
                            "integration_types": {"slug": "telegram"},
                            "config": {
                                "telegram_bot_token": t_token,
                                "telegram_chat_id": row["telegram_chat_id"],
                                "event_triggers": {
                                    "call_completed": True,
                                    "lead_captured": True,
                                    "callback_scheduled": True
                                }
                            }
                        })

                # Global Webhook config
                if row.get("crm_webhook_url"):
                    integrations_list.append({
                        "integration_types": {"slug": "webhook"},
                        "config": {
                            "webhook_url": row["crm_webhook_url"],
                            "event_triggers": {
                                "call_completed": True,
                                "lead_captured": True,
                                "callback_scheduled": True
                            }
                        }
                    })

                # Global Aux config (Email & Cal.com Calendar)
                if row.get("whatsapp_phone_number_id"):
                    aux_json = decrypt_val(row["whatsapp_phone_number_id"])
                    try:
                        aux_obj = json.loads(aux_json) if aux_json else {}
                        cal_conf = aux_obj.get("calendar")
                        if cal_conf and cal_conf.get("cal_api_key"):
                            integrations_list.append({
                                "integration_types": {"slug": "calendar"},
                                "config": {
                                    **cal_conf,
                                    "event_triggers": {
                                        "callback_scheduled": True
                                    }
                                }
                            })
                        email_conf = aux_obj.get("email") or (aux_obj if aux_obj.get("smtp_host") else None)
                        if email_conf and email_conf.get("smtp_host"):
                            integrations_list.append({
                                "integration_types": {"slug": "smtp-email"},
                                "config": {
                                    **email_conf,
                                    "event_triggers": {
                                        "call_completed": True,
                                        "lead_captured": True,
                                        "callback_scheduled": True
                                    }
                                }
                            })
                    except Exception as aux_err:
                        logger.error(f"Error decoding global aux config (email/calendar): {aux_err}")

                # Legacy Calendar fallback from telegram_bot_token column
                if row.get("telegram_bot_token"):
                    leg_json = decrypt_val(row["telegram_bot_token"])
                    if leg_json and leg_json.startswith("{"):
                        try:
                            leg_obj = json.loads(leg_json)
                            if leg_obj.get("cal_api_key"):
                                integrations_list.append({
                                    "integration_types": {"slug": "calendar"},
                                    "config": {
                                        **leg_obj,
                                        "event_triggers": {
                                            "callback_scheduled": True
                                        }
                                    }
                                })
                        except Exception:
                            pass
        except Exception as ge:
            logger.error(f"Error fetching global integrations: {ge}")

        return integrations_list

    async def on_lead_captured(self, agent_id: str, lead_data: dict):
        logger.info(f"Triggering lead captured integrations for agent {agent_id}")
        integrations = await self._get_agent_integrations(agent_id, lead_data.get("organization_id"), lead_data.get("user_id"))
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
        integrations = await self._get_agent_integrations(agent_id, call_data.get("organization_id"), call_data.get("user_id"))
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
        integrations = await self._get_agent_integrations(agent_id, callback_data.get("organization_id"), callback_data.get("user_id"))
        for integration in integrations:
            itype = integration.get("integration_types") or {}
            slug = itype.get("slug")
            config = integration.get("config") or {}
            
            # Check trigger settings
            triggers = config.get("event_triggers", {})
            if not triggers.get("callback_scheduled", True):
                continue
                
            await self._dispatch(slug, "callback_scheduled", config, callback_data)

    async def dispatch_post_call(self, agent_id: str, event_type: str, context: dict, data: dict, org_id: str = None, user_id: str = None):
        """
        Dispatches post-call or post-campaign summaries across all active integrations (WhatsApp, Telegram, Webhook, Email).
        """
        logger.info(f"Triggering dispatch_post_call for agent={agent_id}, event={event_type}")
        integrations = await self._get_agent_integrations(agent_id, org_id, user_id)
        merged_data = {**data, **context}
        for integration in integrations:
            itype = integration.get("integration_types") or {}
            slug = itype.get("slug")
            config = integration.get("config") or {}
            try:
                await self._dispatch(slug, event_type, config, merged_data)
            except Exception as d_err:
                logger.error(f"[dispatch_post_call] Error dispatching to {slug}: {d_err}")

    async def dispatch_interested_followup(self, agent_id: str, prospect_data: dict) -> bool:
        """
        Sends an automated welcome & next-step message to interested prospects via WhatsApp (or SMS fallback).
        """
        prospect_phone = prospect_data.get("contact_phone") or prospect_data.get("prospect_phone")
        if not prospect_phone or str(prospect_phone).strip().lower() in ("unknown", "none", "", "null"):
            logger.info("[Interested Followup] Skipped: no valid prospect phone provided.")
            return False

        org_id = prospect_data.get("organization_id")
        user_id = prospect_data.get("user_id")
        prospect_name = prospect_data.get("contact_name") or prospect_data.get("prospect_name") or "there"
        business_name = prospect_data.get("business_name") or prospect_data.get("agent_name") or "Trinetra AI"
        summary = prospect_data.get("call_summary") or ""
        cb_time = prospect_data.get("callback_time_iso") or prospect_data.get("callback_time")

        clean_sum = summary.strip() if summary else "We reviewed your requirements and aligned on our next discussion."
        if len(clean_sum) > 350:
            clean_sum = clean_sum[:347] + "..."

        msg_lines = [
            f"Hello {prospect_name},",
            f"\nThank you for speaking with our team today on behalf of *{business_name}*.",
            "\n━━━━━━━━━━━━━━━━━━━━━━━━",
            "📋 *Conversation Summary*",
            f"{clean_sum}",
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        ]
        if cb_time:
            msg_lines.append(f"\n⏰ *Scheduled Next Step*\nYour callback has been scheduled for *{cb_time}*. Our specialist will connect with you then.")
        else:
            msg_lines.append("\n🚀 *Scheduled Next Step*\nOur advisory team is reviewing your requirements and will reach out with the requested details shortly.")

        msg_lines.append(f"\nIf you have any questions or need to make changes, feel free to reply directly to this message.\n\nWarm regards,\n*{business_name} Client Team*")
        message = "\n".join(msg_lines)

        integrations = await self._get_agent_integrations(agent_id, org_id, user_id)

        # 1. Attempt WhatsApp first
        sent = False
        for itg in integrations:
            itype = (itg.get("integration_types") or {}).get("slug")
            config = itg.get("config") or {}
            if itype == "whatsapp":
                wa_ok = await self._send_whatsapp(config, message, {"contact_phone": prospect_phone})
                if wa_ok:
                    sent = True
                    break

        # 2. If WhatsApp is not configured or failed, attempt SMS
        if not sent:
            for itg in integrations:
                config = itg.get("config") or {}
                if config.get("twilio_sid") or os.getenv("TWILIO_ACCOUNT_SID"):
                    sms_ok = await self._send_sms(config, message, {"contact_phone": prospect_phone})
                    if sms_ok:
                        sent = True
                        break

        # 3. Global Twilio fallback if env vars are present
        if not sent and os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_PHONE_NUMBER"):
            sms_ok = await self._send_sms({}, message, {"contact_phone": prospect_phone})
            if sms_ok:
                sent = True

        if sent:
            logger.info(f"[Interested Followup] Successfully dispatched welcome message to {prospect_phone}")
        else:
            logger.warning(f"[Interested Followup] No active messaging provider reached for {prospect_phone}")
        return sent

    async def _dispatch(self, slug: str, event_type: str, config: dict, data: dict):
        try:
            # Merge event_type into template context
            context = {**data, "event_type": event_type}
            
            # Ensure friendly formatting of basic placeholder defaults
            if "contact_name" not in context:
                context["contact_name"] = context.get("prospect_name", "Unknown")
            if "contact_phone" not in context:
                context["contact_phone"] = context.get("prospect_phone", "")
            if "owner_name" not in context:
                context["owner_name"] = context.get("prospect_name", "Team")
            
            # Retrieve custom template or default to a standard placeholder string
            template = config.get("message_template") or ""
            if not template:
                if event_type == "campaign_completed":
                    if slug == "whatsapp":
                        template = (
                            "📊 *TRINETRA AI* | *Executive Campaign Briefing*\n\n"
                            "Hello {{owner_name}},\n"
                            "Your outbound campaign *“{{campaign_name}}”* has completed.\n\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "📈 *Performance Overview*\n"
                            "• *Total Contacts:* {{total_contacts}}\n"
                            "• *Calls Attempted:* {{calls_attempted}}\n"
                            "• *Connected:* {{connected_count}} ({{connection_rate}})\n"
                            "• *Qualified Leads:* {{leads_count}} ({{conversion_rate}} conversion)\n"
                            "• *Callbacks Booked:* {{callbacks_count}}\n"
                            "• *Total Talk Time:* {{total_duration_mins}} mins\n\n"
                            "🎯 *Next Step*:\n"
                            "Qualified leads and recordings are ready for review in your Command Center.\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "_Automated Intelligence by Trinetra Enterprise Voice_"
                        )
                    elif slug == "telegram":
                        template = (
                            "📊 *TRINETRA AI* | *Executive Campaign Briefing*\n\n"
                            "Hello {{owner_name}},\n"
                            "Campaign *“{{campaign_name}}”* has completed.\n\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "📈 *Key Highlights*\n"
                            "• *Total Contacts:* {{total_contacts}}\n"
                            "• *Calls Attempted:* {{calls_attempted}}\n"
                            "• *Connected:* {{connected_count}} ({{connection_rate}})\n"
                            "• *Qualified Leads:* {{leads_count}} ({{conversion_rate}})\n"
                            "• *Callbacks Booked:* {{callbacks_count}}\n"
                            "• *Total Duration:* {{total_duration_mins}} mins\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "_Automated Intelligence by Trinetra Enterprise Voice_"
                        )
                    elif slug == "smtp-email":
                        template = (
                            "<div style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;'>"
                            "<div style='font-size: 13px; font-weight: 700; letter-spacing: 0.05em; color: #4f46e5; text-transform: uppercase;'>Trinetra Enterprise Voice</div>"
                            "<h2 style='margin-top: 6px; margin-bottom: 4px; color: #0f172a;'>Executive Campaign Briefing</h2>"
                            "<p style='color: #64748b; font-size: 14px; margin-top: 0;'>Campaign: <strong>{{campaign_name}}</strong></p>"
                            "<div style='height: 1px; background-color: #e2e8f0; margin: 16px 0;'></div>"
                            "<table style='width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;'>"
                            "<tr style='border-bottom: 1px solid #f1f5f9;'><td style='padding: 8px 0; color: #64748b;'>Total Contacts:</td><td style='text-align: right; font-weight: 600;'>{{total_contacts}}</td></tr>"
                            "<tr style='border-bottom: 1px solid #f1f5f9;'><td style='padding: 8px 0; color: #64748b;'>Calls Attempted:</td><td style='text-align: right; font-weight: 600;'>{{calls_attempted}}</td></tr>"
                            "<tr style='border-bottom: 1px solid #f1f5f9;'><td style='padding: 8px 0; color: #64748b;'>Connected Calls:</td><td style='text-align: right; font-weight: 600; color: #0284c7;'>{{connected_count}} ({{connection_rate}})</td></tr>"
                            "<tr style='border-bottom: 1px solid #f1f5f9;'><td style='padding: 8px 0; color: #64748b;'>Qualified Leads:</td><td style='text-align: right; font-weight: 700; color: #16a34a;'>{{leads_count}} ({{conversion_rate}})</td></tr>"
                            "<tr style='border-bottom: 1px solid #f1f5f9;'><td style='padding: 8px 0; color: #64748b;'>Callbacks Scheduled:</td><td style='text-align: right; font-weight: 600;'>{{callbacks_count}}</td></tr>"
                            "<tr><td style='padding: 8px 0; color: #64748b;'>Total Talk Time:</td><td style='text-align: right; font-weight: 600;'>{{total_duration_mins}} mins</td></tr>"
                            "</table>"
                            "<div style='background-color: #f8fafc; border-radius: 6px; padding: 12px; font-size: 13px; color: #475569; border-left: 3px solid #4f46e5;'>"
                            "All recorded conversations and prospect intelligence notes are synced to your Trinetra Dashboard."
                            "</div>"
                            "<div style='height: 1px; background-color: #e2e8f0; margin: 20px 0;'></div>"
                            "<p style='font-size: 12px; color: #94a3b8; margin: 0;'>Automated Intelligence by Trinetra Enterprise Voice.</p>"
                            "</div>"
                        )
                    else:
                        template = "📊 Trinetra AI Campaign Briefing: {{campaign_name}} - {{connected_count}}/{{total_contacts}} connected ({{leads_count}} leads)."

                elif event_type == "lead_captured":
                    if slug == "whatsapp":
                        template = (
                            "🎯 *TRINETRA AI* | *Qualified Lead Alert*\n\n"
                            "A high-intent prospect was just qualified by your AI Agent.\n\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "👤 *Prospect Profile*\n"
                            "• *Name:* {{contact_name}}\n"
                            "• *Phone:* {{contact_phone}}\n"
                            "• *Company:* {{company_name}}\n"
                            "• *Interest Level:* 🔥 {{interest_level}}\n\n"
                            "💼 *Deal Intelligence*\n"
                            "• *Budget:* {{budget_range}}\n"
                            "• *Timeline:* {{timeline}}\n\n"
                            "📝 *Discussion Summary*\n"
                            "“{{call_summary}}”\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "⚡ _Recommended Action: Follow up within 15 minutes for peak conversion._"
                        )
                    elif slug == "telegram":
                        template = (
                            "🎯 *TRINETRA AI* | *Qualified Lead Alert*\n\n"
                            "High-intent lead qualified by AI Agent.\n\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "👤 *Prospect:* {{contact_name}} ({{contact_phone}})\n"
                            "🏢 *Company:* {{company_name}}\n"
                            "🔥 *Interest:* {{interest_level}}\n"
                            "💰 *Budget:* {{budget_range}} | ⏱️ *Timeline:* {{timeline}}\n\n"
                            "📝 *Summary:* {{call_summary}}\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━"
                        )
                    elif slug == "smtp-email":
                        template = (
                            "<div style='font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;'>"
                            "<div style='font-size: 12px; font-weight: 700; color: #16a34a; text-transform: uppercase;'>New Qualified Lead</div>"
                            "<h3 style='margin-top: 4px; color: #0f172a;'>{{contact_name}} ({{company_name}})</h3>"
                            "<p><strong>Phone:</strong> {{contact_phone}}<br/><strong>Interest Level:</strong> {{interest_level}}<br/><strong>Budget:</strong> {{budget_range}}<br/><strong>Timeline:</strong> {{timeline}}</p>"
                            "<p style='background-color: #f8fafc; padding: 12px; border-radius: 6px; font-style: italic;'>“{{call_summary}}”</p>"
                            "</div>"
                        )
                    else:
                        template = "🎯 New Lead: {{contact_name}} ({{contact_phone}}) - {{interest_level}} - {{call_summary}}"

                elif event_type == "callback_scheduled":
                    if slug == "whatsapp":
                        template = (
                            "🗓️ *TRINETRA AI* | *Appointment / Callback Scheduled*\n\n"
                            "A prospect has confirmed an appointment with your team.\n\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "👤 *Contact:* {{contact_name}} ({{contact_phone}})\n"
                            "⏰ *Scheduled Time:* {{scheduled_at}}\n"
                            "📌 *Context / Notes:* {{notes}}\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "_Reminder is scheduled prior to call._"
                        )
                    elif slug == "telegram":
                        template = "🗓️ *Appointment Scheduled*\nContact: {{contact_name}} ({{contact_phone}})\nTime: {{scheduled_at}}\nNotes: {{notes}}"
                    elif slug == "smtp-email":
                        template = "<h3>Appointment Scheduled</h3><p>Contact: {{contact_name}} ({{contact_phone}})</p><p>Time: {{scheduled_at}}</p><p>Notes: {{notes}}</p>"
                    else:
                        template = "🗓️ Appointment Scheduled: {{contact_name}} - {{scheduled_at}}"

                else:
                    # Default call_completed event
                    if slug == "whatsapp":
                        template = (
                            "📞 *TRINETRA AI* | *Call Briefing*\n\n"
                            "Hello {{contact_name}},\n"
                            "Thank you for speaking with our AI specialist today.\n\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "📋 *Conversation Summary*\n"
                            "{{call_summary}}\n"
                            "━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            "Feel free to reply directly to this message if you have any questions.\n\n"
                            "Warm regards,\n"
                            "*Client Operations Team*"
                        )
                    elif slug == "telegram":
                        template = "📞 *Trinetra Call Completed*\nProspect: {{contact_name}} ({{contact_phone}})\nSummary: {{call_summary}}"
                    elif slug == "smtp-email":
                        template = "<h3>Trinetra AI Call Update</h3><p>Prospect: {{contact_name}} ({{contact_phone}})</p><p>Summary: {{call_summary}}</p>"
                    else:
                        template = "Trinetra AI Call Update: {{contact_name}} - {{call_summary}}"
                    
            formatted_msg = self._replace_placeholders(template, context)
            
            if slug == "telegram":
                await self._send_telegram(config, formatted_msg)
            elif slug == "webhook":
                await self._send_webhook(config, event_type, formatted_msg, data)
            elif slug == "smtp-email":
                await self._send_email(config, event_type, formatted_msg, data)
            elif slug == "whatsapp":
                await self._send_whatsapp(config, formatted_msg, data)
            elif slug in ("calendar", "cal.com"):
                await self._book_cal_com(config, data)
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

    async def _send_whatsapp(self, config: dict, message: str, data: dict = None) -> bool:
        to_number = (data or {}).get("contact_phone") or (data or {}).get("prospect_phone") or config.get("target_phone")
        twilio_sid = config.get("twilio_sid") or os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = config.get("auth_token") or os.getenv("TWILIO_AUTH_TOKEN")
        from_number = config.get("phone_number") or config.get("from_number") or os.getenv("TWILIO_WHATSAPP_FROM") or os.getenv("TWILIO_PHONE_NUMBER")

        # 1. Twilio WhatsApp dispatch
        if twilio_sid and auth_token and from_number:
            if not to_number:
                logger.warning("Twilio WhatsApp dispatch skipped: no destination contact phone provided.")
                return False
            from_whatsapp = format_whatsapp_number(from_number)
            to_whatsapp = format_whatsapp_number(to_number)

            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.post(
                        url,
                        auth=(twilio_sid, auth_token),
                        data={
                            "From": from_whatsapp,
                            "To": to_whatsapp,
                            "Body": message
                        },
                        timeout=10.0
                    )
                    if res.status_code not in (200, 201):
                        logger.error(f"Twilio WhatsApp API error: status={res.status_code} response={res.text}")
                        return False
                    else:
                        logger.info(f"Twilio WhatsApp message sent successfully to {to_whatsapp}")
                        return True
            except Exception as exc:
                logger.error(f"Twilio WhatsApp request failed: {exc}")
                return False

        # 2. Meta Cloud API WhatsApp dispatch
        phone_id = config.get("whatsapp_phone_id")
        token = config.get("whatsapp_access_token")
        if phone_id and token:
            if not to_number:
                logger.warning("Meta WhatsApp dispatch skipped: no destination contact phone provided.")
                return False
            clean_to = str(to_number).replace("+", "").replace(" ", "").replace("-", "")
            url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.post(
                        url,
                        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                        json={
                            "messaging_product": "whatsapp",
                            "to": clean_to,
                            "type": "text",
                            "text": {"body": message}
                        },
                        timeout=10.0
                    )
                    if res.status_code not in (200, 201):
                        logger.error(f"Meta WhatsApp API error: status={res.status_code} response={res.text}")
                        return False
                    else:
                        logger.info(f"Meta WhatsApp message sent successfully to {clean_to}")
                        return True
            except Exception as exc:
                logger.error(f"Meta WhatsApp request failed: {exc}")
                return False

        logger.warning(f"WhatsApp dispatch skipped: incomplete configuration (keys={list(config.keys())})")
        return False

    async def _send_sms(self, config: dict, message: str, data: dict = None) -> bool:
        to_number = (data or {}).get("contact_phone") or (data or {}).get("prospect_phone") or config.get("target_phone")
        twilio_sid = config.get("twilio_sid") or os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = config.get("auth_token") or os.getenv("TWILIO_AUTH_TOKEN")
        from_number = config.get("phone_number") or config.get("from_number") or os.getenv("TWILIO_PHONE_NUMBER")

        if twilio_sid and auth_token and from_number and to_number:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            try:
                to_clean = str(to_number).strip().replace("whatsapp:", "")
                from_clean = str(from_number).strip().replace("whatsapp:", "")
                if not to_clean.startswith("+"):
                    to_clean = "+" + to_clean
                if not from_clean.startswith("+"):
                    from_clean = "+" + from_clean

                async with httpx.AsyncClient() as client:
                    res = await client.post(
                        url,
                        auth=(twilio_sid, auth_token),
                        data={
                            "From": from_clean,
                            "To": to_clean,
                            "Body": message
                        },
                        timeout=10.0
                    )
                    if res.status_code in (200, 201):
                        logger.info(f"Twilio SMS sent successfully to {to_clean}")
                        return True
                    else:
                        logger.error(f"Twilio SMS error: status={res.status_code} response={res.text}")
                        return False
            except Exception as exc:
                logger.error(f"Twilio SMS request failed: {exc}")
                return False
        return False

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

    async def _book_cal_com(self, config: dict, data: dict):
        """Book a meeting or schedule callback event on Cal.com via its REST API v2"""
        api_key = config.get("cal_api_key") or config.get("apiKey")
        event_type_id = config.get("event_type_id") or config.get("eventTypeId")
        if not api_key:
            logger.warning("Cal.com booking skipped: cal_api_key is missing in integration config.")
            return

        scheduled_at = data.get("scheduled_at")
        if not scheduled_at:
            logger.warning("Cal.com booking skipped: no scheduled_at timestamp provided in callback data.")
            return

        start_time_iso = str(scheduled_at)
        prospect_name = data.get("prospect_name") or data.get("contact_name") or "Trinetra Prospect"
        prospect_phone = data.get("prospect_phone") or data.get("contact_phone") or ""
        prospect_email = data.get("prospect_email") or data.get("contact_email") or f"prospect_{prospect_phone.replace('+', '') or 'lead'}@trinetraedu-ai.com"
        notes = data.get("notes") or f"Scheduled via Trinetra AI call with {prospect_name} ({prospect_phone})"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "cal-api-version": "2024-08-13",
            "Content-Type": "application/json"
        }
        booking_payload = {
            "start": start_time_iso,
            "attendee": {
                "name": prospect_name,
                "email": prospect_email,
                "timeZone": "Asia/Kolkata",
                "phoneNumber": prospect_phone
            },
            "bookingFieldsResponses": {
                "notes": notes
            },
            "metadata": {
                "caller_phone": prospect_phone,
                "agent_id": data.get("agent_id", ""),
                "source": "Trinetra AI Voice Agent"
            }
        }
        if event_type_id:
            try:
                booking_payload["eventTypeId"] = int(event_type_id)
            except ValueError:
                booking_payload["eventTypeId"] = event_type_id

        url = "https://api.cal.com/v2/bookings"
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=booking_payload, timeout=12.0)
                if res.status_code in (200, 201):
                    logger.info(f"Cal.com booking successfully created for {prospect_name} at {start_time_iso}")
                else:
                    logger.error(f"Cal.com booking creation failed: status={res.status_code} response={res.text}")
        except Exception as err:
            logger.error(f"Error booking Cal.com meeting: {err}")
