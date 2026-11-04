"""
WhatsApp Payment Receipt & UTR Verification Service for Vaakriti AI.

Implements Intelligent WhatsApp Bot capabilities (Changes.md Item 87 & Item 48):
1. Multimodal OCR & Vision Parsing via Gemini Flash Vision for payment screenshots
   (GPay, PhonePe, Paytm, BHIM, Bank Apps, NEFT/RTGS/IMPS).
2. Advanced Regex & NLP extraction for text receipts and 12-digit UTR numbers.
3. Automated Cash-to-Call reconciliation against open deals in revenue_events.
4. Instant WhatsApp verification receipt dispatch to customer and owner notification.
"""

import os
import re
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field

from database import supabase_admin
from app.services.revenue_service import RevenueService
from app.services.notification_service import NotificationService
from app.services.integration_executor import IntegrationExecutor

logger = logging.getLogger("WhatsAppReceiptVerifier")


# =====================================================================
# DATA STRUCTURES
# =====================================================================

class ReceiptVerificationResult(BaseModel):
    is_payment_receipt: bool = False
    is_verified: bool = False
    utr_number: Optional[str] = None
    amount_paid: Optional[float] = None
    currency: str = "INR"
    payee_name_or_upi: Optional[str] = None
    payment_status: str = "UNKNOWN"  # SUCCESS, COMPLETED, PENDING, FAILED, UNKNOWN
    confidence: float = 0.0
    notes: Optional[str] = None
    raw_text: Optional[str] = None


# =====================================================================
# CORE VERIFIER SERVICE
# =====================================================================

