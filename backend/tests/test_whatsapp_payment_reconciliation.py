"""
Test Suite for WhatsApp Intelligent Payment Bot & Receipt Reconciliation.
Fulfills Changes.md Item 87 and Item 48:
1. Advanced UTR & amount extraction from text receipts (Hindi/English).
2. Gemini Flash Vision multimodal screenshot parsing and extraction.
3. Cash-to-Call automated deal reconciliation against revenue_events.
4. Instant caller receipt dispatch and owner notification.
5. Meta Cloud API and Twilio webhook endpoints.
"""

import os
import sys
import json
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.whatsapp_receipt_verifier import (
    WhatsAppReceiptVerifier,
    ReceiptVerificationResult
)
from app.routers.whatsapp_webhook_router import router as whatsapp_webhook_router

test_app = FastAPI()
test_app.include_router(whatsapp_webhook_router)
client = TestClient(test_app)


# =====================================================================
# 1. TEXT RECEIPT & UTR PARSING TESTS
# =====================================================================

def test_parse_text_receipt_hindi_utr():
    """Verify extraction of 12-digit UTR and INR amount from Hinglish message."""
    msg = "Namaste, maine advance payment 2,500 rupaye kar diya hai GPay se. UTR: 432109876543. Confirm karo."
    res = WhatsAppReceiptVerifier.parse_text_receipt(msg)

    assert res.is_payment_receipt is True
    assert res.is_verified is True
    assert res.utr_number == "432109876543"
    assert res.amount_paid == 2500.0
    assert res.payment_status == "SUCCESS"


def test_parse_text_receipt_english():
    """Verify extraction from English transaction confirmation."""
    msg = "Paid Rs 12,000 via PhonePe. Txn Ref ID: 987654321012. Please proceed with the order."
    res = WhatsAppReceiptVerifier.parse_text_receipt(msg)

    assert res.is_payment_receipt is True
    assert res.is_verified is True
    assert res.utr_number == "987654321012"
    assert res.amount_paid == 12000.0


def test_parse_text_receipt_plain_message():
    """Ensure casual messages without payment indicators are not flagged."""
    msg = "Theek hai bhai, main kal 10 baje call karta hoon."
    res = WhatsAppReceiptVerifier.parse_text_receipt(msg)

    assert res.is_payment_receipt is False
    assert res.is_verified is False
    assert res.utr_number is None


# =====================================================================
# 2. VISION SCREENSHOT PARSING TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_parse_image_receipt_gemini_vision_success():
    """Verify multimodal Gemini Vision processing extracts structured payment receipt."""
    mock_json_response = {
        "is_payment_receipt": True,
        "utr_number": "512345678901",
        "amount_paid": 4800.0,
        "payment_status": "SUCCESS",
        "payee_name_or_upi": "raghav@okaxis",
        "confidence": 0.98
    }

    mock_generate_res = MagicMock()
    mock_generate_res.text = f"```json\n{json.dumps(mock_json_response)}\n```"

    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.models.generate_content.return_value = mock_generate_res

        fake_img_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
        res = await WhatsAppReceiptVerifier.parse_image_receipt(
            image_bytes=fake_img_bytes,
            mime_type="image/jpeg",
            gemini_api_key="mock_key"
        )

        assert res.is_payment_receipt is True
        assert res.is_verified is True
        assert res.utr_number == "512345678901"
        assert res.amount_paid == 4800.0
        assert res.payment_status == "SUCCESS"
        assert res.payee_name_or_upi == "raghav@okaxis"


@pytest.mark.asyncio
async def test_parse_image_receipt_failed_transaction():
    """Verify failed screenshot states are recognized and not marked verified."""
    mock_json_response = {
        "is_payment_receipt": True,
        "utr_number": "123456789012",
        "amount_paid": 1500.0,
        "payment_status": "FAILED",
        "payee_name_or_upi": "store@upi",
        "confidence": 0.95
    }

    mock_generate_res = MagicMock()
    mock_generate_res.text = json.dumps(mock_json_response)

    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.models.generate_content.return_value = mock_generate_res

        res = await WhatsAppReceiptVerifier.parse_image_receipt(
            image_bytes=b"dummy_bytes",
            gemini_api_key="mock_key"
        )

        assert res.is_payment_receipt is True
        assert res.is_verified is False  # Status was FAILED
        assert res.payment_status == "FAILED"


