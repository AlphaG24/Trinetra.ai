"""
backend/app/routers/caller_rights_router.py

FastAPI router for statutory Caller Rights (DPDP Act 2023 Sec 11/12 & EU GDPR Art 15, 17, 20).
Endpoints:
- POST /api/caller-rights/search: Retrieve all records across 5 tables for a caller's phone.
- POST /api/caller-rights/export: Export records in machine-readable JSON or CSV format.
- POST /api/caller-rights/delete: Erase/anonymize records (defaults strictly to dry_run=True).
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, Literal
import logging

from app.services.caller_rights_service import CallerRightsService

logger = logging.getLogger("caller-rights-router")

router = APIRouter(prefix="/api/caller-rights", tags=["Caller Rights & DSAR"])


class CallerSearchRequest(BaseModel):
    organization_id: str = Field(..., description="Organization UUID for tenant isolation")
    phone_number: str = Field(..., min_length=7, max_length=25, description="Caller phone number")


class CallerExportRequest(BaseModel):
    organization_id: str = Field(..., description="Organization UUID for tenant isolation")
    phone_number: str = Field(..., min_length=7, max_length=25, description="Caller phone number")
    format: Literal["json", "csv"] = Field("json", description="Export format: json or csv")


class CallerErasureRequest(BaseModel):
    organization_id: str = Field(..., description="Organization UUID for tenant isolation")
    phone_number: str = Field(..., min_length=7, max_length=25, description="Caller phone number")
    dry_run: bool = Field(True, description="Strict safety default: dry_run=True reports changes without executing")
    reason: str = Field("caller_gdpr_dpdp_request", description="Statutory or operational justification")
    requested_by: Optional[str] = Field("admin", description="Admin identifier initiating the request")


def get_caller_rights_service() -> CallerRightsService:
    return CallerRightsService()


@router.post("/search")
async def search_caller_data_endpoint(
    payload: CallerSearchRequest,
    service: CallerRightsService = Depends(get_caller_rights_service),
):
    """
    Search for all records associated with a caller's phone number within an organization.
    Multi-tenant isolated: only returns records matching the specified organization_id.
    """
    try:
        data = await service.search_caller_data(payload.organization_id, payload.phone_number)
        return {"success": True, "result": data}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"[CallerRightsRouter] Search error: {e}")
        raise HTTPException(status_code=500, detail="Internal error searching caller records.")


@router.post("/export")
async def export_caller_data_endpoint(
    payload: CallerExportRequest,
    service: CallerRightsService = Depends(get_caller_rights_service),
):
    """
    Export caller records in machine-readable JSON or CSV format under DPDP / GDPR.
    """
    try:
        export_data = await service.export_caller_data(
            payload.organization_id, payload.phone_number, export_format=payload.format
        )
        return {"success": True, "result": export_data}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"[CallerRightsRouter] Export error: {e}")
        raise HTTPException(status_code=500, detail="Internal error exporting caller records.")


@router.post("/delete")
async def erase_caller_data_endpoint(
    payload: CallerErasureRequest,
    service: CallerRightsService = Depends(get_caller_rights_service),
):
    """
    Erase or anonymize personal identifiers for a caller under DPDP Act 2023 Sec 12 / GDPR Art 17.
    MANDATORY SAFEGUARD: dry_run=True is default. To execute real deletion, client must explicitly pass dry_run=False.
    """
    try:
        erasure_result = await service.erase_caller_data(
            organization_id=payload.organization_id,
            phone_number=payload.phone_number,
            dry_run=payload.dry_run,
            reason=payload.reason,
            requested_by=payload.requested_by or "admin",
        )
        return {"success": True, "result": erasure_result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"[CallerRightsRouter] Erasure error: {e}")
        raise HTTPException(status_code=500, detail="Internal error processing erasure request.")
