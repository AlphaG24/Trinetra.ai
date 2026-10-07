"""
Revenue API Router for Trinetra AI.

Provides endpoints for:
- Fetching revenue metrics (pipeline, confirmed, ROI, breakdown by source)
- Fetching revenue events list for leads & calls
- Confirming deals as Won (with amount) or Lost
- Handling signed, expiring action tokens from WhatsApp & Telegram
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

from app.services.revenue_service import RevenueService, DEFAULT_ATTRIBUTION_WINDOW_DAYS
from database import supabase_admin

logger = logging.getLogger("RevenueRouter")

router = APIRouter(prefix="/api/revenue", tags=["revenue"])


# =====================================================================
# REQUEST SCHEMAS
# =====================================================================

class ConfirmDealRequest(BaseModel):
    event_id: str
    deal_status: str = Field(..., pattern="^(won|lost|open)$")
    won_amount: Optional[float] = Field(None, ge=0.0)


# =====================================================================
# AUTHENTICATION DEPENDENCY
# =====================================================================

async def get_current_business_id(request: Request) -> str:
    """
    Extracts authenticated user/business ID from Supabase Authorization header.
    Throws 401 if missing or invalid.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )

    token = auth_header.replace("Bearer ", "").strip()
    try:
        user_res = supabase_admin.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
        return str(user_res.user.id)
    except Exception as e:
        logger.warning(f"[RevenueRouter] Auth verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")


# =====================================================================
# ROUTES
# =====================================================================

@router.get("/metrics")
async def get_revenue_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    business_id: str = Depends(get_current_business_id)
):
    """
    Fetches estimated pipeline, owner-confirmed revenue, breakdown by source, and ROI.
    Strictly scoped to the authenticated business_id.
    """
    try:
        s_date = datetime.fromisoformat(start_date) if start_date else None
        e_date = datetime.fromisoformat(end_date) if end_date else None
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO-8601.")

    metrics = await RevenueService.get_business_revenue_metrics(
        business_id=business_id,
        start_date=s_date,
        end_date=e_date
    )
    return metrics


