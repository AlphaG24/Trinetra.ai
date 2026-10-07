"""
backend/app/routers/compliance_router.py

FastAPI router for Statutory Compliance, Subprocessor Register, and DPA Terms.
Mount point: /api/compliance

Endpoints:
- GET /subprocessors: List active subprocessors
- GET /dpa: Return DPA metadata & technical safeguards
- GET /breach-runbook: Return breach response framework & reporting clocks
- GET /summary: High-level statutory compliance overview
"""

from fastapi import APIRouter
from app.services.compliance_service import ComplianceService

compliance_router = APIRouter(prefix="/api/compliance", tags=["Compliance"])


@compliance_router.get("/subprocessors")
async def get_subprocessors():
    """Returns statutory subprocessor register with processing categories and jurisdictions."""
    return {
        "success": True,
        "count": len(ComplianceService.get_subprocessors()),
        "subprocessors": ComplianceService.get_subprocessors()
    }


@compliance_router.get("/dpa")
async def get_dpa_terms():
    """Returns Customer Data Processing Addendum (DPA) terms and technical safeguards."""
    return {
        "success": True,
        "dpa": ComplianceService.get_dpa_metadata()
    }


@compliance_router.get("/breach-runbook")
async def get_breach_runbook():
    """Returns statutory breach reporting deadlines (CERT-In 6h, GDPR 72h) and containment procedures."""
    return {
        "success": True,
        "runbook": ComplianceService.get_breach_runbook_summary()
    }


@compliance_router.get("/summary")
async def get_compliance_summary():
    """Returns comprehensive statutory overview with mandatory legal caveats."""
    return {
        "success": True,
        "compliance": ComplianceService.get_compliance_overview()
    }


# =====================================================================
# Master Plan Section 3: Global Compliance Strategy Endpoints
# =====================================================================
from typing import Optional
from pydantic import BaseModel, Field
from app.services.regional_compliance_service import RegionalComplianceService


class RegionOverrideRequest(BaseModel):
    customer_id: str
    region_code: str
    reason: str
    overridden_by: str = "admin"
    organization_id: Optional[str] = None


class RegionalKYCValidateRequest(BaseModel):
    region_code: str
    document_type: str
    document_number: Optional[str] = None


@compliance_router.get("/regions")
async def list_regions():
    """Returns all 5 canonical compliance regions with statutory requirements."""
    return RegionalComplianceService.list_all_regions()


@compliance_router.get("/resolve-call")
async def resolve_call_compliance(phone_number: str, customer_id: Optional[str] = None):
    """
    Looks up statutory compliance rules at call time based on +country_code and customer overrides.
    Enforces region-specific KYC, DND, calling window, recording consent, and retention policies.
    """
    return RegionalComplianceService.get_compliance_rules_for_call(
        phone_number=phone_number,
        customer_id=customer_id
    )


@compliance_router.post("/override-region")
async def set_customer_region_override(payload: RegionOverrideRequest):
    """Admin endpoint to set an administrative compliance region override for a customer."""
    try:
        res = RegionalComplianceService.set_customer_override(
            customer_id=payload.customer_id,
            region_code=payload.region_code,
            reason=payload.reason,
            overridden_by=payload.overridden_by,
            organization_id=payload.organization_id
        )
        return res
    except ValueError as e:
        return {"success": False, "error": str(e)}


@compliance_router.delete("/override-region/{customer_id}")
async def clear_customer_region_override(customer_id: str):
    """Admin endpoint to clear a regional override for a customer."""
    cleared = RegionalComplianceService.clear_customer_override(customer_id)
    return {"success": True, "message": f"Region override cleared for customer {customer_id}."}


@compliance_router.post("/validate-kyc")
async def validate_regional_kyc(payload: RegionalKYCValidateRequest):
    """Validates KYC document against regional mandates (e.g. prohibits raw Aadhaar in India)."""
    valid, message = RegionalComplianceService.validate_kyc_for_region(
        region_code=payload.region_code,
        document_type=payload.document_type,
        document_number=payload.document_number
    )
    return {"success": valid, "valid": valid, "message": message}


@compliance_router.get("/check-calling-hours")
async def check_calling_hours(region_code: str, time: Optional[str] = None):
    """Checks whether the specified time is within statutory calling window for the region."""
    valid, message = RegionalComplianceService.check_calling_hours_window(
        region_code=region_code,
        current_time_str=time
    )
    return {"success": valid, "within_window": valid, "message": message}

