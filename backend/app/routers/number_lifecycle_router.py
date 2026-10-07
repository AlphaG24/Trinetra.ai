"""
backend/app/routers/number_lifecycle_router.py

FastAPI Router for Virtual Number Lifecycle (Grace Period, Hold Period & Missed Call Digests).
Implements Master Plan Section 18.7 (Authoritative Overrides).
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.services.number_lifecycle_service import (
    NumberLifecycleService,
    GRACE_PERIOD_DAYS,
    DEFAULT_HOLD_PERIOD_DAYS,
    NEUTRAL_TWIML_RESPONSE,
)

number_lifecycle_router = APIRouter(prefix="/api/numbers/lifecycle", tags=["number-lifecycle"])


class ExpireNumberRequest(BaseModel):
    organization_id: str
    custom_hold_days: Optional[int] = Field(default=None, ge=1, le=90)


class ReactivateNumberRequest(BaseModel):
    organization_id: str
    token: Optional[str] = None


@number_lifecycle_router.post("/{phone_number_id}/expire")
async def expire_phone_number(phone_number_id: str, req: ExpireNumberRequest):
    """
    Transitions an active virtual number into the 15-day grace period.
    """
    service = NumberLifecycleService()
    try:
        updated = service.expire_number(
            phone_number_id=phone_number_id,
            organization_id=req.organization_id,
            custom_hold_days=req.custom_hold_days,
        )
        return {
            "success": True,
            "message": f"Number entered {GRACE_PERIOD_DAYS}-day grace period.",
            "data": updated,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to expire number: {e}")


@number_lifecycle_router.post("/{phone_number_id}/reactivate")
async def reactivate_phone_number(phone_number_id: str, req: ReactivateNumberRequest):
    """
    One-click reactivation for numbers in grace_period or hold_period upon payment/renewal.
    """
    service = NumberLifecycleService()
    try:
        updated = service.reactivate_number(
            phone_number_id=phone_number_id,
            organization_id=req.organization_id,
            token=req.token,
        )
        return {
            "success": True,
            "message": "Number reactivated successfully to active status.",
            "data": updated,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reactivate number: {e}")


@number_lifecycle_router.get("/{phone_number_id}/digest")
async def get_missed_call_digest(phone_number_id: str):
    """
    Generates and returns the daily missed-calls digest for a number in grace/hold.
    """
    service = NumberLifecycleService()
    try:
        digest = service.generate_daily_missed_call_digest(phone_number_id=phone_number_id)
        return {
            "success": True,
            "digest": digest,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate digest: {e}")


@number_lifecycle_router.post("/process-transitions")
async def process_lifecycle_transitions():
    """
    Automated background worker endpoint to advance numbers from grace to hold, and hold to released.
    """
    service = NumberLifecycleService()
    try:
        result = service.process_lifecycle_transitions()
        return {
            "success": True,
            "summary": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process lifecycle transitions: {e}")


@number_lifecycle_router.get("/neutral-unavailable-twiml")
async def get_neutral_twiml():
    """
    Returns the standard neutral TwiML message played to callers during grace/hold.
    """
    return Response(content=NEUTRAL_TWIML_RESPONSE, media_type="application/xml")
