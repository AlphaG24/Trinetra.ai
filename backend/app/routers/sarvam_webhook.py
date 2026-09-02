import os
import logging
import traceback
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks
from database import supabase_admin
from voice_router import send_telegram_notification, genai_client, DynamicLeadExtraction

logger = logging.getLogger("SarvamWebhook")

router = APIRouter(prefix="/api/voice", tags=["Sarvam Webhook"])

async def process_sarvam_webhook_payload(payload: Dict[str, Any]):
    """
    Background worker to process call completion webhook from Sarvam:
    - Save call logs to voice_calls table
    - Update campaign contact status
    - Perform lead extraction with Gemini
    - Dispatch Telegram / WhatsApp / CRM integration alerts
    """
    try:
        call_id = payload.get("call_id") or payload.get("id") or payload.get("session_id")
        phone_number = payload.get("to_phone_number") or payload.get("phone_number") or payload.get("phone", "")
        duration = int(payload.get("duration") or payload.get("call_duration") or 0)
        transcript = payload.get("transcript") or payload.get("conversation_text") or ""
        call_status = payload.get("status") or payload.get("call_status") or "completed"
        agent_id = payload.get("agent_id")
        campaign_id = payload.get("campaign_id")
        contact_id = payload.get("contact_id")
        variables = payload.get("variables") or {}

        logger.info(f"[SarvamWebhook] Processing call completion for call_id: {call_id}, phone: {phone_number}")

        # 1. Look up agent metadata from payload or to_number in phone_numbers table
        agent_data = {}
        to_number = payload.get("to_number") or payload.get("called_number") or payload.get("phone_number")
        
        if not agent_id and to_number:
            try:
                clean_num = str(to_number).replace("+", "").strip()
                phone_lookup = supabase_admin.table("phone_numbers").select("*").or_(f"phone_number.eq.{to_number},phone_number.eq.+{clean_num},phone_number.eq.{clean_num}").limit(1).execute()
                if phone_lookup.data and len(phone_lookup.data) > 0:
                    num_row = phone_lookup.data[0]
                    agent_id = num_row.get("assigned_agent_id") or num_row.get("agent_id")
            except Exception as lookup_err:
                logger.warning(f"[SarvamWebhook] Failed to lookup to_number in phone_numbers: {lookup_err}")

        if agent_id:
            try:
                agent_res = supabase_admin.table("agents").select("*").or_(f"id.eq.{agent_id},sarvam_agent_id.eq.{agent_id}").execute()
                if agent_res.data and len(agent_res.data) > 0:
                    agent_data = agent_res.data[0]
            except Exception as e:
                logger.warning(f"[SarvamWebhook] Failed to query agent: {e}")

        user_id = agent_data.get("user_id") or variables.get("user_id")
        telegram_chat_id = agent_data.get("telegram_chat_id") or os.getenv("TELEGRAM_CHAT_ID")

        # 2. Extract Lead Info with Gemini if transcript exists
        is_lead = False
        intent_summary = "Outbound sales/inquiry call completed."
        extracted_data = []

        if transcript and len(transcript.strip()) > 10:
            try:
                prompt_text = (
                    f"Analyze this call transcript between AI agent and customer ({phone_number}):\n\n"
                    f"{transcript}\n\n"
                    "Determine if customer is a qualified lead (is_lead: true/false), provide intent_summary, "
                    "and extract key info (customer_name, email, interest, budget, next_steps)."
                )
                response = genai_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt_text,
                    config={
                        'response_mime_type': 'application/json',
                        'response_schema': DynamicLeadExtraction,
                    },
                )
                result = DynamicLeadExtraction.model_validate_json(response.text)
                is_lead = result.is_lead
                intent_summary = result.intent_summary
                extracted_data = result.extracted_data
            except Exception as gemini_err:
                logger.warning(f"[SarvamWebhook] Gemini lead analysis failed: {gemini_err}")

        # 3. Store Call in voice_calls table
        call_record = {
            "call_id": call_id,
            "agent_id": agent_data.get("id") or agent_id,
            "user_id": user_id,
            "phone_number": phone_number,
            "duration": duration,
            "status": call_status,
            "transcript": transcript,
            "is_lead": is_lead,
            "summary": intent_summary,
            "metadata": {
                "provider": "sarvam",
                "sarvam_call_id": call_id,
                "variables": variables,
                "extracted_data": [item.model_dump() if hasattr(item, "model_dump") else item for item in extracted_data]
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            supabase_admin.table("voice_calls").upsert(call_record, on_conflict="call_id").execute()
            logger.info(f"[SarvamWebhook] Saved call record to voice_calls table for call_id: {call_id}")
        except Exception as db_err:
            logger.error(f"[SarvamWebhook] Error saving voice_calls record: {db_err}")

        # 4. Update Campaign Contact status if campaign call
        if contact_id or (phone_number and campaign_id):
            try:
                contact_query = supabase_admin.table("campaign_contacts").update({
                    "call_status": "completed" if call_status in ("completed", "ended", "success") else "failed",
                    "call_duration": duration,
                    "last_attempt_at": datetime.now(timezone.utc).isoformat()
                })
                if contact_id:
                    contact_query = contact_query.eq("id", contact_id)
                else:
                    contact_query = contact_query.eq("campaign_id", campaign_id).eq("phone", phone_number)
                contact_query.execute()
                logger.info(f"[SarvamWebhook] Updated campaign contact status for phone: {phone_number}")
            except Exception as camp_err:
                logger.warning(f"[SarvamWebhook] Failed to update campaign contact: {camp_err}")

        # 5. Dispatch Telegram Siren Notification
        if telegram_chat_id:
            try:
                send_telegram_notification(
                    phone=phone_number,
                    duration=duration,
                    transcript=transcript,
                    chat_id=str(telegram_chat_id),
                    is_lead=is_lead,
                    intent_summary=intent_summary,
                    extracted_data=extracted_data
                )
            except Exception as tg_err:
                logger.error(f"[SarvamWebhook] Error sending Telegram alert: {tg_err}")

        # 6. Execute Dynamic Integrations (CRM / Webhooks)
        try:
            from app.services.integration_executor import IntegrationExecutor
            await IntegrationExecutor.execute_all_active_integrations(
                user_id=user_id,
                event_type="call_completed",
                payload={
                    "call_id": call_id,
                    "phone": phone_number,
                    "duration": duration,
                    "transcript": transcript,
                    "is_lead": is_lead,
                    "summary": intent_summary,
                    "provider": "sarvam"
                }
            )
        except Exception as int_err:
            logger.warning(f"[SarvamWebhook] Dynamic integrations execution error: {int_err}")

    except Exception as outer_err:
        logger.error(f"[SarvamWebhook] Critical webhook handler exception: {outer_err}")
        traceback.print_exc()

@router.post("/sarvam-webhook")
async def handle_sarvam_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook endpoint to handle incoming call status / completion events from Sarvam AI platform.
    """
    try:
        payload = await request.json()
        logger.info(f"[SarvamWebhook] Received webhook payload: {payload}")
        
        # Enqueue background processing so Sarvam webhook receives fast 200 OK
        background_tasks.add_task(process_sarvam_webhook_payload, payload)
        
        return {"status": "received", "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"[SarvamWebhook] Webhook endpoint error: {str(e)}")
        return {"status": "error", "message": str(e)}
