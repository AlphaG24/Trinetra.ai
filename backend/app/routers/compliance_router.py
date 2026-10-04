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
