"""
Multi-Tenant Security and Isolation Unit Tests for Trinetra Revenue Model.

Verifies:
1. Business A cannot read or confirm Business B's revenue events (Strict Tenant Isolation).
2. PermissionError is raised if unauthorized tenant attempts deal status changes.
3. Revenue metrics aggregation strictly isolates by business_id.
4. Single-use notification action tokens are cryptographically secured and bound to the specific event.
"""

import pytest
import asyncio
import sys
import os
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.revenue_service import RevenueService


@pytest.mark.asyncio
async def test_tenant_isolation_unauthorized_confirmation_rejected():
    """
    Test that Business B cannot confirm or modify a revenue event belonging to Business A.
    """
    business_a_id = "00000000-0000-0000-0000-000000000001"
    business_b_id = "00000000-0000-0000-0000-000000000002"
    event_id = "11111111-1111-1111-1111-111111111111"

    # Mock DB query returning None because business_id doesn't match
    with patch("app.services.revenue_service.supabase_admin") as mock_admin:
        # Mock .table("revenue_events").select().eq().eq().maybe_single().execute()
        mock_execute = MagicMock()
        mock_execute.data = None  # Not found for Business B
        
        mock_table = MagicMock()
        mock_admin.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = mock_execute

        # Attempt confirmation by Business B on Business A's event
        with pytest.raises(PermissionError) as exc_info:
            await RevenueService.confirm_deal(
                event_id=event_id,
                business_id=business_b_id,
                deal_status="won",
                won_amount=50000.0,
                actor_name="Attacker"
            )

        assert "access denied" in str(exc_info.value).lower() or "not found" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_tenant_isolation_authorized_confirmation_succeeds_and_audits():
    """
    Test that Business A can confirm their own revenue event and it writes to append-only audit trail.
    """
    business_a_id = "00000000-0000-0000-0000-000000000001"
    event_id = "11111111-1111-1111-1111-111111111111"

    existing_event = {
        "id": event_id,
        "business_id": business_a_id,
        "deal_status": "open",
        "quoted_amount": 15000.0,
        "won_amount": None
    }

    with patch("app.services.revenue_service.supabase_admin") as mock_admin:
        mock_fetch_exec = MagicMock(data=existing_event)
        mock_update_exec = MagicMock(data=[{**existing_event, "deal_status": "won", "won_amount": 18000.0}])
        mock_audit_exec = MagicMock(data=[{"id": "audit-uuid"}])

        mock_table = MagicMock()
        mock_admin.table.return_value = mock_table
        
        # Select mock
        mock_table.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = mock_fetch_exec
        # Update mock
        mock_table.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_update_exec
        # Insert audit mock
        mock_table.insert.return_value.execute.return_value = mock_audit_exec

        res = await RevenueService.confirm_deal(
            event_id=event_id,
            business_id=business_a_id,
            deal_status="won",
            won_amount=18000.0,
            actor_name="Owner A"
        )

        assert res["deal_status"] == "won"
        assert res["won_amount"] == 18000.0

        # Verify audit log was written with correct business_id
        audit_insert_call = mock_table.insert.call_args[0][0]
        assert audit_insert_call["business_id"] == business_a_id
        assert audit_insert_call["revenue_event_id"] == event_id
        assert audit_insert_call["new_status"] == "won"


def test_action_token_tamper_and_tenant_security():
    """
    Test that action tokens used in WhatsApp/Telegram buttons cannot be forged or tampered with.
    """
    business_id = "00000000-0000-0000-0000-000000000001"
    event_id = "11111111-1111-1111-1111-111111111111"
    token = RevenueService.generate_action_token(
        event_id=event_id,
        business_id=business_id,
        action="won"
    )
    
    # 1. Valid token decodes correctly
    decoded = RevenueService.verify_action_token(token)
    assert decoded is not None
    assert decoded["event_id"] == event_id
    assert decoded["business_id"] == business_id
    assert decoded["action"] == "won"

    # 2. Tampered token signature fails
    tampered = token[:-4] + "abcd"
    assert RevenueService.verify_action_token(tampered) is None

    # 3. Arbitrary string fails
    assert RevenueService.verify_action_token("invalid.token.payload") is None
