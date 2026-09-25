import os
import json
import httpx
import traceback
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

try:
    import pytz
except ImportError:
    pytz = None

from datetime import datetime
from database import supabase_admin as supabase

# Default fallback preferences schema
DEFAULT_PREFERENCES = {
    "events": {
        "call_completed": { "email": False, "telegram": True, "dashboard": True },
        "new_lead": { "email": True, "telegram": True, "dashboard": True },
        "payment_confirmed": { "email": True, "telegram": False, "dashboard": True },
        "usage_warning": { "email": True, "telegram": True, "dashboard": True },
        "plan_expired": { "email": True, "telegram": True, "dashboard": True },
        "callback_scheduled": { "email": True, "telegram": True, "dashboard": True },
        "agent_paused": { "email": True, "telegram": False, "dashboard": True },
        "weekly_report": { "email": True, "telegram": False, "dashboard": False }
    },
    "quiet_hours": {
        "enabled": False,
        "start": "22:00",
        "end": "07:00"
    },
    "digest_mode": {
        "enabled": False,
        "time": "18:00"
    }
}

class NotificationService:
    @staticmethod
    def is_in_quiet_hours(tz_name: str, start_str: str, end_str: str) -> bool:
        try:
            if ZoneInfo:
                tz = ZoneInfo(tz_name)
                local_now = datetime.now(tz)
            else:
                local_now = datetime.utcnow()
        except Exception:
            local_now = datetime.utcnow()
            
        local_time = local_now.time()
        
        try:
            start_time = datetime.strptime(start_str, "%H:%M").time()
            end_time = datetime.strptime(end_str, "%H:%M").time()
        except Exception:
            # Fallback if time format is invalid
            start_time = datetime.strptime("22:00", "%H:%M").time()
            end_time = datetime.strptime("07:00", "%H:%M").time()
            
        if start_time <= end_time:
            return start_time <= local_time <= end_time
        else:  # spans midnight
            return local_time >= start_time or local_time <= end_time

    @classmethod
    async def dispatch(cls, user_id: str, event_type: str, title: str, message: str, payload: dict = None):
        """
        Dispatches notifications to dashboard, email, and telegram channels
        by respecting user's quiet hours, digest settings, and channel preferences.
        """
        try:
            # 1. Fetch user profile, telegram chat id, and notification preferences
            user_res = supabase.table("profiles").select(
                "email, telegram_chat_id, timezone, notification_preferences"
            ).eq("id", user_id).maybe_single().execute()
            
            if not user_res.data:
                print(f"[NotificationService] User profile {user_id} not found. Skipping dispatch.", flush=True)
                return
                
            profile = user_res.data
            user_email = profile.get("email")
            telegram_chat_id = profile.get("telegram_chat_id")
            user_tz = profile.get("timezone") or "Asia/Kolkata"
            
            # Load preferences (merge with defaults to avoid missing keys)
            db_prefs = profile.get("notification_preferences") or {}
            prefs = {
                "events": {**DEFAULT_PREFERENCES["events"], **db_prefs.get("events", {})},
                "quiet_hours": {**DEFAULT_PREFERENCES["quiet_hours"], **db_prefs.get("quiet_hours", {})},
                "digest_mode": {**DEFAULT_PREFERENCES["digest_mode"], **db_prefs.get("digest_mode", {})}
            }
            
            event_prefs = prefs["events"].get(event_type, { "email": True, "telegram": True, "dashboard": True })
            
            # 2. In-App Dashboard Notification (always instant if enabled, does not respect quiet hours/digest)
            if event_prefs.get("dashboard", True):
                try:
                    type_map = {
                        "new_lead": "success",
                        "payment_confirmed": "success",
                        "call_completed": "info",
                        "callback_scheduled": "info",
                        "usage_warning": "warning",
                        "plan_expired": "warning",
                        "agent_paused": "warning",
                        "weekly_report": "info"
                    }
                    db_type = type_map.get(event_type, "info")
                    insert_data = {
                        "user_id": user_id,
                        "title": title,
                        "message": message,
                        "type": db_type,
                        "is_read": False,
                        "metadata": payload or {}
                    }
                    if payload and isinstance(payload, dict):
                        if payload.get("action_url"):
                            insert_data["action_url"] = payload["action_url"]
                        if payload.get("action_label") or payload.get("action_text"):
                            insert_data["action_label"] = payload.get("action_label") or payload.get("action_text")
                    
                    try:
                        supabase.table("notifications").insert(insert_data).execute()
                        print(f"[NotificationService] In-App dashboard alert created for user {user_id}", flush=True)
                    except Exception as ins_err:
                        # Fallback with minimal fields if table schema differs
                        minimal_data = {
                            "user_id": user_id,
                            "title": title,
                            "message": message,
                            "type": db_type,
                            "is_read": False
                        }
                        supabase.table("notifications").insert(minimal_data).execute()
                        print(f"[NotificationService] In-App dashboard alert created (minimal fallback) for user {user_id}", flush=True)
                except Exception as e:
                    print(f"[NotificationService] Failed to write in-app notification: {str(e)}", flush=True)
            
            # 3. Check Quiet Hours
            quiet_active = False
            if prefs["quiet_hours"].get("enabled", False):
                qh_start = prefs["quiet_hours"].get("start", "22:00")
                qh_end = prefs["quiet_hours"].get("end", "07:00")
                quiet_active = cls.is_in_quiet_hours(user_tz, qh_start, qh_end)
                
            # 4. Check Digest Mode
            digest_active = prefs["digest_mode"].get("enabled", False)
            
            # 5. Queue or Send Email
            if event_prefs.get("email", True) and user_email:
                if quiet_active or digest_active:
                    cls.queue_notification(user_id, event_type, "email", title, message, payload)
                else:
                    await cls.send_email_notification(user_email, title, message)
                    
            # 6. Queue or Send Telegram
            if event_prefs.get("telegram", True) and telegram_chat_id:
                if quiet_active or digest_active:
                    cls.queue_notification(user_id, event_type, "telegram", title, message, payload)
                else:
                    await cls.send_telegram_notification(telegram_chat_id, f"🔔 *{title}*\n\n{message}")
                    
        except Exception as e:
            print(f"[NotificationService] Error in dispatch: {str(e)}", flush=True)
            traceback.print_exc()

    @staticmethod
    def queue_notification(user_id: str, event_type: str, channel: str, title: str, message: str, payload: dict = None):
        """
        Saves a notification to the queue to be dispatched during daily summary or after quiet hours.
        """
        try:
            supabase.table("queued_notifications").insert({
                "user_id": user_id,
                "event_type": event_type,
                "payload": {
                    "channel": channel,
                    "title": title,
                    "message": message,
                    "data": payload or {}
                }
            }).execute()
            print(f"[NotificationService] Queued {channel} notification for user {user_id} (Reason: quiet hours or digest active)", flush=True)
        except Exception as e:
            print(f"[NotificationService] Failed to queue notification: {str(e)}", flush=True)

    @staticmethod
    async def send_email_notification(email_address: str, title: str, message: str):
        """
        Dispatches SMTP email notification.
        """
        # Since SMTP setup is in app/services/integration_executor.py, we reuse it or log
        # to ensure it behaves correctly. Let's print for logs.
        print(f"[NotificationService] Sending SMTP Email notification to {email_address}: {title}", flush=True)
        # We can implement a clean SMTP dispatch here using standard SMTP if credentials exist
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))

        if not smtp_user or not smtp_password:
            print("[NotificationService] Skipping email send: Missing SMTP credentials", flush=True)
            return

        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        try:
            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = email_address
            msg['Subject'] = title
            msg.attach(MIMEText(message, 'plain'))

            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, email_address, msg.as_string())
            server.quit()
            print(f"[NotificationService] Email sent successfully to {email_address}", flush=True)
        except Exception as e:
            print(f"[NotificationService] Email delivery failure: {str(e)}", flush=True)

    @staticmethod
    async def send_telegram_notification(chat_id: str, text: str):
        """
        Dispatches Telegram notification.
        """
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not bot_token:
            print("[NotificationService] Skipping telegram: Missing bot token", flush=True)
            return
            
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}, timeout=10.0)
                if res.status_code == 200:
                    print(f"[NotificationService] Telegram message sent successfully to chat {chat_id}", flush=True)
                else:
                    print(f"[NotificationService] Telegram api error: {res.text}", flush=True)
        except Exception as e:
            print(f"[NotificationService] Telegram delivery network error: {str(e)}", flush=True)

    @classmethod
    async def process_queued_notifications(cls):
        """
        Background task to process quiet-hour release and daily summary digests.
        Can be scheduled to run hourly.
        """
        try:
            # Fetch all queued notifications
            res = supabase.table("queued_notifications").select("*").execute()
            if not res.data:
                return
                
            queued = res.data
            # Group by user_id
            by_user = {}
            for item in queued:
                u_id = item["user_id"]
                if u_id not in by_user:
                    by_user[u_id] = []
                by_user[u_id].append(item)
                
            for user_id, items in by_user.items():
                # Get user settings
                user_res = supabase.table("profiles").select(
                    "email, telegram_chat_id, timezone, notification_preferences"
                ).eq("id", user_id).maybe_single().execute()
                
                if not user_res.data:
                    continue
                    
                profile = user_res.data
                user_email = profile.get("email")
                telegram_chat_id = profile.get("telegram_chat_id")
                user_tz = profile.get("timezone") or "Asia/Kolkata"
                
                db_prefs = profile.get("notification_preferences") or {}
                prefs = {
                    "quiet_hours": {**DEFAULT_PREFERENCES["quiet_hours"], **db_prefs.get("quiet_hours", {})},
                    "digest_mode": {**DEFAULT_PREFERENCES["digest_mode"], **db_prefs.get("digest_mode", {})}
                }
                
                # Check quiet hours currently
                quiet_active = False
                if prefs["quiet_hours"].get("enabled", False):
                    qh_start = prefs["quiet_hours"].get("start", "22:00")
                    qh_end = prefs["quiet_hours"].get("end", "07:00")
                    quiet_active = cls.is_in_quiet_hours(user_tz, qh_start, qh_end)
                    
                # If quiet hours are active, keep them in queue
                if quiet_active:
                    continue
                    
                # Check if digest mode is enabled
                digest_mode = prefs["digest_mode"].get("enabled", False)
                
                if digest_mode:
                    # Send digest summary if current user time matches delivery hour
                    tz = None
                    try:
                        if ZoneInfo:
                            tz = ZoneInfo(user_tz)
                        elif pytz:
                            tz = pytz.timezone(user_tz)
                    except Exception:
                        try:
                            if ZoneInfo:
                                tz = ZoneInfo('UTC')
                            elif pytz:
                                tz = pytz.timezone('UTC')
                        except Exception:
                            tz = None
                    local_now = datetime.now(tz) if tz else datetime.utcnow()
                    
                    digest_time_str = prefs["digest_mode"].get("time", "18:00")
                    try:
                        digest_hour, digest_minute = map(int, digest_time_str.split(":"))
                    except Exception:
                        digest_hour, digest_minute = 18, 0
                    
                    # Only send if we are in the delivery hour (or within 1 hour)
                    if local_now.hour != digest_hour:
                        continue
                        
                    # Aggregate notifications into a clean summary
                    email_body_parts = []
                    tg_body_parts = []
                    
                    email_body_parts.append("<h2>Trinetra AI - Daily Notification Digest</h2>")
                    email_body_parts.append("<ul>")
                    tg_body_parts.append("📋 *Trinetra AI - Daily Notification Digest*\n")
                    
                    for item in items:
                        payload = item["payload"]
                        title = payload.get("title", "Alert")
                        msg = payload.get("message", "")
                        
                        email_body_parts.append(f"<li><strong>{title}</strong>: {msg}</li>")
                        tg_body_parts.append(f"• *{title}*: {msg}")
                        
                    email_body_parts.append("</ul>")
                    
                    email_body = "\n".join(email_body_parts)
                    tg_body = "\n".join(tg_body_parts)
                    
                    # Send
                    if user_email:
                        await cls.send_email_notification(user_email, "Trinetra AI - Daily Digest Summary", email_body)
                    if telegram_chat_id:
                        await cls.send_telegram_notification(telegram_chat_id, tg_body)
                        
                    # Clear queue
                    item_ids = [item["id"] for item in items]
                    supabase.table("queued_notifications").delete().in_("id", item_ids).execute()
                    print(f"[NotificationService] Cleared {len(item_ids)} queued notifications (digest sent) for user {user_id}", flush=True)
                else:
                    # Release immediately if quiet hours ended and digest mode is off
                    for item in items:
                        payload = item["payload"]
                        channel = payload.get("channel")
                        title = payload.get("title")
                        message = payload.get("message")
                        
                        if channel == "email" and user_email:
                            await cls.send_email_notification(user_email, title, message)
                        elif channel == "telegram" and telegram_chat_id:
                            await cls.send_telegram_notification(telegram_chat_id, f"🔔 *{title}*\n\n{message}")
                            
                    # Clear items released
                    item_ids = [item["id"] for item in items]
                    supabase.table("queued_notifications").delete().in_("id", item_ids).execute()
                    print(f"[NotificationService] Released {len(item_ids)} quiet-hours notifications for user {user_id}", flush=True)
                    
        except Exception as e:
            print(f"[NotificationService] Error processing queued notifications: {str(e)}", flush=True)
            traceback.print_exc()
