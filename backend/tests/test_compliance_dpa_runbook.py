"""
backend/tests/test_compliance_dpa_runbook.py

Authoritative Test Suite for Task 17:
Data Processing Addendum (DPA), Breach Incident Runbook & Subprocessor Register.
Implements Master Plan Section 18.15 Item 15 & Section 18.16 Statutory Status Labels.

Validates:
1. Subprocessor register completeness across all 11 required infrastructure & voice vendors.
2. Strict statutory status taxonomy: strictly uses 'IMPLEMENTED, pending legal review' / 'VERIFIED' / 'UNVERIFIED', zero 'COMPLIANT'.
3. Customer DPA mandatory clauses: Data Fiduciary / Processor roles, technical safeguards, 30-day subprocessor notice, DSAR assistance.
4. Data breach response runbook: P1-P4 severity triage, CERT-In 6-hour & GDPR 72-hour notification clocks, containment protocols, pre-drafted customer template.
5. Markdown compliance document existence and completeness on disk.
6. Direct FastAPI route logic.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.compliance_service import ComplianceService
from app.routers.compliance_router import (
    get_subprocessors,
    get_dpa_terms,
    get_breach_runbook,
    get_compliance_summary
)


WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class TestSubprocessorRegister:
    def test_required_vendors_present(self):
        subprocessors = ComplianceService.get_subprocessors()
        names = {s["name"].lower() for s in subprocessors}
        
        required_names = [
            "supabase",
            "livekit cloud",
            "exotel",
            "twilio",
            "google gemini api",
            "groq",
            "sarvam ai",
            "elevenlabs",
            "deepgram",
            "razorpay",
            "vultr / digitalocean"
        ]
        for req in required_names:
            assert req in names, f"Required subprocessor '{req}' missing from register."

    def test_subprocessor_schema_completeness(self):
        subprocessors = ComplianceService.get_subprocessors()
        assert len(subprocessors) >= 11

        for s in subprocessors:
            assert "name" in s and s["name"]
            assert "entity" in s and s["entity"]
            assert "category" in s and s["category"]
            assert "data_processed" in s and s["data_processed"]
            assert "location" in s and s["location"]
            assert "safeguards" in s and s["safeguards"]
            assert "status" in s and s["status"]

    def test_telephony_co_location_in_register(self):
        subprocessors = ComplianceService.get_subprocessors()
        exotel = next((s for s in subprocessors if s["name"] == "Exotel"), None)
        twilio = next((s for s in subprocessors if s["name"] == "Twilio"), None)

        assert exotel is not None
        assert twilio is not None
        assert "telephony" in exotel["category"]
        assert "telephony" in twilio["category"]

    def test_statutory_status_taxonomy_no_prohibited_claims(self):
        subprocessors = ComplianceService.get_subprocessors()
        for s in subprocessors:
            status = s["status"]
            # Prohibit raw unhedged 'COMPLIANT' claim per Master Plan 18.16
            assert "COMPLIANT" not in status, f"Subprocessor '{s['name']}' has forbidden 'COMPLIANT' claim: {status}"
            assert any(tag in status for tag in ["VERIFIED", "IMPLEMENTED", "UNVERIFIED"]), (
                f"Subprocessor '{s['name']}' status must use approved taxonomy: {status}"
            )

    def test_subprocessor_register_markdown_file_exists(self):
        reg_path = os.path.join(WORKSPACE_ROOT, "docs", "compliance", "SUBPROCESSOR_REGISTER.md")
        assert os.path.exists(reg_path), "SUBPROCESSOR_REGISTER.md file does not exist on disk."
        with open(reg_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "30-Day Change Notification Protocol" in content
        assert "CONFIRM WITH A LAWYER" in content
        assert "UNVERIFIED, check provider terms" in content


class TestDataProcessingAddendum:
    def test_dpa_parties_and_roles(self):
        dpa = ComplianceService.get_dpa_metadata()
        assert dpa["parties"]["customer"] == "Data Fiduciary / Controller"
        assert dpa["parties"]["company"] == "Data Processor"
        assert dpa["statutory_label"] == "IMPLEMENTED, pending legal review"
        assert dpa["legal_caveat"] == "CONFIRM WITH A LAWYER"

    def test_dpa_technical_safeguards_completeness(self):
        dpa = ComplianceService.get_dpa_metadata()
        safeguards = " ".join(dpa["technical_safeguards"])
        assert "AES-256-GCM" in safeguards
        assert "TLS 1.3" in safeguards
        assert "UIDAI" in safeguards
        assert "Row Level Security" in safeguards
        assert "MFA" in safeguards
        assert "Step-Up Auth" in safeguards

    def test_dpa_notification_timelines(self):
        dpa = ComplianceService.get_dpa_metadata()
        assert dpa["subprocessor_change_notice_days"] == 30
        assert dpa["breach_notification_window_hours"]["cert_in"] == 6
        assert dpa["breach_notification_window_hours"]["gdpr"] == 72

    def test_dpa_markdown_file_exists_and_complete(self):
        dpa_path = os.path.join(WORKSPACE_ROOT, "docs", "compliance", "DATA_PROCESSING_ADDENDUM.md")
        assert os.path.exists(dpa_path), "DATA_PROCESSING_ADDENDUM.md file does not exist on disk."
        with open(dpa_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "1. Scope, Roles & Subject Matter" in content
        assert "3. Technical & Organizational Security Measures" in content
        assert "4. Subprocessor Engagement & Notification" in content
        assert "5. Personal Data Breach Incident Response & Notification" in content
        assert "6. Data Subject Rights & Audit Assistance" in content
        assert "7. Termination, Data Return & Deletion" in content
        assert "CONFIRM WITH A LAWYER" in content


class TestDataBreachRunbook:
    def test_runbook_severity_levels(self):
        runbook = ComplianceService.get_breach_runbook_summary()
        expected_severities = ["P1 - CRITICAL", "P2 - HIGH", "P3 - MEDIUM", "P4 - LOW"]
        assert runbook["severity_levels"] == expected_severities

    def test_runbook_deadlines(self):
        runbook = ComplianceService.get_breach_runbook_summary()
        deadlines = runbook["reporting_deadlines"]
        assert deadlines["cert_in_statutory_window_hours"] == 6
        assert deadlines["gdpr_customer_window_hours"] == 72
        assert "t0" in deadlines

    def test_runbook_containment_protocols(self):
        runbook = ComplianceService.get_breach_runbook_summary()
        protocols = " ".join(runbook["containment_protocols"])
        assert "session" in protocols
        assert "credential rotation" in protocols
        assert "Network" in protocols or "ingress" in protocols
        assert runbook["incident_contact"] == "security@trinetraedu-ai.com"

    def test_breach_runbook_markdown_file_exists_and_complete(self):
        rb_path = os.path.join(WORKSPACE_ROOT, "docs", "compliance", "DATA_BREACH_RUNBOOK.md")
        assert os.path.exists(rb_path), "DATA_BREACH_RUNBOOK.md file does not exist on disk."
        with open(rb_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "Phase 1: Detection, Triage & Clock Activation" in content
        assert "Phase 2: Immediate Containment & Eradication" in content
        assert "Phase 3: Forensic Investigation & Scope Assessment" in content
        assert "Phase 4: Statutory & Customer Notification" in content
        assert "Phase 5: Post-Mortem & Remediation" in content
        assert "Pre-Drafted Customer Breach Notification Template" in content
        assert "CONFIRM WITH A LAWYER" in content


class TestDirectComplianceRouteLogic:
    @pytest.mark.asyncio
    async def test_route_get_subprocessors(self):
        res = await get_subprocessors()
        assert res["success"] is True
        assert res["count"] >= 11
        assert len(res["subprocessors"]) >= 11

    @pytest.mark.asyncio
    async def test_route_get_dpa(self):
        res = await get_dpa_terms()
        assert res["success"] is True
        assert "dpa" in res
        assert res["dpa"]["version"] == "2026.1"

    @pytest.mark.asyncio
    async def test_route_get_breach_runbook(self):
        res = await get_breach_runbook()
        assert res["success"] is True
        assert "runbook" in res
        assert res["runbook"]["reporting_deadlines"]["cert_in_statutory_window_hours"] == 6

    @pytest.mark.asyncio
    async def test_route_get_compliance_summary(self):
        res = await get_compliance_summary()
        assert res["success"] is True
        assert "compliance" in res
        assert res["compliance"]["subprocessor_count"] >= 11
        assert res["compliance"]["statutory_status"] == "IMPLEMENTED, pending legal review"
