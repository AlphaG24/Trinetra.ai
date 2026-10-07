"""
backend/app/services/razorpay_webhook_service.py

Razorpay Webhook Idempotency & Deduplication Engine.
Implements Master Plan Section 18.10 (Authoritative Overrides).

Core Mandates:
1. Strict Cryptographic Signature Verification:
   - Validates Razorpay HMAC-SHA256 signature against webhook secret.
2. Webhook Idempotency & Deduplication:
   - Computes deterministic SHA-256 hash of event payload.
   - Rejects duplicate events by checking processed_webhook_events table.
   - Prevents double-crediting wallets on gateway retry bursts.
3. Zero Card Data Storage:
   - Never stores raw card numbers, CVVs, or banking PINs.
4. Automatic Prepaid Wallet Credits on Payment Capture:
   - Automatically credits organization wallet upon verified 'payment.captured' or 'order.paid' events.
"""

import os
import time
import hmac
import hashlib
import json
import logging
from typing import Dict, Any, Optional, Tuple

from database import supabase_admin
from app.services.wallet_service import WalletService
from app.services.invoice_vault_service import InvoiceVaultService
from app.services.billing_lifecycle_service import InvoiceDeliveryService

logger = logging.getLogger("RazorpayWebhookService")


class RazorpayWebhookService:
    """Enterprise webhook verification and idempotency processing engine."""

    def __init__(self, supabase_client=None):
        self.supabase = supabase_client or supabase_admin
        self.wallet_service = WalletService(supabase_client=self.supabase)
        self.invoice_service = InvoiceVaultService(supabase_client=self.supabase)
        self.delivery_service = InvoiceDeliveryService(supabase_client=self.supabase)

    # -------------------------------------------------------------------------
    # 1. Cryptographic Signature Verification
    # -------------------------------------------------------------------------
    @staticmethod
    def verify_webhook_signature(
        raw_body: bytes,
        signature: str,
        secret: Optional[str] = None,
    ) -> bool:
        """
        Validates Razorpay webhook signature using HMAC-SHA256.
        """
        if not signature or not raw_body:
            return False

        webhook_secret = secret or os.environ.get("RAZORPAY_WEBHOOK_SECRET") or os.environ.get("RAZORPAY_KEY_SECRET", "")
        if not webhook_secret:
            logger.error("RAZORPAY_WEBHOOK_SECRET is not configured.")
            return False

        expected = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature.strip())

    # -------------------------------------------------------------------------
    # 2. Idempotency Hash Computation
    # -------------------------------------------------------------------------
    @staticmethod
    def compute_idempotency_hash(event_id: str, payload_data: Dict[str, Any]) -> str:
        """
        Computes a deterministic SHA-256 hash from event ID and normalized payload.
        """
        raw_str = f"{event_id}:{json.dumps(payload_data, sort_keys=True, separators=(',', ':'))}"
        return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    # -------------------------------------------------------------------------
    # 3. Process Webhook Event (Idempotent)
    # -------------------------------------------------------------------------
    def process_webhook_event(
        self,
        event_payload: Dict[str, Any],
        raw_body: Optional[bytes] = None,
        signature: Optional[str] = None,
        skip_sig_check: bool = False,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Processes incoming Razorpay webhook event with strict deduplication.
        
        Returns:
        - (True, "EVENT_PROCESSED", details) on fresh successful processing.
        - (True, "DUPLICATE_EVENT_IGNORED", details) on idempotent duplicate skip.
        - (False, "SIGNATURE_MISMATCH", details) on signature verification failure.
        - (False, "INVALID_EVENT", details) on malformed payload.
        """
        # 1. Signature Verification
        if not skip_sig_check:
            if not raw_body or not signature:
                return False, "SIGNATURE_MISSING", {"error": "Missing signature or body payload"}
            if not self.verify_webhook_signature(raw_body, signature):
                return False, "SIGNATURE_MISMATCH", {"error": "Invalid Razorpay webhook signature"}

        event_id = str(event_payload.get("event_id") or event_payload.get("id") or "").strip()
        event_type = str(event_payload.get("event") or event_payload.get("event_type") or "").strip()

        if not event_id or not event_type:
            return False, "INVALID_EVENT", {"error": "Missing event ID or event type"}

        idempotency_hash = self.compute_idempotency_hash(event_id, event_payload)

        # 2. Deduplication check in processed_webhook_events
        existing = self.supabase.table("processed_webhook_events").select("id, processed_at").eq("idempotency_hash", idempotency_hash).execute()
        if existing.data and len(existing.data) > 0:
            logger.info(f"Duplicate webhook event ignored: {event_id} (hash: {idempotency_hash})")
            return True, "DUPLICATE_EVENT_IGNORED", {
                "event_id": event_id,
                "event_type": event_type,
                "idempotency_hash": idempotency_hash,
                "message": "Duplicate event successfully skipped with zero duplicate side effects.",
            }

        # 3. Record event in processed_webhook_events BEFORE executing mutations
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        record_payload = {
            "event_id": event_id,
            "event_type": event_type,
            "idempotency_hash": idempotency_hash,
            "provider": "razorpay",
            "processed_at": now_iso,
            "payload": {
                "event": event_type,
                "entity": event_payload.get("payload", {}).get("payment", {}).get("entity", {}).get("id"),
            },
        }
        self.supabase.table("processed_webhook_events").insert(record_payload).execute()

        # 4. Route and handle specific Razorpay event types
        result_details = {
            "event_id": event_id,
            "event_type": event_type,
            "processed_at": now_iso,
        }

        if event_type in ("payment.captured", "order.paid"):
            payment_entity = (
                event_payload.get("payload", {})
                .get("payment", {})
                .get("entity", {})
            )
            amount_paisa = int(payment_entity.get("amount", 0))
            payment_id = payment_entity.get("id", event_id)
            notes = payment_entity.get("notes", {}) or {}
            org_id = notes.get("organization_id")

            if org_id and amount_paisa > 0:
                # Credit organization wallet
                wallet = self.wallet_service.credit_wallet(
                    organization_id=org_id,
                    amount_paisa=amount_paisa,
                    tx_type="topup",
                    reference_id=payment_id,
                    description=f"Automated top-up via Razorpay ({payment_id})",
                )
                result_details["wallet_credited"] = True
                result_details["credited_amount_paisa"] = amount_paisa
                result_details["new_balance_paisa"] = wallet.get("balance_paisa")

                # Auto-generate GST invoice in vault (Master Plan Section 18.10 & B6)
                try:
                    invoice = self.invoice_service.create_invoice_for_wallet_topup(
                        organization_id=org_id,
                        amount_paisa=amount_paisa,
                        payment_reference_id=payment_id,
                        customer_legal_name=notes.get("legal_name") or notes.get("customer_name"),
                        customer_gstin=notes.get("gstin"),
                        customer_state=notes.get("state"),
                        customer_state_code=notes.get("state_code"),
                        transaction_type="wallet_topup",
                    )
                    result_details["invoice_generated"] = True
                    result_details["invoice_number"] = invoice.get("invoice_number")

                    # Dispatch multi-channel delivery (Email + WhatsApp India + Vault per B4)
                    try:
                        recipient_email = payment_entity.get("email") or notes.get("email")
                        recipient_phone = payment_entity.get("contact") or notes.get("phone")
                        self.delivery_service.deliver_invoice(
                            invoice_id=invoice.get("id"),
                            organization_id=org_id,
                            recipient_email=recipient_email,
                            recipient_phone=recipient_phone,
                        )
                        result_details["invoice_delivered"] = True
                    except Exception as del_err:
                        logger.warning(f"Could not deliver invoice for payment {payment_id}: {del_err}")
                        result_details["invoice_delivered"] = False
                except Exception as inv_err:
                    logger.warning(f"Could not auto-generate invoice for payment {payment_id}: {inv_err}")
                    result_details["invoice_generated"] = False
                    result_details["invoice_error"] = str(inv_err)
            else:
                result_details["wallet_credited"] = False
                result_details["note"] = "No organization_id found in payment notes."

        elif event_type == "refund.processed":
            refund_entity = (
                event_payload.get("payload", {})
                .get("refund", {})
                .get("entity", {})
            )
            amount_paisa = int(refund_entity.get("amount", 0))
            refund_id = refund_entity.get("id", event_id)
            notes = refund_entity.get("notes", {}) or {}
            org_id = notes.get("organization_id")

            if org_id and amount_paisa > 0:
                self.wallet_service.debit_wallet(
                    organization_id=org_id,
                    amount_paisa=amount_paisa,
                    tx_type="refund",
                    reference_id=refund_id,
                    description=f"Refund processed via Razorpay ({refund_id})",
                )
                result_details["refund_recorded"] = True
            else:
                result_details["refund_recorded"] = False

        return True, "EVENT_PROCESSED", result_details
