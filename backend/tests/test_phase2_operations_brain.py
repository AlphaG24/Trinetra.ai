import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from app.services.caller_lookup import lookup_caller_history_memory


@pytest.mark.asyncio
async def test_lookup_caller_history_memory_returning():
    mock_supabase = MagicMock()
    
    # Mock customer_contacts query
    mock_cust_table = MagicMock()
    mock_cust_table.select.return_value = mock_cust_table
    mock_cust_table.eq.return_value = mock_cust_table
    mock_cust_table.limit.return_value = mock_cust_table
    mock_cust_table.execute.return_value = MagicMock(data=[{
        "full_name": "Rohan Sharma",
        "company": "Sharma Enterprises",
        "total_calls": 3,
        "last_contact_at": "2026-11-01T10:00:00Z",
        "notes": "Interested in 20ft container booking"
    }])

    # Mock voice_calls query
    mock_calls_table = MagicMock()
    mock_calls_table.select.return_value = mock_calls_table
    mock_calls_table.order.return_value = mock_calls_table
    mock_calls_table.eq.return_value = mock_calls_table
    mock_calls_table.ilike.return_value = mock_calls_table
    mock_calls_table.limit.return_value = mock_calls_table
    mock_calls_table.execute.return_value = MagicMock(data=[{
        "created_at": "2026-11-01T10:00:00Z",
        "summary": "Customer enquired about Delhi to Mumbai transport rates and container safety.",
        "notes": "Satisfied with rate estimate.",
        "call_status": "completed",
        "duration_seconds": 95
    }])

    # Mock callbacks query
    mock_cb_table = MagicMock()
    mock_cb_table.select.return_value = mock_cb_table
    mock_cb_table.eq.return_value = mock_cb_table
    mock_cb_table.ilike.return_value = mock_cb_table
    mock_cb_table.order.return_value = mock_cb_table
    mock_cb_table.limit.return_value = mock_cb_table
    mock_cb_table.execute.return_value = MagicMock(data=[])

    def table_router(table_name):
        if table_name == "customer_contacts":
            return mock_cust_table
        elif table_name == "voice_calls":
            return mock_calls_table
        elif table_name == "callbacks":
            return mock_cb_table
        return MagicMock()

    mock_supabase.table.side_effect = table_router

    memory = await lookup_caller_history_memory(
        supabase_client=mock_supabase,
        organization_id="org-123",
        user_id="user-456",
        phone_number="+919876543210",
        timeout_sec=1.0
    )

    assert memory.get("name") == "Rohan Sharma"
    assert memory.get("company") == "Sharma Enterprises"
    assert memory.get("is_returning") is True
    assert memory.get("total_calls") == 3
    assert "Delhi to Mumbai transport rates" in memory.get("last_summary")


@pytest.mark.asyncio
async def test_lookup_caller_history_memory_callback():
    mock_supabase = MagicMock()
    
    mock_cust_table = MagicMock()
    mock_cust_table.select.return_value = mock_cust_table
    mock_cust_table.eq.return_value = mock_cust_table
    mock_cust_table.limit.return_value = mock_cust_table
    mock_cust_table.execute.return_value = MagicMock(data=[])

    mock_calls_table = MagicMock()
    mock_calls_table.select.return_value = mock_calls_table
    mock_calls_table.order.return_value = mock_calls_table
    mock_calls_table.eq.return_value = mock_calls_table
    mock_calls_table.ilike.return_value = mock_calls_table
    mock_calls_table.limit.return_value = mock_calls_table
    mock_calls_table.execute.return_value = MagicMock(data=[])

    mock_cb_table = MagicMock()
    mock_cb_table.select.return_value = mock_cb_table
    mock_cb_table.eq.return_value = mock_cb_table
    mock_cb_table.ilike.return_value = mock_cb_table
    mock_cb_table.order.return_value = mock_cb_table
    mock_cb_table.limit.return_value = mock_cb_table
    mock_cb_table.execute.return_value = MagicMock(data=[{
        "prospect_name": "Priya Patel",
        "scheduled_at": "2026-11-03T15:00:00Z",
        "notes": "Discuss bulk truck load discount for Ahmedabad to Pune",
        "priority": "high"
    }])

    def table_router(table_name):
        if table_name == "customer_contacts":
            return mock_cust_table
        elif table_name == "voice_calls":
            return mock_calls_table
        elif table_name == "callbacks":
            return mock_cb_table
        return MagicMock()

    mock_supabase.table.side_effect = table_router

    memory = await lookup_caller_history_memory(
        supabase_client=mock_supabase,
        organization_id="org-123",
        user_id="user-456",
        phone_number="+919876543211",
        timeout_sec=1.0
    )

    assert memory.get("name") == "Priya Patel"
    assert "Discuss bulk truck load discount" in memory.get("callback_reason")
