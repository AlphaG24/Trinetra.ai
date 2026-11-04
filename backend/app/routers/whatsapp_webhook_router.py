"""
WhatsApp Webhook Router for Vaakriti AI.

Exposes endpoints for:
1. Meta Cloud API Inbound Webhooks:
   - GET /api/webhooks/whatsapp (Verification Challenge)
   - POST /api/webhooks/whatsapp (Inbound Messages & Screenshots)
2. Twilio Inbound WhatsApp Webhook:
   - POST /api/webhooks/twilio/whatsapp (Inbound Messages & Screenshots)
"""

import os
import logging
import httpx
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Response, HTTPException, status
from fastapi.responses import PlainTextResponse, Response as FastAPIResponse

from app.services.whatsapp_receipt_verifier import WhatsAppReceiptVerifier

logger = logging.getLogger("WhatsAppWebhookRouter")

router = APIRouter(prefix="/api/webhooks", tags=["whatsapp-webhook"])


# =====================================================================
# META CLOUD API WEBHOOKS
# =====================================================================

@router.get("/whatsapp")
async def verify_meta_whatsapp_webhook(request: Request):
    """
    Verification challenge handshake for Meta WhatsApp Cloud API.
    Meta sends: hub.mode, hub.verify_token, hub.challenge.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    verify_token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    expected_token = (
        os.getenv("WHATSAPP_VERIFY_TOKEN")
        or os.getenv("META_WHATSAPP_VERIFY_TOKEN")
        or "vaakriti_whatsapp_verify_token"
    )

    if mode == "subscribe" and verify_token == expected_token:
        logger.info("[Meta WhatsApp Webhook] Verification successful.")
        return PlainTextResponse(content=challenge or "", status_code=200)

    logger.warning(f"[Meta WhatsApp Webhook] Verification failed: mode={mode}, token_match={verify_token == expected_token}")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


@router.post("/whatsapp")
async def handle_meta_whatsapp_inbound(request: Request):
    """
    Receives incoming WhatsApp messages from customers via Meta Cloud API.
    Inspects text messages and images (screenshots) for payment proof & UTR numbers.
    """
    try:
        payload = await request.json()
    except Exception as e:
        logger.warning(f"[Meta WhatsApp Webhook] Invalid JSON payload: {e}")
        return {"status": "ignored"}

    entries = payload.get("entry", [])
    if not entries:
        return {"status": "no_entries"}

    for entry in entries:
        changes = entry.get("changes", [])
        for ch in changes:
            val = ch.get("value", {})
            messages = val.get("messages", [])
            for msg in messages:
                sender_phone = msg.get("from")  # e.g. "919876543210"
                msg_type = msg.get("type")

                if not sender_phone:
                    continue

                if not sender_phone.startswith("+"):
                    sender_phone = "+" + sender_phone

                # Case A: Customer sent a text message (e.g. UTR / transaction note)
                if msg_type == "text":
                    body = msg.get("text", {}).get("body", "")
                    verification = WhatsAppReceiptVerifier.parse_text_receipt(body)
                    if verification.is_payment_receipt:
                        await WhatsAppReceiptVerifier.reconcile_and_confirm(
                            caller_phone=sender_phone,
                            verification=verification
                        )

                # Case B: Customer sent an image (payment screenshot)
                elif msg_type == "image":
                    image_info = msg.get("image", {})
                    image_id = image_info.get("id")
                    caption = image_info.get("caption", "")
                    mime_type = image_info.get("mime_type", "image/jpeg")

                    # Download image bytes from Meta Graph API
                    token = os.getenv("WHATSAPP_ACCESS_TOKEN") or os.getenv("META_WHATSAPP_TOKEN")
                    image_bytes = None

                    if image_id and token:
                        try:
                            async with httpx.AsyncClient(timeout=15.0) as client:
                                # Step 1: Get media URL
                                meta_url_res = await client.get(
                                    f"https://graph.facebook.com/v19.0/{image_id}",
                                    headers={"Authorization": f"Bearer {token}"}
                                )
                                if meta_url_res.status_code == 200:
                                    media_url = meta_url_res.json().get("url")
                                    if media_url:
                                        # Step 2: Download actual image binary
                                        img_res = await client.get(
                                            media_url,
                                            headers={"Authorization": f"Bearer {token}"}
                                        )
                                        if img_res.status_code == 200:
                                            image_bytes = img_res.content
                        except Exception as dl_err:
                            logger.error(f"[Meta WhatsApp Webhook] Failed to download media {image_id}: {dl_err}")

                    if image_bytes:
                        verification = await WhatsAppReceiptVerifier.parse_image_receipt(
                            image_bytes=image_bytes,
                            mime_type=mime_type
                        )
                        # If caption also contained UTR or amount, supplement verification
                        if caption and not verification.utr_number:
                            text_ver = WhatsAppReceiptVerifier.parse_text_receipt(caption)
                            if text_ver.utr_number:
                                verification.utr_number = text_ver.utr_number

                        await WhatsAppReceiptVerifier.reconcile_and_confirm(
                            caller_phone=sender_phone,
                            verification=verification,
                            proof_media_url=f"meta_media_id:{image_id}"
                        )
                    elif caption:
                        # Fall back to caption text parsing
                        verification = WhatsAppReceiptVerifier.parse_text_receipt(caption)
                        await WhatsAppReceiptVerifier.reconcile_and_confirm(
                            caller_phone=sender_phone,
                            verification=verification
                        )

    return {"status": "received"}


# =====================================================================
# TWILIO WHATSAPP WEBHOOK
# =====================================================================

@router.post("/twilio/whatsapp")
async def handle_twilio_whatsapp_inbound(request: Request):
    """
    Receives incoming WhatsApp messages from customers via Twilio.
    Supports text receipts and media attachments (MediaUrl0).
    """
    form_data = await request.form()
    from_raw = form_data.get("From", "")  # e.g. "whatsapp:+919876543210"
    body = form_data.get("Body", "")
    num_media_str = form_data.get("NumMedia", "0")
    media_url = form_data.get("MediaUrl0")
    media_type = form_data.get("MediaContentType0", "image/jpeg")

    sender_phone = str(from_raw).replace("whatsapp:", "").strip()
    if not sender_phone.startswith("+"):
        sender_phone = "+" + sender_phone

    image_bytes = None
    if media_url and int(num_media_str or 0) > 0:
        # Download media attachment from Twilio
        try:
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            auth = (account_sid, auth_token) if (account_sid and auth_token) else None

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(str(media_url), auth=auth, follow_redirects=True)
                if res.status_code == 200:
                    image_bytes = res.content
        except Exception as dl_err:
            logger.error(f"[Twilio WhatsApp Webhook] Media download error: {dl_err}")

    if image_bytes:
        verification = await WhatsAppReceiptVerifier.parse_image_receipt(
            image_bytes=image_bytes,
            mime_type=str(media_type)
        )
        if body and not verification.utr_number:
            text_ver = WhatsAppReceiptVerifier.parse_text_receipt(str(body))
            if text_ver.utr_number:
                verification.utr_number = text_ver.utr_number

        await WhatsAppReceiptVerifier.reconcile_and_confirm(
            caller_phone=sender_phone,
            verification=verification,
            proof_media_url=str(media_url)
        )
    elif body:
        verification = WhatsAppReceiptVerifier.parse_text_receipt(str(body))
        if verification.is_payment_receipt:
            await WhatsAppReceiptVerifier.reconcile_and_confirm(
                caller_phone=sender_phone,
                verification=verification
            )

    # Return valid TwiML response
    twiml_response = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    return FastAPIResponse(content=twiml_response, media_type="application/xml")

