"""
backend/tests/test_support_ticket_system.py

Comprehensive Automated Verification Suite for Task 14:
Support Tickets System (Predefined CFU Call Forwarding & SLA Tracking).
Implements and enforces Master Plan Section 18.15 Item 12.

Governing Standards:
- Master Plan Section 18.15 Item 12:
  - Customer support ticket creation with predefined CFU flows.
  - Carrier-tailored dial codes (Airtel, Jio, Vi, BSNL, AT&T, Verizon, T-Mobile, GSM/CDMA).
  - Automated status notifications & test call verification dispatch.
  - Multi-tiered SLA tracking (Urgent/CFU: 4h, High: 8h, Medium: 24h, Low: 48h).
  - SLA breach & escalation detection.
  - Admin triage queue sorted by SLA urgency.
  - Strict multi-tenant isolation (Org A cannot read/mutate Org B's tickets).
- Direct service-layer and route-level verification (bypassing broken starlette/httpx TestClient).
"""

import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.support_ticket_service import (
    SupportTicketService,
    CFU_CARRIER_PROFILES,
    ALLOWED_CATEGORIES,
    ALLOWED_PRIORITIES,
    SLA_HOURS,
)
from app.routers.support_ticket_router import (
    create_cfu_ticket,
    create_standard_ticket,
    list_organization_tickets,
    get_ticket_details,
    add_ticket_reply,
    trigger_cfu_test_call,
    confirm_cfu_verification,
    get_admin_triage_queue,
    assign_ticket_admin,
    CreateCFUTicketRequest,
    CreateTicketRequest,
    AddReplyRequest,
    ConfirmCFUVerificationRequest,
    AssignTicketAdminRequest,
)
from fastapi import HTTPException


# ==============================================================================
# In-Memory Mock Supabase Client for Support Tickets Testing
# ==============================================================================
class MockQueryBuilder:
    def __init__(self, table_data):
        self.table_data = table_data
        self.filters = []
        self._action = "select"
        self._update_payload = None
        self._insert_payload = None
        self._limit_n = None

    def select(self, *args, **kwargs):
        self._action = "select"
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    def insert(self, payload):
        self._action = "insert"
        self._insert_payload = payload
        return self

    def update(self, payload):
        self._action = "update"
        self._update_payload = payload
        return self

    def execute(self):
        if self._action == "insert":
            if isinstance(self._insert_payload, list):
                for r in self._insert_payload:
                    r.setdefault("id", str(uuid.uuid4()))
                self.table_data.extend(self._insert_payload)
                return MagicMock(data=self._insert_payload)
            else:
                self._insert_payload.setdefault("id", str(uuid.uuid4()))
                self.table_data.append(self._insert_payload)
                return MagicMock(data=[self._insert_payload])

        elif self._action == "update":
            matching = []
            for row in self.table_data:
                match = all(row.get(col) == val for col, val in self.filters)
                if match:
                    row.update(self._update_payload)
                    matching.append(dict(row))
            return MagicMock(data=matching)

        else:  # select
            results = []
            for row in self.table_data:
                match = all(row.get(col) == val for col, val in self.filters)
                if match:
                    results.append(dict(row))

            if self._limit_n:
                results = results[:self._limit_n]

            return MagicMock(data=results)


class MockSupabaseClient:
    def __init__(self):
        self.tables = {
            "support_tickets": [],
            "profiles": [],
        }

    def table(self, name: str):
        if name not in self.tables:
            self.tables[name] = []
        return MockQueryBuilder(self.tables[name])