@router.get("/events")
async def get_revenue_events(
    deal_status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    business_id: str = Depends(get_current_business_id)
):
    """
    Lists revenue events for this business with status and pagination filtering.
    """
    query = (
        supabase_admin.table("revenue_events")
        .select("*, leads(full_name, phone, company_name), voice_calls(caller_name, caller_phone, duration_seconds)")
        .eq("business_id", business_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    if deal_status and deal_status in ("open", "won", "lost"):
        query = query.eq("deal_status", deal_status)

    res = query.execute()
    return {"events": res.data or [], "limit": limit, "offset": offset}


@router.post("/confirm")
async def confirm_deal_status(
    body: ConfirmDealRequest,
    business_id: str = Depends(get_current_business_id)
):
    """
    Updates a deal status to 'won' or 'lost' with optional confirmed won amount.
    Protected by business_id ownership verification and logged in audit trail.
    """
    try:
        updated = await RevenueService.confirm_deal(
            event_id=body.event_id,
            business_id=business_id,
            deal_status=body.deal_status,
            won_amount=body.won_amount,
            confirmed_by="owner",
            actor_name="Dashboard Owner"
        )
        return {"success": True, "event": updated}
    except PermissionError:
        raise HTTPException(status_code=404, detail="Revenue event not found or access denied")
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        logger.error(f"[RevenueRouter] Error confirming deal: {err}")
        raise HTTPException(status_code=500, detail="Failed to update revenue event")


@router.get("/action", response_class=HTMLResponse)
async def handle_action_link(token: str):
    """
    Handles single-use, expiring action links clicked from WhatsApp or Telegram.
    Renders a sleek, mobile-responsive confirmation UI.
    """
    verified = RevenueService.verify_action_token(token)
    if not verified:
        return HTMLResponse(
            content="""<!DOCTYPE html>
            <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invalid Link</title>
            <style>body{background:#080010;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;}
            .card{background:#13091e;border:1px solid #2d1847;padding:30px;border-radius:16px;max-width:400px;}h2{color:#ef4444;}</style>
            </head><body><div class="card"><h2>⚠️ Link Expired or Invalid</h2><p>This action link is expired or has already been used. Please manage your leads in the Trinetra Dashboard.</p></div></body></html>""",
            status_code=400
        )

    event_id = verified["event_id"]
    business_id = verified["business_id"]
    action = verified.get("action", "won")

    # Fetch event details
    res = supabase_admin.table("revenue_events").select("*").eq("id", event_id).eq("business_id", business_id).maybe_single().execute()
    if not res.data:
        return HTMLResponse(content="<h3>Event not found.</h3>", status_code=404)

    event = res.data
    quoted_amt = event.get("quoted_amount") or 0.0
    currency = event.get("currency", "INR")
    curr_status = event.get("deal_status", "open")

    if action == "lost":
        # Immediate mark as lost
        await RevenueService.confirm_deal(
            event_id=event_id,
            business_id=business_id,
            deal_status="lost",
            confirmed_by="owner",
            actor_name="Action Link (Lost)"
        )
        return HTMLResponse(content=f"""<!DOCTYPE html>
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Deal Marked Lost</title>
        <style>body{{background:#080010;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;}}
        .card{{background:#13091e;border:1px solid #2d1847;padding:30px;border-radius:16px;max-width:400px;}}h2{{color:#a1a1aa;}}</style>
        </head><body><div class="card"><h2>Deal Marked as Lost</h2><p>This lead has been updated. You can reopen it at any time from your Trinetra Dashboard.</p></div></body></html>""")

    # Render Won Confirmation Form
    return HTMLResponse(content=f"""<!DOCTYPE html>
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Confirm Closed Deal</title>
    <style>
      body {{ background:#080010; color:#fff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; }}
      .card {{ background:#13091e; border:1px solid #3b1d61; padding:32px; border-radius:20px; max-width:420px; width:100%; box-shadow:0 10px 40px rgba(0,0,0,0.5); }}
      h2 {{ margin-top:0; font-size:22px; color:#c084fc; }}
      p {{ color:#a1a1aa; font-size:14px; line-height:1.5; }}
      label {{ display:block; font-size:12px; color:#d4d4d8; margin-top:20px; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }}
      input {{ width:100%; box-sizing:border-box; background:#080010; border:1px solid #4c1d95; color:#fff; padding:12px 14px; border-radius:10px; font-size:16px; outline:none; }}
      input:focus {{ border-color:#a855f7; }}
      button {{ width:100%; background:linear-gradient(135deg, #7c3aed, #9333ea); color:#fff; border:none; padding:14px; border-radius:10px; font-weight:bold; font-size:15px; margin-top:24px; cursor:pointer; transition:opacity 0.2s; }}
      button:hover {{ opacity:0.9; }}
      .quote-pill {{ display:inline-block; padding:4px 10px; background:#2e1065; border:1px solid #581c87; border-radius:20px; font-size:12px; color:#d8b4fe; margin-top:8px; }}
    </style>
    </head>
    <body>
      <div class="card">
        <h2>🎉 Confirm Closed Deal</h2>
        <p>Confirm the final revenue closed from this lead for your business analytics.</p>
        <div class="quote-pill">Initial Quote: {currency} {quoted_amt:,.2f}</div>
        <form method="POST" action="/api/revenue/action/submit">
          <input type="hidden" name="token" value="{token}" />
          <label>Final Won Amount ({currency})</label>
          <input type="number" step="0.01" name="won_amount" value="{quoted_amt}" required />
          <button type="submit">Confirm & Add to Revenue</button>
        </form>
      </div>
    </body>
    </html>""")


@router.post("/action/submit", response_class=HTMLResponse)
async def submit_action_form(request: Request):
    """
    Submits the won amount from the action link form.
    """
    form = await request.form()
    token = str(form.get("token", ""))
    won_amount_raw = form.get("won_amount")

    verified = RevenueService.verify_action_token(token)
    if not verified:
        return HTMLResponse(content="<h3>Invalid or expired token.</h3>", status_code=400)

    try:
        won_amt = float(won_amount_raw) if won_amount_raw else None
    except ValueError:
        return HTMLResponse(content="<h3>Invalid amount provided.</h3>", status_code=400)

    event_id = verified["event_id"]
    business_id = verified["business_id"]

    try:
        await RevenueService.confirm_deal(
            event_id=event_id,
            business_id=business_id,
            deal_status="won",
            won_amount=won_amt,
            confirmed_by="owner",
            actor_name="Action Link (Confirmed Won)"
        )
        return HTMLResponse(content=f"""<!DOCTYPE html>
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Revenue Confirmed</title>
        <style>body{{background:#080010;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;}}
        .card{{background:#13091e;border:1px solid #3b1d61;padding:32px;border-radius:20px;max-width:400px;}}h2{{color:#22c55e;}}</style>
        </head><body><div class="card"><h2>✅ Deal Confirmed!</h2><p>₹{won_amt:,.2f} has been added to your confirmed revenue. You can view your updated ROI and source attribution in the Trinetra Dashboard.</p></div></body></html>""")
    except Exception as e:
        logger.error(f"[RevenueRouter] Submit action error: {e}")
        return HTMLResponse(content="<h3>Failed to record confirmation.</h3>", status_code=500)
