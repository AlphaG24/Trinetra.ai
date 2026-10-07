"""
backend/app/routers/admin_operations_router.py

FastAPI router for Essential Operations Admin Panel.
Mount point: /api/admin/operations

Endpoints:
- GET /users: List users and organization context
- POST /users/{id}/role: Update role (requires Step-Up token 'role_change')
- POST /users/{id}/status: Toggle active/suspended status
- POST /wallets/{org_id}/adjust: Adjust balance (requires Step-Up token 'wallet_adjust')
- POST /telephony/pricing: Update telephony pricing (requires Step-Up token 'price_change')
- GET /audit-trail: Query administrative audit trail
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field

from app.services.essential_admin_service import EssentialAdminService


router = APIRouter(prefix="/api/admin/operations", tags=["Admin Operations"])


def get_admin_service():
    return EssentialAdminService()


class UpdateRoleRequest(BaseModel):
    new_role: str = Field(..., description="Target role: customer, developer_tester, admin")
    step_up_token: str = Field(..., description="HMAC-signed Step-Up Auth token for 'role_change'")
    reason: str = Field(..., min_length=5, description="Statutory justification for role transition")


class ToggleStatusRequest(BaseModel):
    is_active: bool = Field(..., description="Account active status")
    reason: str = Field(..., min_length=5, description="Operational justification")


class AdjustWalletRequest(BaseModel):
    amount_paisa: int = Field(..., gt=0, description="Amount in paisa (positive integer)")
    adjustment_type: str = Field(..., description="'credit' or 'debit'")
    reason: str = Field(..., min_length=5, description="Statutory accounting justification")
    step_up_token: str = Field(..., description="HMAC-signed Step-Up Auth token for 'wallet_adjust'")


class UpdatePricingRequest(BaseModel):
    pricing_updates: Dict[str, Any] = Field(..., description="Key-value mapping of telephony pricing configs")
    reason: str = Field(..., min_length=5, description="Statutory business reason for pricing update")
    step_up_token: str = Field(..., description="HMAC-signed Step-Up Auth token for 'price_change'")


@router.get("/users")
async def list_users(
    role_filter: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name, email, or id"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    x_user_id: str = Header(..., description="Current authenticated admin user ID"),
    x_user_role: str = Header(..., description="Current authenticated user role"),
    service: EssentialAdminService = Depends(get_admin_service),
):
    try:
        return service.list_users(
            admin_user_id=x_user_id,
            admin_role_raw=x_user_role,
            role_filter=role_filter,
            search_query=search,
            limit=limit,
            offset=offset
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/{target_user_id}/role")
async def update_user_role(
    target_user_id: str,
    payload: UpdateRoleRequest,
    x_user_id: str = Header(..., description="Current authenticated admin user ID"),
    x_user_role: str = Header(..., description="Current authenticated user role"),
    service: EssentialAdminService = Depends(get_admin_service),
):
    try:
        return service.update_user_role(
            admin_user_id=x_user_id,
            admin_role_raw=x_user_role,
            target_user_id=target_user_id,
            new_role=payload.new_role,
            step_up_token=payload.step_up_token,
            reason=payload.reason
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except (ValueError, LookupError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/{target_user_id}/status")
async def toggle_user_status(
    target_user_id: str,
    payload: ToggleStatusRequest,
    x_user_id: str = Header(..., description="Current authenticated admin user ID"),
    x_user_role: str = Header(..., description="Current authenticated user role"),
    service: EssentialAdminService = Depends(get_admin_service),
):
    try:
        return service.toggle_user_status(
            admin_user_id=x_user_id,
            admin_role_raw=x_user_role,
            target_user_id=target_user_id,
            is_active=payload.is_active,
            reason=payload.reason
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except (ValueError, LookupError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/wallets/{organization_id}/adjust")
async def adjust_wallet_balance(
    organization_id: str,
    payload: AdjustWalletRequest,
    x_user_id: str = Header(..., description="Current authenticated admin user ID"),
    x_user_role: str = Header(..., description="Current authenticated user role"),
    service: EssentialAdminService = Depends(get_admin_service),
):
    try:
        return service.adjust_wallet_balance(
            admin_user_id=x_user_id,
            admin_role_raw=x_user_role,
            organization_id=organization_id,
            amount_paisa=payload.amount_paisa,
            adjustment_type=payload.adjustment_type,
            reason=payload.reason,
            step_up_token=payload.step_up_token
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except (ValueError, LookupError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/telephony/pricing")
async def update_telephony_pricing(
    payload: UpdatePricingRequest,
    x_user_id: str = Header(..., description="Current authenticated admin user ID"),
    x_user_role: str = Header(..., description="Current authenticated user role"),
    service: EssentialAdminService = Depends(get_admin_service),
):
    try:
        return service.update_telephony_pricing(
            admin_user_id=x_user_id,
            admin_role_raw=x_user_role,
            pricing_updates=payload.pricing_updates,
            step_up_token=payload.step_up_token,
            reason=payload.reason
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except (ValueError, LookupError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-trail")
async def get_audit_trail(
    action_filter: Optional[str] = Query(None, description="Filter by action"),
    target_type: Optional[str] = Query(None, description="Filter by target type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    x_user_id: str = Header(..., description="Current authenticated admin user ID"),
    x_user_role: str = Header(..., description="Current authenticated user role"),
    service: EssentialAdminService = Depends(get_admin_service),
):
    try:
        return service.get_audit_trail(
            admin_user_id=x_user_id,
            admin_role_raw=x_user_role,
            action_filter=action_filter,
            target_type_filter=target_type,
            limit=limit,
            offset=offset
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