# ==============================================================================
# Suite 1: Carrier CFU Dial Code Resolution & Formatting
# ==============================================================================
class TestCFUCarrierResolution:
    """Verifies telecom carrier MMI/USSD dial codes generation across regional and global operators."""

    def test_jio_carrier_resolution(self):
        """Reliance Jio uses *401*<target> for immediate unconditional forwarding."""
        info = SupportTicketService.resolve_cfu_instructions("Jio", "+918012345678")
        assert info["carrier_name"] == "Reliance Jio"
        assert info["activate_code"] == "*401*+918012345678"
        assert info["deactivate_code"] == "*402"
        assert "*401*" in info["instructions"]

    def test_airtel_carrier_resolution(self):
        """Bharti Airtel uses standard GSM *21*<target>#."""
        info = SupportTicketService.resolve_cfu_instructions("Bharti Airtel", "+918012345678")
        assert info["carrier_name"] == "Bharti Airtel"
        assert info["activate_code"] == "*21*+918012345678#"
        assert info["deactivate_code"] == "##21#"

    def test_vi_carrier_resolution(self):
        """Vodafone Idea (Vi) uses *21*<target>#."""
        info = SupportTicketService.resolve_cfu_instructions("Vodafone Idea", "+918012345678")
        assert "Vi" in info["carrier_name"]
        assert info["activate_code"] == "*21*+918012345678#"

    def test_bsnl_carrier_resolution(self):
        """BSNL uses *21*<target>#."""
        info = SupportTicketService.resolve_cfu_instructions("BSNL", "+918012345678")
        assert info["carrier_name"] == "BSNL"
        assert info["activate_code"] == "*21*+918012345678#"

    def test_verizon_carrier_resolution(self):
        """Verizon uses *72<target> and deactivates with *73."""
        info = SupportTicketService.resolve_cfu_instructions("Verizon", "+14155550199")
        assert info["carrier_name"] == "Verizon Wireless"
        assert info["activate_code"] == "*72+14155550199"
        assert info["deactivate_code"] == "*73"

    def test_att_carrier_resolution(self):
        """AT&T uses *21*<target>#."""
        info = SupportTicketService.resolve_cfu_instructions("AT&T", "+14155550199")
        assert "AT&T" in info["carrier_name"]
        assert info["activate_code"] == "*21*+14155550199#"

    def test_tmobile_carrier_resolution(self):
        """T-Mobile uses **21*<target>#."""
        info = SupportTicketService.resolve_cfu_instructions("T-Mobile", "+14155550199")
        assert info["carrier_name"] == "T-Mobile"
        assert info["activate_code"] == "**21*+14155550199#"

    def test_generic_fallback_for_unknown_carrier(self):
        """Unknown carrier gracefully falls back to generic GSM *21*<target>#."""
        info = SupportTicketService.resolve_cfu_instructions("Singtel", "+6591234567")
        assert info["carrier_name"] == "Standard GSM Carrier"
        assert info["activate_code"] == "*21*+6591234567#"

    def test_generic_cdma_fallback_for_us_unknown_carrier(self):
        """Unknown US carrier starting with +1 falls back to generic CDMA *72."""
        info = SupportTicketService.resolve_cfu_instructions("UnknownUSCarrier", "+12065550123")
        assert info["carrier_name"] == "Standard CDMA / Landline"
        assert info["activate_code"] == "*72+12065550123"