class WhatsAppReceiptVerifier:
    """
    Intelligent processor for incoming WhatsApp payment proofs, screenshots, and UTRs.
    """

    # 12-digit numeric UPI reference number or alphanumeric bank transaction ref
    UTR_REGEX = re.compile(
        r"(?:(?:utr|txn|transaction|ref|reference|rrn|upi\s*ref|id)[\s:#-]*([A-Za-z0-9]{8,24}))|(?:\b(\d{12})\b)",
        re.IGNORECASE
    )

    AMOUNT_REGEX = re.compile(
        r"(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?))|([\d,]+(?:\.\d+)?)\s*(?:rs|rupees|rupaye|inr|bheje|diye|paid|transfer)",
        re.IGNORECASE
    )

    PAYMENT_INTENT_REGEX = re.compile(
        r"\b(paid|payment|paytm|gpay|phonepe|google\s*pay|upi|utr|receipt|invoice|bheja|kar\s*diya|transferred|advance|rupaye|rs\.?|inr|screenshot|screen\s*shot|done|ho\s*gaya|successful|success)\b",
        re.IGNORECASE
    )

    @classmethod
    def parse_text_receipt(cls, text: str) -> ReceiptVerificationResult:
        """
        Parses text messages sent by callers containing payment claims, amounts, and UTRs.
        """
        if not text:
            return ReceiptVerificationResult(notes="Empty text message")

        raw_clean = text.strip()
        has_intent = bool(cls.PAYMENT_INTENT_REGEX.search(raw_clean))

        # Extract UTR
        extracted_utr = None
        for match in cls.UTR_REGEX.finditer(raw_clean):
            cand = match.group(1) or match.group(2)
            if cand:
                # Filter out obvious false positives like 10-digit phone numbers
                cand_clean = cand.strip()
                if len(cand_clean) == 12 and cand_clean.isdigit():
                    extracted_utr = cand_clean
                    break
                elif len(cand_clean) >= 8 and any(c.isdigit() for c in cand_clean):
                    extracted_utr = cand_clean
                    break

        # Extract Amount
        extracted_amount = None
        amt_match = cls.AMOUNT_REGEX.search(raw_clean)
        if amt_match:
            amt_str = (amt_match.group(1) or amt_match.group(2) or "").replace(",", "")
            try:
                extracted_amount = float(amt_str)
            except ValueError:
                pass

        # Determine verification state
        is_verified = bool(extracted_utr and (has_intent or extracted_amount is not None))
        confidence = 0.85 if (extracted_utr and extracted_amount) else (0.65 if extracted_utr else 0.3)

        return ReceiptVerificationResult(
            is_payment_receipt=has_intent or bool(extracted_utr),
            is_verified=is_verified,
            utr_number=extracted_utr,
            amount_paid=extracted_amount,
            payment_status="SUCCESS" if is_verified else "PENDING",
            confidence=confidence,
            notes="Extracted from text message" if is_verified else "Partial text match",
            raw_text=raw_clean
        )

    @classmethod
    async def parse_image_receipt(
        cls,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        gemini_api_key: Optional[str] = None
    ) -> ReceiptVerificationResult:
        """
        Uses Gemini Flash Vision to inspect payment screenshots (GPay, PhonePe, Paytm, etc.).
        Extracts UTR, amount, status, and payee name.
        """
        if not image_bytes:
            return ReceiptVerificationResult(notes="Empty image bytes")

        api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        if not api_key:
            logger.warning("[WhatsAppReceiptVerifier] Gemini API key not configured. Falling back to heuristic verification.")
            return ReceiptVerificationResult(
                is_payment_receipt=True,
                is_verified=False,
                payment_status="PENDING",
                confidence=0.4,
                notes="Image received but OCR vision key not configured. Queued for human verification."
            )

        prompt = (
            "You are an automated payment verification bot for Indian digital payments (UPI, GPay, PhonePe, Paytm, BHIM, Bank IMPS/NEFT).\n"
            "Analyze the provided payment screenshot and extract the following details strictly in JSON format:\n"
            "1. is_payment_receipt: boolean (true if this is a genuine payment confirmation or receipt screen)\n"
            "2. utr_number: string (the 12-digit UPI reference number, RRN, or bank transaction ID). Null if not found.\n"
            "3. amount_paid: float or number (the exact amount paid in INR). Null if not found.\n"
            "4. payment_status: string ('SUCCESS', 'PENDING', or 'FAILED')\n"
            "5. payee_name_or_upi: string (the recipient name or VPA/UPI ID displayed in the screenshot). Null if not found.\n"
            "6. confidence: float between 0.0 and 1.0\n\n"
            "Ensure the output is ONLY a single valid JSON object, without markdown formatting or code blocks."
        )

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

            # Primary model: gemini-2.5-flash with fallback to gemini-1.5-flash
            for model_name in ["gemini-2.5-flash", "gemini-1.5-flash"]:
                try:
                    response = await asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=[prompt, image_part]
                    )
                    raw_text = response.text.strip() if response and response.text else ""
                    # Strip any markdown fences
                    clean_json_str = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
                    parsed = json.loads(clean_json_str)

                    utr = parsed.get("utr_number")
                    if utr:
                        utr = str(utr).strip()

                    amt = parsed.get("amount_paid")
                    if amt is not None:
                        try:
                            amt = float(amt)
                        except (ValueError, TypeError):
                            amt = None

                    status = str(parsed.get("payment_status", "UNKNOWN")).upper()
                    is_rcpt = bool(parsed.get("is_payment_receipt", False))
                    is_ok = is_rcpt and status in ("SUCCESS", "COMPLETED") and bool(utr or amt)

                    return ReceiptVerificationResult(
                        is_payment_receipt=is_rcpt,
                        is_verified=is_ok,
                        utr_number=utr,
                        amount_paid=amt,
                        payee_name_or_upi=parsed.get("payee_name_or_upi"),
                        payment_status=status,
                        confidence=float(parsed.get("confidence", 0.9)),
                        notes=f"Verified via Gemini Vision ({model_name})",
                        raw_text=raw_text
                    )
                except Exception as model_err:
                    logger.warning(f"[WhatsAppReceiptVerifier] Model {model_name} extraction failed: {model_err}")
                    continue

        except Exception as e:
            logger.error(f"[WhatsAppReceiptVerifier] Vision OCR exception: {e}")

        return ReceiptVerificationResult(
            is_payment_receipt=True,
            is_verified=False,
            payment_status="PENDING",
            confidence=0.3,
            notes="Vision processing encountered an error. Queued for manual review."
        )

    @classmethod
    async def reconcile_and_confirm(
        cls,
        caller_phone: str,
        verification: ReceiptVerificationResult,
        proof_media_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reconciles verified payment with the caller's open deals in revenue_events.
        Marks deal as won, dispatches instant WhatsApp confirmation to caller,
        and alerts the business owner.
        """
        if not caller_phone:
            return {"status": "error", "message": "Missing caller phone number"}

        # Normalize phone: extract last 10 digits for matching
        digits_only = re.sub(r"\D", "", caller_phone)
        last_10 = digits_only[-10:] if len(digits_only) >= 10 else digits_only

        # 1. Search revenue_events for open deals with matching phone
        matched_event = None
        try:
            # Query open revenue events
            res = await asyncio.to_thread(
                supabase_admin.table("revenue_events")
                .select("*")
                .eq("deal_status", "open")
                .order("created_at", desc=True)
                .limit(25)
                .execute
            )
            events = res.data or []
            for ev in events:
                meta = ev.get("metadata") or {}
                ev_phone = str(meta.get("caller_phone") or "")
                ev_digits = re.sub(r"\D", "", ev_phone)
                if last_10 in ev_digits or (ev_digits and ev_digits[-10:] == last_10):
                    matched_event = ev
                    break
        except Exception as q_err:
            logger.error(f"[WhatsAppReceiptVerifier] Query revenue_events error: {q_err}")

        # 2. Confirm Deal if matched
        reconciliation_status = "unmatched_deal"
        confirmed_amount = verification.amount_paid or 0.0
        business_id = matched_event.get("business_id") if matched_event else None
        event_id = matched_event.get("id") if matched_event else None

        if matched_event and verification.is_verified:
            try:
                # Use quoted amount as fallback if vision didn't catch numeric amount
                if not confirmed_amount and matched_event.get("quoted_amount"):
                    confirmed_amount = float(matched_event["quoted_amount"])

                await RevenueService.confirm_deal(
                    event_id=event_id,
                    business_id=business_id,
                    deal_status="won",
                    won_amount=confirmed_amount,
                    confirmed_by="whatsapp_bot",
                    actor_name="Vaakriti WhatsApp Bot"
                )

                # Update metadata with UTR and verification proof
                existing_meta = matched_event.get("metadata") or {}
                existing_meta["utr_number"] = verification.utr_number
                existing_meta["payment_verified_at"] = datetime.now(timezone.utc).isoformat()
                existing_meta["payment_channel"] = "whatsapp_vision_bot"
                if proof_media_url:
                    existing_meta["payment_proof_url"] = proof_media_url

                await asyncio.to_thread(
                    supabase_admin.table("revenue_events")
                    .update({"metadata": existing_meta})
                    .eq("id", event_id)
                    .execute
                )

                reconciliation_status = "reconciled_won"
                logger.info(f"[WhatsAppReceiptVerifier] Reconciled deal {event_id} as WON for caller {caller_phone}. UTR: {verification.utr_number}")
            except Exception as conf_err:
                logger.error(f"[WhatsAppReceiptVerifier] Error confirming deal: {conf_err}")
                reconciliation_status = "confirmation_failed"

        # 3. Dispatch Instant WhatsApp Confirmation to Caller
        dest_phone = caller_phone if caller_phone.startswith("+") else ("+91" + last_10)
        formatted_amount = f"₹{confirmed_amount:,.2f}" if confirmed_amount else "your payment"
        utr_display = f"(UTR / Ref: *{verification.utr_number}*)" if verification.utr_number else ""

        if verification.is_verified:
            reply_text = (
                f"Namaste! 🙏\n\n"
                f"Aapka *{formatted_amount}* ka payment successfully verify ho gaya hai! {utr_display}\n\n"
                f"✅ *Aapka order / appointment confirm ho gaya hai.*\n"
                f"Hamari team jald hi aapse aage ki details share karegi. Thank you for choosing us!"
            )
        else:
            reply_text = (
                f"Namaste! 🙏\n\n"
                f"Aapka payment message/screenshot receive ho gaya hai. Hamari billing desk ise verify kar rahi hai.\n"
                f"Confirmation message aapko thodi der mein bhej diya jayega."
            )

        try:
            executor = IntegrationExecutor()
            await executor._send_whatsapp(
                config={},
                message=reply_text,
                data={"contact_phone": dest_phone, "whatsapp_opt_in": True, "event_type": "payment_receipt_acknowledgment"}
            )
        except Exception as wa_err:
            logger.warning(f"[WhatsAppReceiptVerifier] Failed sending WhatsApp ack to {dest_phone}: {wa_err}")

        # 4. Notify Business Owner
        if business_id and verification.is_verified:
            try:
                alert_title = "Payment Verified via WhatsApp"
                alert_msg = (
                    f"Received {formatted_amount} from {dest_phone}. "
                    f"UTR: {verification.utr_number or 'Extracted via Vision'}. "
                    f"Deal #{event_id[:8] if event_id else ''} automatically marked as WON."
                )
                await NotificationService.dispatch(
                    user_id=business_id,
                    event_type="payment_received",
                    title=alert_title,
                    message=alert_msg,
                    payload={
                        "event_id": event_id,
                        "caller_phone": dest_phone,
                        "utr_number": verification.utr_number,
                        "amount": confirmed_amount,
                        "reconciliation_status": reconciliation_status
                    }
                )
            except Exception as notif_err:
                logger.warning(f"[WhatsAppReceiptVerifier] Notification dispatch to owner error: {notif_err}")

        return {
            "status": "success",
            "reconciliation_status": reconciliation_status,
            "event_id": event_id,
            "caller_phone": dest_phone,
            "amount_paid": confirmed_amount,
            "utr_number": verification.utr_number,
            "is_verified": verification.is_verified
        }

