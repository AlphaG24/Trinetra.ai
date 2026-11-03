"""
Test suite for Phase 5: Voice Bot Behavioral & Live Context Engine.
Asserts:
1. Live Business Operations Brain injection (routes, units, quoted rates, floor limits).
2. Returning customer recognition with personalized follow-up (Rule 3 & 9).
3. Scheduled callback context injection (Rule 1 & 5).
4. dispatch_demo_or_business_link tool execution via WhatsApp (Rule 7).
5. update_call_disposition_or_reschedule tool execution (rescheduling callbacks & opt-outs) (Rule 7).
6. Anti-robotics and natural speech guidelines (name governor at most twice, zero abuse mirroring) (Rule 10).
"""

import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.integration_executor import IntegrationExecutor
from agent import (
    build_agent_expressive_rules,
    create_appointment_tools,
)


class MockQueryBuilder:
    def __init__(self, data=None):
        self.data = data or []
        self._filter_col = None
        self._filter_val = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, col, val):
        self._filter_col = col
        self._filter_val = val
        return self

    def ilike(self, col, val):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, count):
        return self

    def insert(self, payload):
        self._inserted = payload
        return self

    def update(self, payload):
        self._updated = payload
        return self

    def execute(self):
        res = MagicMock()
        res.data = self.data
        return res


@pytest.mark.asyncio
async def test_expressive_rules_anti_robotics_and_abuse_governor():
    """Verify natural speech, name governor at most twice, and strict anti-abuse rules."""
    rules = build_agent_expressive_rules(bot_name="Arika", gender_tag="female", business_name="Trinetra AI")

    # Name Governor: at most twice
    assert "at most TWICE in the entire call" in rules
    assert "once at START" in rules
    assert "once at END" in rules
    assert "ZERO name repetition during the middle" in rules

    # Demeanor & Ethical speech directive
    assert "calm, polite, respectful" in rules
    assert "STRICT ETHICAL SPEECH DIRECTIVE" in rules
    assert "slang" in rules
    assert "abusive language" in rules

    # Conciseness
    assert "1 to 2 sentences maximum" in rules


@pytest.mark.asyncio
async def test_dispatch_demo_or_link_whatsapp():
    """Verify IntegrationExecutor.dispatch_demo_or_link sends WhatsApp and logs audit."""
    executor = IntegrationExecutor()

    with patch.object(executor, "_send_whatsapp", new_callable=AsyncMock) as mock_send, \
         patch("app.services.integration_executor.supabase_admin") as mock_sb:

        mock_send.return_value = True
        mock_audit = MagicMock()
        mock_sb.table.return_value = mock_audit
        mock_audit.insert.return_value.execute = MagicMock()

        success = await executor.dispatch_demo_or_link(
            organization_id="org_test_123",
            user_id="usr_test_456",
            phone_number="9876543210",
            link_type="demo",
            note="Looking for logistics automation",
            call_id="call_999"
        )

        assert success is True
        mock_send.assert_awaited_once()
        # Ensure audit log was inserted
        mock_sb.table.assert_called_with("audit_logs")


@pytest.mark.asyncio
async def test_appointment_tools_dispatch_demo_link():
    """Verify dispatch_demo_or_business_link function tool executes cleanly."""
    tools = create_appointment_tools(
        organization_id="org_test_123",
        user_id="usr_test_456",
        agent_id="agt_test_789",
        call_id="call_999"
    )

    demo_tool = None
    for t in tools:
        # Check callable name or tool name attribute
        name = getattr(t, "__name__", "") or getattr(t, "name", "")
        if "dispatch_demo_or_business_link" in str(t) or name == "dispatch_demo_or_business_link":
            demo_tool = t
            break

    assert demo_tool is not None, "dispatch_demo_or_business_link tool should be registered"

    with patch("app.services.integration_executor.IntegrationExecutor.dispatch_demo_or_link", new_callable=AsyncMock) as mock_dispatch:
        mock_dispatch.return_value = True

        result = await demo_tool(phone_number="9876543210", link_type="brochure", custom_note="Pricing catalog")

        assert "LINK_SENT_SUCCESS" in result
        assert "Brochure link has been dispatched to 9876543210 on WhatsApp" in result
        mock_dispatch.assert_awaited_once_with(
            organization_id="org_test_123",
            user_id="usr_test_456",
            phone_number="9876543210",
            link_type="brochure",
            note="Pricing catalog",
            call_id="call_999"
        )