# ==============================================================================
# Suite 2: Automated SLA Calculation & Health Evaluation
# ==============================================================================
class TestSLAManagement:
    """Verifies statutory SLA deadline computation and real-time breach/escalation tracking."""

    def test_sla_due_date_calculation_by_priority(self):
        """Urgent = 4h, High = 8h, Medium = 24h, Low = 48h."""
        now = datetime.now(timezone.utc)

        urgent_due = datetime.fromisoformat(SupportTicketService.calculate_sla_due_at("urgent"))
        assert 3.9 <= (urgent_due - now).total_seconds() / 3600 <= 4.1

        high_due = datetime.fromisoformat(SupportTicketService.calculate_sla_due_at("high"))
        assert 7.9 <= (high_due - now).total_seconds() / 3600 <= 8.1

        med_due = datetime.fromisoformat(SupportTicketService.calculate_sla_due_at("medium"))
        assert 23.9 <= (med_due - now).total_seconds() / 3600 <= 24.1

        low_due = datetime.fromisoformat(SupportTicketService.calculate_sla_due_at("low"))
        assert 47.9 <= (low_due - now).total_seconds() / 3600 <= 48.1

    def test_evaluate_sla_status_within_sla(self):
        """Ticket with > 2 hours remaining is healthy ('within_sla')."""
        future = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
        status = SupportTicketService.evaluate_sla_status(future, "open")
        assert status == "within_sla"

    def test_evaluate_sla_status_escalated(self):
        """Ticket with <= 2 hours remaining transitions to 'escalated'."""
        near_expiry = (datetime.now(timezone.utc) + timedelta(minutes=90)).isoformat()
        status = SupportTicketService.evaluate_sla_status(near_expiry, "open")
        assert status == "escalated"

    def test_evaluate_sla_status_breached(self):
        """Ticket past due date is marked 'breached'."""
        past = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
        status = SupportTicketService.evaluate_sla_status(past, "open")
        assert status == "breached"

    def test_evaluate_sla_status_resolved_or_closed_never_breached(self):
        """Resolved or closed tickets are not marked breached even if past due."""
        past = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        assert SupportTicketService.evaluate_sla_status(past, "resolved") == "within_sla"
        assert SupportTicketService.evaluate_sla_status(past, "closed") == "within_sla"


# ==============================================================================
# Suite 3: CFU Predefined Ticket Lifecycle & Verification Flow
# ==============================================================================
class TestCFUTicketLifecycle:
    """Verifies end-to-end CFU forwarding request, dial code instructions, and test call sign-off."""

    @pytest.fixture
    def mock_db(self):
        return MockSupabaseClient()

    @pytest.fixture
    def ticket_service(self, mock_db):
        return SupportTicketService(supabase_client=mock_db)

    def test_create_cfu_ticket_flow(self, ticket_service, mock_db):
        """Creates specialized CFU ticket with instructions and initial system message."""
        org_id = "org_client_001"
        res = ticket_service.create_cfu_ticket(
            organization_id=org_id,
            submitted_by="user_abc_1",
            source_number="+919876543210",
            carrier="Airtel",
            forward_to_number="+918012345678",
            notes="Please verify before 5 PM",
            priority="urgent",
        )

        assert res["category"] == "cfu_forwarding"
        assert res["cfu_source_number"] == "+919876543210"
        assert res["cfu_dial_code"] == "*21*+918012345678#"
        assert res["cfu_verification_status"] == "dial_code_shared"
        assert res["status"] == "open"
        assert res["ticket_number"].startswith("CFU-")
        assert len(res["messages"]) == 2  # System guide + customer note

        # Verify DB insertion
        db_rows = mock_db.tables["support_tickets"]
        assert len(db_rows) == 1
        assert db_rows[0]["cfu_dial_code"] == "*21*+918012345678#"

    def test_cfu_test_call_dispatch(self, ticket_service, mock_db):
        """Customer dials MMI code and triggers automated test call dispatch."""
        org_id = "org_client_002"
        ticket = ticket_service.create_cfu_ticket(
            organization_id=org_id,
            submitted_by="user_abc_2",
            source_number="+919876543210",
            carrier="Jio",
            forward_to_number="+918012345678",
        )

        dispatch_res = ticket_service.trigger_cfu_test_call(
            ticket_id=ticket["id"],
            organization_id=org_id,
        )

        assert dispatch_res["cfu_verification_status"] == "test_call_pending"

        # Verify ticket status moved to in_progress
        updated = ticket_service.get_ticket(ticket["id"], org_id)
        assert updated["cfu_verification_status"] == "test_call_pending"
        assert updated["status"] == "in_progress"
        assert any("Automated CFU test call initiated" in m["message"] for m in updated["messages"])

    def test_confirm_cfu_verification_success(self, ticket_service, mock_db):
        """Successful test call confirms verification and marks ticket resolved."""
        org_id = "org_client_003"
        ticket = ticket_service.create_cfu_ticket(
            organization_id=org_id,
            submitted_by="user_abc_3",
            source_number="+919876543210",
            carrier="Vi",
            forward_to_number="+918012345678",
        )

        confirm_res = ticket_service.confirm_cfu_verification(
            ticket_id=ticket["id"],
            organization_id=org_id,
            verified=True,
            notes="Inbound call successfully received at AI agent pipeline.",
        )

        assert confirm_res["cfu_verification_status"] == "verified"
        assert confirm_res["status"] == "resolved"
        assert confirm_res["resolved_at"] is not None

        updated = ticket_service.get_ticket(ticket["id"], org_id)
        assert updated["status"] == "resolved"
        assert updated["cfu_verification_status"] == "verified"

    def test_confirm_cfu_verification_failure(self, ticket_service, mock_db):
        """Failed test call marks status waiting_on_client without resolving."""
        org_id = "org_client_004"
        ticket = ticket_service.create_cfu_ticket(
            organization_id=org_id,
            submitted_by="user_abc_4",
            source_number="+919876543210",
            carrier="BSNL",
            forward_to_number="+918012345678",
        )

        confirm_res = ticket_service.confirm_cfu_verification(
            ticket_id=ticket["id"],
            organization_id=org_id,
            verified=False,
            notes="Call rang out on customer phone without forwarding. Check MMI activation.",
        )

        assert confirm_res["cfu_verification_status"] == "failed"
        assert confirm_res["status"] == "waiting_on_client"
        assert confirm_res["resolved_at"] is None


