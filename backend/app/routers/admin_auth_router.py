"""
backend/app/routers/admin_auth_router.py

FastAPI Router for Admin Sessions, Mandatory MFA & Privileged Step-Up Auth.
Implements Master Plan Section 18.4 (Authoritative Overrides).
"""

import time
import os
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel, Field

from app.services.admin_auth_service import (
    AdminAuthService,
    ADMIN_IDLE_TIMEOUT_SECONDS,
    STEP_UP_TOKEN_VALIDITY_SECONDS,
    verify_totp_code,
)
from app.services.role_policy_service import (
    UserRole,
    normalize_role,
    STEP_UP_REAUTH_ACTIONS,
)

admin_auth_router = APIRouter(prefix="/api/admin/auth", tags=["admin_auth"])


# Pydantic Request Models
class SessionVerifyRequest(BaseModel):
    user_id: str
    role: str
    last_active_at: float
    is_mfa_verified: bool = False


class StepUpChallengeRequest(BaseModel):
    user_id: str
    role: str
    action: str
    credential_type: str = Field(default="password", description="'password' or 'totp'")
    credential: str = Field(..., description="Admin password or 6-digit TOTP code")
    totp_secret: Optional[str] = None


class KycViewRequest(BaseModel):
    user_id: str
    role: str
    document_id: str
    step_up_token: str


class PrivilegedActionRequest(BaseModel):
    user_id: str
    role: str
    action: str
    target_resource: str
    step_up_token: str
    payload: Optional[Dict[str, Any]] = None


@admin_auth_router.post("/session/verify")
async def verify_admin_session(req: SessionVerifyRequest):
    """
    Verifies admin session validity enforcing:
    1. Role check (admin or developer_tester).
    2. Mandatory MFA verification for admin and developer_tester accounts.
    3. 30-Minute idle session timeout.
    """
    is_valid, status_code, details = AdminAuthService.validate_admin_session(
        user_id=req.user_id,
        role_raw=req.role,
        last_active_at=req.last_active_at,
        is_mfa_verified=req.is_mfa_verified,
        current_time=time.time(),
    )

    if not is_valid:
        if status_code == "SESSION_EXPIRED":
            raise HTTPException(status_code=401, detail=details)
        elif status_code == "MFA_REQUIRED":
            raise HTTPException(status_code=403, detail=details)
        elif status_code == "ACCESS_DENIED":
            raise HTTPException(status_code=403, detail=details)
        else:
            raise HTTPException(status_code=400, detail=details)

    return {"success": True, "session": details}


@admin_auth_router.post("/step-up/challenge")
async def step_up_challenge(req: StepUpChallengeRequest):
    """
    Issues a short-lived (300s / 5min) cryptographically signed step-up authorization token
    after validating either admin password or TOTP authenticator code.
    """
    norm_role = normalize_role(req.role)
    if norm_role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Step-up privileged re-authentication is restricted to administrator accounts.",
        )

    act = req.action.strip().lower()
    if act not in STEP_UP_REAUTH_ACTIONS and act != "*":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{act}'. Allowed step-up actions: {list(STEP_UP_REAUTH_ACTIONS)}",
        )

    # Validate Credential
    authenticated = False
    if req.credential_type == "totp":
        secret = req.totp_secret or os.environ.get("ADMIN_TOTP_SECRET") or os.environ.get("MFA_TOTP_SEED", "JBSWY3DPEHPK3PXP")
        authenticated = verify_totp_code(secret, req.credential)
    else:
        # Password validation
        expected_pwd = os.environ.get("ADMIN_PASSWORD", "trinetra-admin-secure-2026")
        authenticated = (req.credential == expected_pwd)

    if not authenticated:
        raise HTTPException(
            status_code=401,
            detail=f"Incorrect {req.credential_type}. Step-up authentication failed.",
        )

    # Issue signed token
    step_up_token = AdminAuthService.issue_step_up_token(
        user_id=req.user_id,
        role_raw=req.role,
        action=act,
        ttl_seconds=STEP_UP_TOKEN_VALIDITY_SECONDS,
    )

    return {
        "success": True,
        "step_up_token": step_up_token,
        "action": act,
        "expires_in_seconds": STEP_UP_TOKEN_VALIDITY_SECONDS,
        "token_type": "BearerStepUp",
    }


@admin_auth_router.post("/kyc/view")
async def secure_kyc_view(req: KycViewRequest, request: Request):
    """
    Guarded gateway for viewing customer KYC documents.
    developer_tester accounts are strictly rejected.
    admin accounts require verified step-up token for 'kyc_view'.
    """
    client_ip = request.client.host if request.client else "unknown"
    service = AdminAuthService()

    authorized, msg = service.authorize_kyc_document_access(
        admin_user_id=req.user_id,
        role_raw=req.role,
        step_up_token=req.step_up_token,
        document_id=req.document_id,
        client_ip=client_ip,
    )

    if not authorized:
        raise HTTPException(status_code=403, detail={"error": msg, "document_id": req.document_id})

    return {
        "success": True,
        "authorized": True,
        "document_id": req.document_id,
        "message": msg,
    }


@admin_auth_router.post("/privileged-action")
async def execute_privileged_action(req: PrivilegedActionRequest):
    """
    Guarded execution gateway for sensitive administrative modifications:
    - wallet_adjust
    - price_change
    - credential_update
    - number_release_override
    """
    service = AdminAuthService()
    act = req.action.strip().lower()

    if act == "wallet_adjust":
        amount = (req.payload or {}).get("adjustment_amount_paisa", 0)
        reason = (req.payload or {}).get("reason", "Admin manual adjustment")
        authorized, msg = service.authorize_wallet_balance_adjustment(
            admin_user_id=req.user_id,
            role_raw=req.role,
            step_up_token=req.step_up_token,
            target_org_id=req.target_resource,
            adjustment_amount_paisa=amount,
            reason=reason,
        )
    elif act == "price_change":
        changes = (req.payload or {}).get("changes", {})
        authorized, msg = service.authorize_global_pricing_change(
            admin_user_id=req.user_id,
            role_raw=req.role,
            step_up_token=req.step_up_token,
            plan_key=req.target_resource,
            changes=changes,
        )
    elif act == "credential_update":
        cred_type = (req.payload or {}).get("credential_type", "api_key")
        authorized, msg = service.authorize_credential_update(
            admin_user_id=req.user_id,
            role_raw=req.role,
            step_up_token=req.step_up_token,
            provider_name=req.target_resource,
            credential_type=cred_type,
        )
    else:
        # General step-up token check for other registered actions
        is_valid, token_msg, _ = service.verify_step_up_token(
            token=req.step_up_token,
            expected_user_id=req.user_id,
            expected_action=act,
        )
        authorized = is_valid
        msg = token_msg

    if not authorized:
        raise HTTPException(status_code=403, detail={"error": msg, "action": act})

    return {
        "success": True,
        "authorized": True,
        "action": act,
        "target_resource": req.target_resource,
        "message": msg,
    }