# =====================================================================
# 3. CASH-TO-CALL RECONCILIATION & AUTO-CONFIRMATION TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_reconcile_and_confirm_matches_open_deal():
    """
    Verify caller phone matches open deal in revenue_events, marks deal WON,
    dispatches WhatsApp confirmation to caller, and notifies business owner.
    """
    caller_phone = "+919876543210"
    event_id = "rev_event_test_001"
    business_id = "biz_owner_test_001"

    mock_event = {
        "id": event_id,
        "business_id": business_id,
        "deal_status": "open",
        "quoted_amount": 5000.0,
        "metadata": {
            "caller_phone": "+919876543210"
        }
    }

    verification = ReceiptVerificationResult(
        is_payment_receipt=True,
        is_verified=True,
        utr_number="432198765432",
        amount_paid=5000.0,
        payment_status="SUCCESS"
    )

    with patch("app.services.whatsapp_receipt_verifier.supabase_admin") as mock_admin, \
         patch("app.services.whatsapp_receipt_verifier.RevenueService.confirm_deal", new_callable=AsyncMock) as mock_confirm, \
         patch("app.services.whatsapp_receipt_verifier.IntegrationExecutor._send_whatsapp", new_callable=AsyncMock) as mock_send_wa, \
         patch("app.services.whatsapp_receipt_verifier.NotificationService.dispatch", new_callable=AsyncMock) as mock_notif:

        mock_query = MagicMock()
        mock_admin.table.return_value = mock_query
        mock_query.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_event]
        mock_query.update.return_value.eq.return_value.execute.return_value = MagicMock()

        result = await WhatsAppReceiptVerifier.reconcile_and_confirm(
            caller_phone=caller_phone,
            verification=verification
        )

        assert result["status"] == "success"
        assert result["reconciliation_status"] == "reconciled_won"
        assert result["is_verified"] is True
        assert result["utr_number"] == "432198765432"

        # Assert RevenueService.confirm_deal was invoked with status 'won'
        mock_confirm.assert_awaited_once_with(
            event_id=event_id,
            business_id=business_id,
            deal_status="won",
            won_amount=5000.0,
            confirmed_by="whatsapp_bot",
            actor_name="Vaakriti WhatsApp Bot"
        )

        # Assert customer received confirmation WhatsApp reply
        mock_send_wa.assert_awaited_once()
        wa_call_args = mock_send_wa.call_args[1]
        assert "Aapka *₹5,000.00* ka payment successfully verify ho gaya hai" in wa_call_args["message"]

        # Assert business owner was alerted
        mock_notif.assert_awaited_once()
        notif_args = mock_notif.call_args[1]
        assert notif_args["event_type"] == "payment_received"
        assert notif_args["user_id"] == business_id


# =====================================================================
# 4. WEBHOOK ROUTER ENDPOINTS (META & TWILIO)
# =====================================================================

def test_meta_whatsapp_verification_challenge_success():
    """Verify Meta webhook challenge verification returns the challenge code."""
    with patch.dict(os.environ, {"WHATSAPP_VERIFY_TOKEN": "secret_token_123"}):
        res = client.get("/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=secret_token_123&hub.challenge=test_challenge_code_99")
        assert res.status_code == 200
        assert res.text == "test_challenge_code_99"


def test_meta_whatsapp_verification_challenge_forbidden():
    """Verify unauthorized tokens are rejected with HTTP 403."""
    with patch.dict(os.environ, {"WHATSAPP_VERIFY_TOKEN": "secret_token_123"}):
        res = client.get("/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=99")
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_meta_whatsapp_post_inbound_text_trigger():
    """Verify Meta Cloud API inbound text payload triggers reconciliation."""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1001",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "messages": [
                                {
                                    "from": "919876543210",
                                    "id": "wamid.001",
                                    "type": "text",
                                    "text": {"body": "Maine payment kar di 3000 rs UTR: 432198765432"}
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }

    with patch("app.routers.whatsapp_webhook_router.WhatsAppReceiptVerifier.reconcile_and_confirm", new_callable=AsyncMock) as mock_recon:
        mock_recon.return_value = {"status": "success"}
        res = client.post("/api/webhooks/whatsapp", json=payload)
        assert res.status_code == 200
        assert res.json() == {"status": "received"}
        mock_recon.assert_awaited_once()


def test_twilio_whatsapp_post_inbound_returns_twiml():
    """Verify Twilio WhatsApp webhook handles incoming message and returns valid TwiML."""
    with patch("app.routers.whatsapp_webhook_router.WhatsAppReceiptVerifier.reconcile_and_confirm", new_callable=AsyncMock) as mock_recon:
        mock_recon.return_value = {"status": "success"}
        form_data = {
            "From": "whatsapp:+919876543210",
            "Body": "Payment sent 1500 UTR: 123456789012",
            "NumMedia": "0"
        }
        res = client.post("/api/webhooks/twilio/whatsapp", data=form_data)
        assert res.status_code == 200
        assert "<Response></Response>" in res.text