# ==============================================================================
# Suite 4: Standard Ticket Creation & Conversation Threading
# ==============================================================================
class TestStandardTicketAndConversation:
    """Verifies general ticket creation, category validation, and message reply status transitions."""

    @pytest.fixture
    def mock_db(self):
        return MockSupabaseClient()

    @pytest.fixture
    def ticket_service(self, mock_db):
        return SupportTicketService(supabase_client=mock_db)

    def test_create_standard_ticket_success(self, ticket_service, mock_db):
        """Creates standard ticket with validated category and priority."""
        org_id = "org_standard_01"
        res = ticket_service.create_ticket(
            organization_id=org_id,
            submitted_by="user_std",
            subject="Invoice tax breakdown inquiry",
            category="billing",
            priority="medium",
            message="Need clarification on IGST vs CGST/SGST on our last recharge.",
            sender_name="Ketan Singh",
        )

        assert res["subject"] == "Invoice tax breakdown inquiry"
        assert res["category"] == "billing"
        assert res["priority"] == "medium"
        assert res["status"] == "open"
        assert res["ticket_number"].startswith("TCK-")
        assert len(res["messages"]) == 1

    def test_create_ticket_invalid_category_rejected(self, ticket_service):
        """Unknown categories raise ValueError."""
        with pytest.raises(ValueError, match="Invalid category"):
            ticket_service.create_ticket(
                organization_id="org_bad",
                submitted_by="u1",
                subject="Test",
                category="unsupported_category",
                priority="low",
                message="Hello",
            )

    def test_add_reply_admin_sets_waiting_on_client(self, ticket_service, mock_db):
        """When an admin replies, ticket status transitions to 'waiting_on_client'."""
        org_id = "org_reply_01"
        t = ticket_service.create_ticket(
            organization_id=org_id,
            submitted_by="u1",
            subject="Bug report",
            category="bug_report",
            priority="high",
            message="Agent latency spike observed.",
        )

        reply_res = ticket_service.add_reply(
            ticket_id=t["id"],
            organization_id=org_id,
            sender_role="admin",
            sender_name="Support Engineer",
            message="We have deployed a patch. Please verify your latency.",
        )

        assert reply_res["status"] == "waiting_on_client"

        # Client replies back -> transitions to 'in_progress'
        reply_client = ticket_service.add_reply(
            ticket_id=t["id"],
            organization_id=org_id,
            sender_role="client",
            sender_name="Customer",
            message="Confirmed, latency is back to normal. Thank you!",
        )
        assert reply_client["status"] == "in_progress"


