"""
backend/app/routers/wallet_router.py

FastAPI Router for Prepaid Wallets, Spend Limits, Reliability Score & Razorpay Webhooks.
Implements Master Plan Section 18.9 & 18.10 (Authoritative Overrides).
"""

import os
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, Field

from app.services.wallet_service import (
    WalletService,
    DEFAULT_SPEND_LIMIT_PAISA,
)
from app.services.razorpay_webhook_service import RazorpayWebhookService

wallet_router = APIRouter(prefix="/api/wallet", tags=["wallet"])
webhook_router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


# Request Models
class PreCallCheckRequest(BaseModel):
    organization_id: str
    is_in_progress_call: bool = False
    user_role: Optional[str] = None


class ClaimEmergencyMinutesRequest(BaseModel):
    organization_id: str


class WalletTopupRequest(BaseModel):
    organization_id: str
    amount_paisa: int = Field(gt=0, description="Amount in paisa (e.g. 100000 = ₹1,000)")
    reference_id: Optional[str] = None
    description: Optional[str] = None


@wallet_router.get("/balance")
async def get_wallet_balance(organization_id: str):
    """
    Returns wallet details: balance, spend limit, current spend,
    transparent Reliability Score, and emergency minutes status.
    """
    if not organization_id:
        raise HTTPException(status_code=400, detail="organization_id is required")

    service = WalletService()
    wallet = service.get_or_create_wallet(organization_id)
    score_breakdown = service.recalculate_reliability_score(organization_id)

    return {
        "success": True,
        "wallet": {
            "organization_id": wallet.get("organization_id"),
            "balance_paisa": wallet.get("balance_paisa", 0),
            "balance_inr": wallet.get("balance_paisa", 0) / 100.0,
            "currency": wallet.get("currency", "INR"),
            "spend_limit_paisa": wallet.get("spend_limit_paisa", DEFAULT_SPEND_LIMIT_PAISA),
            "spend_limit_inr": wallet.get("spend_limit_paisa", DEFAULT_SPEND_LIMIT_PAISA) / 100.0,
            "current_spend_paisa": wallet.get("current_spend_paisa", 0),
            "current_spend_inr": wallet.get("current_spend_paisa", 0) / 100.0,
            "emergency_minutes_available": wallet.get("emergency_minutes_available", 0),
            "emergency_minutes_claimed_at": wallet.get("emergency_minutes_claimed_at"),
            "last_topup_at": wallet.get("last_topup_at"),
        },
        "reliability_score": score_breakdown,
    }


@wallet_router.post("/pre-call-check")
async def check_pre_call(req: PreCallCheckRequest):
    """
    Pre-call gating endpoint enforcing spend limit and balance checks.
    
    GUARANTEE: If is_in_progress_call is True, call is NEVER disconnected.
    """
    service = WalletService()
    can_call, status_code, details = service.check_pre_call_permission(
        organization_id=req.organization_id,
        is_in_progress_call=req.is_in_progress_call,
        user_role=req.user_role,
    )

    if not can_call:
        raise HTTPException(status_code=402, detail=details)

    return {"success": True, "authorized": True, "details": details}


@wallet_router.post("/emergency-minutes/claim")
async def claim_emergency_minutes(req: ClaimEmergencyMinutesRequest):
    """
    Claims 50 free emergency minutes for organizations with Reliability Score > 80.
    """
    service = WalletService()
    success, reason, details = service.claim_emergency_minutes(req.organization_id)

    if not success:
        if reason == "INELIGIBLE_SCORE":
            raise HTTPException(status_code=403, detail=details)
        elif reason == "COOLDOWN_ACTIVE":
            raise HTTPException(status_code=429, detail=details)
        else:
            raise HTTPException(status_code=400, detail=details)

    return {
        "success": True,
        "message": "50 free emergency minutes successfully granted.",
        "wallet": details,
    }


@wallet_router.post("/topup")
async def topup_wallet(req: WalletTopupRequest):
    """
    Directly credits the organization's prepaid wallet and records ledger entry.
    """
    service = WalletService()
    updated_wallet = service.credit_wallet(
        organization_id=req.organization_id,
        amount_paisa=req.amount_paisa,
        tx_type="topup",
        reference_id=req.reference_id,
        description=req.description,
    )
    return {"success": True, "wallet": updated_wallet}


@webhook_router.post("/razorpay")
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
):
    """
    Idempotent Razorpay webhook endpoint.
    - Validates cryptographic HMAC-SHA256 signature.
    - Rejects duplicate events with idempotent 200 OK.
    - Credits organization wallet upon payment capture.
    """
    raw_body = await request.body()
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # In development or test mode, check if secret is configured
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET") or os.environ.get("RAZORPAY_KEY_SECRET", "")
    skip_sig = not bool(secret)

    service = RazorpayWebhookService()
    success, status_code, details = service.process_webhook_event(
        event_payload=payload,
        raw_body=raw_body,
        signature=x_razorpay_signature,
        skip_sig_check=skip_sig,
    )

    if not success:
        if status_code in ("SIGNATURE_MISMATCH", "SIGNATURE_MISSING"):
            raise HTTPException(status_code=401, detail=details)
        raise HTTPException(status_code=400, detail=details)

    return {"status": "ok", "details": details}