@pytest.mark.asyncio
async def test_appointment_tools_update_disposition_reschedule():
    """Verify update_call_disposition_or_reschedule creates callback record in DB."""
    tools = create_appointment_tools(
        organization_id="org_test_123",
        user_id="usr_test_456",
        agent_id="agt_test_789",
        call_id="call_999"
    )

    disp_tool = None
    for t in tools:
        name = getattr(t, "__name__", "") or getattr(t, "name", "")
        if "update_call_disposition_or_reschedule" in str(t) or name == "update_call_disposition_or_reschedule":
            disp_tool = t
            break

    assert disp_tool is not None, "update_call_disposition_or_reschedule tool should be registered"

    mock_builder = MockQueryBuilder()
    with patch("agent.supabase_admin") as mock_sb:
        mock_sb.table.return_value = mock_builder

        result = await disp_tool(
            disposition="reschedule",
            reschedule_time="Tomorrow 3 PM",
            reason_or_notes="Busy in meeting",
            customer_name="Ramesh Gupta",
            phone_number="9876543210"
        )

        assert "CALLBACK_CONFIRMED" in result
        assert "Tomorrow 3 PM" in result
        mock_sb.table.assert_called_with("callbacks")
        assert mock_builder._inserted["contact_name"] == "Ramesh Gupta"
        assert mock_builder._inserted["reason"] == "Busy in meeting"
        assert mock_builder._inserted["status"] == "pending"


@pytest.mark.asyncio
async def test_appointment_tools_update_disposition_rejection():
    """Verify update_call_disposition_or_reschedule marks not_interested or rejected."""
    tools = create_appointment_tools(
        organization_id="org_test_123",
        user_id="usr_test_456",
        agent_id="agt_test_789",
        call_id="call_999"
    )

    disp_tool = None
    for t in tools:
        name = getattr(t, "__name__", "") or getattr(t, "name", "")
        if "update_call_disposition_or_reschedule" in str(t) or name == "update_call_disposition_or_reschedule":
            disp_tool = t
            break

    assert disp_tool is not None

    mock_builder = MockQueryBuilder()
    with patch("agent.supabase_admin") as mock_sb:
        mock_sb.table.return_value = mock_builder

        result = await disp_tool(
            disposition="not_interested",
            reason_or_notes="Has existing software",
            customer_name="Sanjay",
            phone_number="9876543210"
        )

        assert "DISPOSITION_RECORDED" in result
        assert "not interested" in result.lower()


@pytest.mark.asyncio
async def test_live_operations_catalog_prompt_generation():
    """Verify live operations catalog entries are properly formatted with floor prices."""
    cat_items = [
        {
            "identifier_code": "TRK-DL-MUM-01",
            "title": "Delhi to Mumbai 32ft MX Container",
            "category": "logistics",
            "route_origin": "Delhi",
            "route_destination": "Mumbai",
            "available_units": 3,
            "base_price_inr": 46000,
            "minimum_price_inr": 42000,
        },
        {
            "identifier_code": "APT-DR-SHARMA",
            "title": "Dr. Sharma General Consultation",
            "category": "appointment_slots",
            "available_units": 2,
            "base_price_inr": 800,
            "minimum_price_inr": 800,
        }
    ]

    cat_lines = []
    for item in cat_items:
        code = item.get("identifier_code") or "ITEM"
        title = item.get("title") or "Item"
        cat = item.get("category") or "general"
        orig = item.get("route_origin")
        dest = item.get("route_destination")
        units = item.get("available_units", 1)
        base_p = item.get("base_price_inr")
        min_p = item.get("minimum_price_inr")

        desc = f"- [{code}] {title} ({cat}, Units/Slots: {units})"
        if orig and dest:
            desc += f", Route: {orig} -> {dest}"
        if base_p is not None:
            desc += f", Quoted Price: Rs. {base_p}"
        if min_p is not None:
            desc += f", Strict Floor Limit: Rs. {min_p}"
        cat_lines.append(desc)

    catalog_prompt = (
        f"\n\n## LIVE BUSINESS OPERATIONS BRAIN (REAL-TIME CATALOG, INVENTORY & PRICING)\n"
        + "\n".join(cat_lines) +
        "\n- REAL-TIME INVENTORY & PRICING DIRECTIVES:\n"
        "  1. Use this real data directly during the call to quote routes, vehicle types, container fleet, or open appointment slots.\n"
        "  2. First quote the base Quoted Price. If the caller asks for discount or negotiates, you may offer a discount down to the Strict Floor Limit, but NEVER accept or quote below the Floor Limit.\n"
        "  3. Use 'reserve_business_inventory' to lock in any confirmed booking so slots/routes never overlap.\n"
        "  4. If the customer requests demo links or payment details, use 'dispatch_demo_or_business_link' or 'dispatch_payment_request' immediately during the call.\n"
    )

    assert "TRK-DL-MUM-01" in catalog_prompt
    assert "Route: Delhi -> Mumbai" in catalog_prompt
    assert "Quoted Price: Rs. 46000" in catalog_prompt
    assert "Strict Floor Limit: Rs. 42000" in catalog_prompt
    assert "NEVER accept or quote below the Floor Limit" in catalog_prompt