# ==============================================================================
# Suite 5: Multi-Tenant Isolation & Admin Triage Queue
# ==============================================================================
class TestMultiTenantIsolationAndTriage:
    """Verifies strict tenant boundary enforcement and prioritized admin triage queue."""

    @pytest.fixture
    def mock_db(self):
        return MockSupabaseClient()

    @pytest.fixture
    def ticket_service(self, mock_db):
        return SupportTicketService(supabase_client=mock_db)

    def test_cross_tenant_ticket_access_rejected(self, ticket_service, mock_db):
        """Org A cannot read or reply to Org B's tickets."""
        t_b = ticket_service.create_ticket(
            organization_id="org_victim_b",
            submitted_by="u_b",
            subject="Confidential Enterprise Issue",
            category="account",
            priority="urgent",
            message="Private credentials need rotation.",
        )

        # Attacker org_a attempts to read ticket
        with pytest.raises(PermissionError, match="tenant boundary violation"):
            ticket_service.get_ticket(t_b["id"], "org_attacker_a")

        # Attacker org_a attempts to reply to ticket
        with pytest.raises(PermissionError, match="tenant boundary violation"):
            ticket_service.add_reply(
                ticket_id=t_b["id"],
                organization_id="org_attacker_a",
                sender_role="client",
                sender_name="Intruder",
                message="Attacking ticket",
            )

    def test_admin_triage_queue_sla_urgency_ordering(self, ticket_service, mock_db):
        """Admin triage queue orders breached tickets before healthy tickets."""
        now = datetime.now(timezone.utc)

        # 1. Healthy ticket (within SLA, due in 20 hours)
        mock_db.tables["support_tickets"].append({
            "id": "t_healthy",
            "subject": "Healthy Ticket",
            "category": "general",
            "priority": "low",
            "status": "open",
            "sla_due_at": (now + timedelta(hours=20)).isoformat(),
        })

        # 2. Breached ticket (due 2 hours ago)
        mock_db.tables["support_tickets"].append({
            "id": "t_breached",
            "subject": "Breached Ticket",
            "category": "cfu_forwarding",
            "priority": "urgent",
            "status": "open",
            "sla_due_at": (now - timedelta(hours=2)).isoformat(),
        })

        # 3. Escalated ticket (due in 45 minutes)
        mock_db.tables["support_tickets"].append({
            "id": "t_escalated",
            "subject": "Escalated Ticket",
            "category": "agent_issue",
            "priority": "high",
            "status": "open",
            "sla_due_at": (now + timedelta(minutes=45)).isoformat(),
        })

        queue = ticket_service.get_admin_triage_queue()
        assert len(queue) == 3
        # Ordering must be: breached -> escalated -> within_sla
        assert queue[0]["id"] == "t_breached"
        assert queue[0]["sla_status"] == "breached"
        assert queue[1]["id"] == "t_escalated"
        assert queue[1]["sla_status"] == "escalated"
        assert queue[2]["id"] == "t_healthy"
        assert queue[2]["sla_status"] == "within_sla"

    def test_admin_triage_queue_filter_only_breached(self, ticket_service, mock_db):
        """Filter only_sla_breached=True returns strictly breached tickets."""
        now = datetime.now(timezone.utc)
        mock_db.tables["support_tickets"].extend([
            {"id": "t1", "subject": "A", "status": "open", "sla_due_at": (now - timedelta(hours=1)).isoformat()},
            {"id": "t2", "subject": "B", "status": "open", "sla_due_at": (now + timedelta(hours=5)).isoformat()},
        ])

        breached = ticket_service.get_admin_triage_queue(only_sla_breached=True)
        assert len(breached) == 1
        assert breached[0]["id"] == "t1"

    def test_assign_ticket_admin(self, ticket_service, mock_db):
        """Admin operator assignment successfully updates assigned_admin_id."""
        ticket_id = "t_assign_1"
        mock_db.tables["support_tickets"].append({
            "id": ticket_id,
            "subject": "Unassigned",
            "status": "open",
            "assigned_admin_id": None,
        })

        res = ticket_service.assign_ticket_admin(ticket_id, "admin_user_99")
        assert res["assigned_admin_id"] == "admin_user_99"


