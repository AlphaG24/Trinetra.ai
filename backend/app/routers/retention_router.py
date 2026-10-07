"""
backend/app/routers/retention_router.py

FastAPI router for Statutory Data Retention Split & Minimization.
Endpoints:
- GET /api/retention/policies: Active retention schedule & statutory legal references.
- POST /api/retention/audit: Non-mutating audit report of eligible vs shielded records.
- POST /api/retention/purge: Data minimization purge with mandatory dry_run=True default.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
import logging

from app.services.retention_policy_service import (
    RetentionPolicyService,
    OPERATIONAL_CALL_RETENTION_DAYS,
    SECURITY_LOG_RETENTION_DAYS,
    STATUTORY_FINANCIAL_RETENTION_YEARS,
    STATUTORY_FINANCIAL_RETENTION_DAYS,
    PERMANENTLY_SHIELDED_TABLES,
    FINANCIALLY_SHIELDED_TABLES,
)

logger = logging.getLogger("retention-router")

router = APIRouter(prefix="/api/retention", tags=["Data Retention & Minimization"])


class RetentionAuditRequest(BaseModel):
    organization_id: Optional[str] = Field(None, description="Optional organization UUID to scope audit")


class RetentionPurgeRequest(BaseModel):
    organization_id: Optional[str] = Field(None, description="Optional organization UUID to scope purge")
    dry_run: bool = Field(True, description="Safety default: dry_run=True reports changes without executing")
    requested_by: Optional[str] = Field("admin", description="Admin identifier initiating the purge")


def get_retention_service() -> RetentionPolicyService:
    return RetentionPolicyService()


@router.get("/policies")
async def get_retention_policies(
    service: RetentionPolicyService = Depends(get_retention_service)
):
    """
    Returns the statutory data retention periods, legal citations, and shield rules.
    """
    cutoffs = service.get_retention_cutoffs()
    return {
        "success": True,
        "policies": {
            "operational_call_recordings": {
                "retention_days": OPERATIONAL_CALL_RETENTION_DAYS,
                "cutoff": cutoffs["operational_call_cutoff"].isoformat(),
                "action": "Purge audio URLs, preserve duration/timestamps for billing",
                "legal_basis": "CERT-In Directions (2022) & DPDP Act Data Minimization",
            },
            "security_logs": {
                "retention_days": SECURITY_LOG_RETENTION_DAYS,
                "cutoff": cutoffs["security_log_cutoff"].isoformat(),
                "action": "Rolling purge after 180 days",
                "legal_basis": "CERT-In Directions (April 28, 2022) Sec 4(6)",
            },
            "statutory_financial_ledger": {
                "retention_years": STATUTORY_FINANCIAL_RETENTION_YEARS,
                "retention_days": STATUTORY_FINANCIAL_RETENTION_DAYS,
                "cutoff": cutoffs["financial_statutory_cutoff"].isoformat(),
                "action": "Strictly shielded; NEVER purged automatically",
                "legal_basis": "Income Tax Act 1961 Sec 44AA & CGST Act 2017 Sec 36 (CONFIRM WITH CA)",
                "shielded_tables": FINANCIALLY_SHIELDED_TABLES,
            },
            "statutory_compliance_logs": {
                "retention": "Permanent",
                "action": "Strictly shielded; NEVER purged",
                "legal_basis": "DPDP Act 2023 Sec 6 & 8",
                "shielded_tables": PERMANENTLY_SHIELDED_TABLES,
            },
        },
    }


@router.post("/audit")
async def audit_retention_endpoint(
    payload: RetentionAuditRequest,
    service: RetentionPolicyService = Depends(get_retention_service),
):
    """
    Runs a dry-run audit of records eligible for operational purge vs shielded financial records.
    Zero data mutations.
    """
    try:
        report = await service.audit_retention_status(organization_id=payload.organization_id)
        return {"success": True, "report": report}
    except Exception as e:
        logger.error(f"[RetentionRouter] Audit error: {e}")
        raise HTTPException(status_code=500, detail="Internal error generating retention audit report.")


@router.post("/purge")
async def purge_retention_endpoint(
    payload: RetentionPurgeRequest,
    service: RetentionPolicyService = Depends(get_retention_service),
):
    """
    Executes retention minimization on operational call media older than 180 days.
    MANDATORY SAFEGUARD: dry_run=True is default. Must pass dry_run=False explicitly to execute.
    """
    try:
        result = await service.execute_retention_purge(
            organization_id=payload.organization_id,
            dry_run=payload.dry_run,
            requested_by=payload.requested_by or "admin",
        )
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"[RetentionRouter] Purge error: {e}")
        raise HTTPException(status_code=500, detail="Internal error executing retention purge.")