# ==============================================================================
# Suite 6: Direct Handler-Level Route Verification
# ==============================================================================
class TestDirectSupportRouteLogic:
    """Direct invocation of FastAPI router handlers with mocked dependencies."""

    @pytest.mark.asyncio
    async def test_route_create_cfu_ticket(self):
        """Tests create_cfu_ticket endpoint handler."""
        with patch("app.routers.support_ticket_router.SupportTicketService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.create_cfu_ticket.return_value = {
                "id": "tck_cfu_1",
                "ticket_number": "CFU-261004-ABCD",
                "category": "cfu_forwarding",
                "cfu_dial_code": "*21*+918012345678#",
            }

            req = CreateCFUTicketRequest(
                organization_id="org_route",
                source_number="+919876543210",
                carrier="Airtel",
                forward_to_number="+918012345678",
            )
            res = await create_cfu_ticket(req)

            assert res["success"] is True
            assert res["ticket"]["id"] == "tck_cfu_1"

    @pytest.mark.asyncio
    async def test_route_create_standard_ticket(self):
        """Tests create_standard_ticket endpoint handler."""
        with patch("app.routers.support_ticket_router.SupportTicketService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.create_ticket.return_value = {
                "id": "tck_std_1",
                "ticket_number": "TCK-261004-9988",
                "category": "billing",
            }

            req = CreateTicketRequest(
                organization_id="org_route",
                subject="Billing issue",
                category="billing",
                message="Need receipt",
            )
            res = await create_standard_ticket(req)

            assert res["success"] is True
            assert res["ticket"]["id"] == "tck_std_1"

    @pytest.mark.asyncio
    async def test_route_trigger_cfu_test_call(self):
        """Tests trigger_cfu_test_call endpoint handler."""
        with patch("app.routers.support_ticket_router.SupportTicketService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.trigger_cfu_test_call.return_value = {
                "ticket_id": "tck_1",
                "cfu_verification_status": "test_call_pending",
            }

            res = await trigger_cfu_test_call(ticket_id="tck_1", organization_id="org_1")
            assert res["success"] is True
            assert res["data"]["cfu_verification_status"] == "test_call_pending"

    @pytest.mark.asyncio
    async def test_route_confirm_cfu_verification(self):
        """Tests confirm_cfu_verification endpoint handler."""
        with patch("app.routers.support_ticket_router.SupportTicketService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.confirm_cfu_verification.return_value = {
                "ticket_id": "tck_1",
                "cfu_verification_status": "verified",
                "status": "resolved",
            }

            req = ConfirmCFUVerificationRequest(
                organization_id="org_1",
                verified=True,
                notes="Verified OK",
            )
            res = await confirm_cfu_verification(ticket_id="tck_1", req=req)
            assert res["success"] is True
            assert res["data"]["status"] == "resolved"

    @pytest.mark.asyncio
    async def test_route_admin_triage_queue(self):
        """Tests get_admin_triage_queue endpoint handler."""
        with patch("app.routers.support_ticket_router.SupportTicketService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.get_admin_triage_queue.return_value = [
                {"id": "t1", "sla_status": "breached"},
                {"id": "t2", "sla_status": "within_sla"},
            ]

            res = await get_admin_triage_queue(only_sla_breached=False)
            assert res["success"] is True
            assert res["count"] == 2
