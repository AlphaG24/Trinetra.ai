"""
backend/tests/test_number_lifecycle_grace.py

Comprehensive Automated Verification Suite for Task 12:
Virtual Number Lifecycle (Grace Period, Hold Period & Missed Call Digests).
Implements and enforces Master Plan Section 18.7 (Authoritative Overrides).

Governing Standards:
- Master Plan Section 18.7: No 90-day cooling; neutral message on expiry;
  15-day grace period; configurable administrative hold (default 14 days);
  missed calls counted, logged, masked, and summarized with one-click reactivation.
- Direct service-layer verification (bypassing broken starlette/httpx TestClient).

Test Suite Matrix:
1. TestNumberLifecycleTransitions:
   - Asserts number expiration sets status to 'grace_period', sets 15-day grace window and 29-day total hold window.
   - Asserts neutral unavailable message played immediately to callers upon expiration.
   - Asserts caller phone numbers are masked for PII compliance in missed call logs.
   - Asserts missed calls counter increments per inbound call during grace period.
   - Asserts hold period maintains neutral message and continues missed call tracking.
   - Asserts background transition moves expired grace numbers to hold, and expired hold numbers to released.
2. TestReactivationWorkflow:
   - Asserts one-click reactivation restores number to 'active' status during grace.
   - Asserts reactivation restores number to 'active' status during administrative hold.
   - Asserts cross-tenant reactivation attempts are strictly rejected.
   - Asserts reactivation is blocked once number has transitioned to 'released'.
3. TestDailyMissedCallDigest:
   - Asserts digest aggregates total calls and unique callers.
   - Asserts digest contains one-click reactivation link with cryptographic token.
4. TestDirectNumberLifecycleRouteLogic:
   - Direct handler-level verification of FastAPI route endpoints.
"""

import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.number_lifecycle_service import (
    NumberLifecycleService,
    GRACE_PERIOD_DAYS,
    DEFAULT_HOLD_PERIOD_DAYS,
    TOTAL_LIFECYCLE_DAYS,
    NEUTRAL_UNAVAILABLE_MESSAGE,
    NEUTRAL_TWIML_RESPONSE,
)


# ==============================================================================
# In-Memory Mock Supabase Client
# ==============================================================================
class MockQueryBuilder:
    def __init__(self, table_data):
        self.table_data = table_data
        self.filters = []
        self._action = "select"
        self._update_payload = None
        self._insert_payload = None
        self._limit_n = None
        self._or_filter = None

    def select(self, *args, **kwargs):
        self._action = "select"
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
        return self

    def or_(self, or_clause):
        self._or_filter = or_clause
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
                if match and self._or_filter:
                    # Parse simple or clauses like phone_number.eq.X,phone_number.eq.Y
                    clauses = self._or_filter.split(",")
                    matched_or = False
                    for c in clauses:
                        parts = c.split(".eq.")
                        if len(parts) == 2:
                            col, val = parts[0].strip(), parts[1].strip()
                            if str(row.get(col)) == val:
                                matched_or = True
                                break
                    if not matched_or:
                        match = False
                if match:
                    results.append(dict(row))

            if self._limit_n:
                results = results[:self._limit_n]

            return MagicMock(data=results)


class MockSupabaseClient:
    def __init__(self):
        self.tables = {
            "phone_numbers": [],
            "number_lifecycle_missed_calls": [],
            "number_lifecycle_digests": [],
        }

    def table(self, table_name: str):
        if table_name not in self.tables:
            self.tables[table_name] = []
        return MockQueryBuilder(self.tables[table_name])


# ==============================================================================
# 1. Test Number Lifecycle Transitions
# ==============================================================================
class TestNumberLifecycleTransitions:
    """Verifies 15-day grace period, 14-day hold, neutral audio, and missed call tracking."""

    def test_expire_number_enters_15_day_grace(self):
        """Asserts expiration transitions number to grace_period with 15-day grace window."""
        mock_db = MockSupabaseClient()
        num_id = "phone-uuid-001"
        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-alpha",
            "phone_number": "+919876543210",
            "status": "active",
        })

        service = NumberLifecycleService(supabase_client=mock_db)
        res = service.expire_number(phone_number_id=num_id, organization_id="org-alpha")

        assert res["status"] == "grace_period"
        assert res["missed_calls_count"] == 0
        assert res["reactivation_token"] is not None

        # Check date calculations
        expired_at = datetime.fromisoformat(res["expired_at"])
        grace_ends = datetime.fromisoformat(res["grace_period_ends_at"])
        hold_ends = datetime.fromisoformat(res["hold_period_ends_at"])

        # Exactly 15 days grace
        grace_delta = (grace_ends - expired_at).days
        assert grace_delta == GRACE_PERIOD_DAYS

        # Exactly 29 days total (15d grace + 14d hold)
        total_delta = (hold_ends - expired_at).days
        assert total_delta == TOTAL_LIFECYCLE_DAYS

    def test_inbound_call_neutral_message_and_missed_call_logging(self):
        """Asserts caller hears neutral unavailable message and call is logged as missed."""
        mock_db = MockSupabaseClient()
        num_id = "phone-uuid-002"
        called_num = "+919876543210"
        caller_num = "+919988776655"

        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-alpha",
            "phone_number": called_num,
            "status": "grace_period",
            "missed_calls_count": 0,
        })

        service = NumberLifecycleService(supabase_client=mock_db)

        # Inbound call arrives
        is_lifecycle, twiml, details = service.check_inbound_call_lifecycle(
            called_number=called_num,
            caller_number=caller_num,
        )

        assert is_lifecycle is True
        assert NEUTRAL_UNAVAILABLE_MESSAGE in twiml
        assert "<Hangup/>" in twiml
        assert details["missed_calls_count"] == 1
        assert details["lifecycle_stage"] == "grace_period"

        # Check missed calls table
        assert len(mock_db.tables["number_lifecycle_missed_calls"]) == 1
        missed = mock_db.tables["number_lifecycle_missed_calls"][0]
        assert missed["phone_number_id"] == num_id
        assert missed["organization_id"] == "org-alpha"
        assert missed["caller_number"] == caller_num
        # Check PII masking
        assert "XXXXX" in missed["caller_number_masked"]

        # Check phone_numbers counter incremented
        assert mock_db.tables["phone_numbers"][0]["missed_calls_count"] == 1

    def test_active_number_does_not_intercept_calls(self):
        """Active number should return (False, '', None) so normal agent flow runs."""
        mock_db = MockSupabaseClient()
        mock_db.tables["phone_numbers"].append({
            "id": "phone-uuid-active",
            "organization_id": "org-alpha",
            "phone_number": "+919876543210",
            "status": "active",
        })

        service = NumberLifecycleService(supabase_client=mock_db)
        is_lifecycle, _, _ = service.check_inbound_call_lifecycle(
            called_number="+919876543210",
            caller_number="+919988776655",
        )
        assert is_lifecycle is False

    def test_hold_period_neutral_message_and_missed_call_logging(self):
        """Numbers in 14-day hold period still play neutral message and log missed calls."""
        mock_db = MockSupabaseClient()
        mock_db.tables["phone_numbers"].append({
            "id": "phone-uuid-hold",
            "organization_id": "org-beta",
            "phone_number": "+919876543299",
            "status": "hold_period",
            "missed_calls_count": 5,
        })

        service = NumberLifecycleService(supabase_client=mock_db)
        is_lifecycle, twiml, details = service.check_inbound_call_lifecycle(
            called_number="+919876543299",
            caller_number="+919123456789",
        )
        assert is_lifecycle is True
        assert details["lifecycle_stage"] == "hold_period"
        assert details["missed_calls_count"] == 6

    def test_automated_lifecycle_transitions(self):
        """Transitions expired grace numbers to hold, and expired hold numbers to released."""
        mock_db = MockSupabaseClient()
        now = datetime.now(timezone.utc)
        past_time = (now - timedelta(days=1)).isoformat()
        future_time = (now + timedelta(days=5)).isoformat()

        # 1. Number in grace period whose grace period has ended -> should move to hold_period
        mock_db.tables["phone_numbers"].append({
            "id": "num-grace-expired",
            "status": "grace_period",
            "grace_period_ends_at": past_time,
            "hold_period_ends_at": future_time,
        })

        # 2. Number in hold period whose hold period has ended -> should move to released
        mock_db.tables["phone_numbers"].append({
            "id": "num-hold-expired",
            "status": "hold_period",
            "hold_period_ends_at": past_time,
        })

        service = NumberLifecycleService(supabase_client=mock_db)
        summary = service.process_lifecycle_transitions()

        assert summary["moved_to_hold_count"] == 1
        assert "num-grace-expired" in summary["moved_to_hold_ids"]
        assert summary["moved_to_released_count"] == 1
        assert "num-hold-expired" in summary["moved_to_released_ids"]

        # Verify DB status updates
        assert mock_db.tables["phone_numbers"][0]["status"] == "hold_period"
        assert mock_db.tables["phone_numbers"][1]["status"] == "released"


# ==============================================================================
# 2. Test Reactivation Workflow
# ==============================================================================
class TestReactivationWorkflow:
    """Verifies one-click reactivation during grace or hold period."""

    def test_reactivate_during_grace_period(self):
        """Reactivates number in grace period back to active status."""
        mock_db = MockSupabaseClient()
        num_id = "phone-reactivate-1"
        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-alpha",
            "phone_number": "+919876543210",
            "status": "grace_period",
            "reactivation_token": "valid_secret_token_123",
        })

        service = NumberLifecycleService(supabase_client=mock_db)
        res = service.reactivate_number(
            phone_number_id=num_id,
            organization_id="org-alpha",
            token="valid_secret_token_123",
        )

        assert res["status"] == "active"
        assert res["reactivated_at"] is not None
        assert res["reactivation_token"] is None
        assert res["expired_at"] is None

    def test_reactivate_during_hold_period(self):
        """Reactivates number during 14-day hold period back to active status."""
        mock_db = MockSupabaseClient()
        num_id = "phone-reactivate-2"
        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-alpha",
            "phone_number": "+919876543210",
            "status": "hold_period",
            "reactivation_token": "token_abc",
        })

        service = NumberLifecycleService(supabase_client=mock_db)
        res = service.reactivate_number(
            phone_number_id=num_id,
            organization_id="org-alpha",
            token="token_abc",
        )
        assert res["status"] == "active"

    def test_reactivate_rejected_if_tenant_mismatch(self):
        """Strict tenant isolation: Org Beta cannot reactivate Org Alpha's number."""
        mock_db = MockSupabaseClient()
        num_id = "phone-cross-tenant"
        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-alpha",
            "status": "grace_period",
        })

        service = NumberLifecycleService(supabase_client=mock_db)
        with pytest.raises(ValueError, match="tenant mismatch"):
            service.reactivate_number(
                phone_number_id=num_id,
                organization_id="org-beta",  # Attacker tenant
            )

    def test_reactivate_rejected_if_released(self):
        """Cannot reactivate once number has passed hold period into 'released'."""
        mock_db = MockSupabaseClient()
        num_id = "phone-released"
        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-alpha",
            "status": "released",
        })

        service = NumberLifecycleService(supabase_client=mock_db)
        with pytest.raises(ValueError, match="Must be in grace_period or hold_period"):
            service.reactivate_number(
                phone_number_id=num_id,
                organization_id="org-alpha",
            )


# ==============================================================================
# 3. Test Daily Missed Call Digest
# ==============================================================================
class TestDailyMissedCallDigest:
    """Verifies missed calls summary and reactivation link payload."""

    def test_generate_daily_missed_call_digest(self):
        mock_db = MockSupabaseClient()
        num_id = "phone-digest-1"
        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-gamma",
            "phone_number": "+919876543210",
            "status": "grace_period",
            "reactivation_token": "sec_token_999",
            "missed_calls_count": 3,
        })

        mock_db.tables["number_lifecycle_missed_calls"].extend([
            {"phone_number_id": num_id, "caller_number": "+919111111111"},
            {"phone_number_id": num_id, "caller_number": "+919222222222"},
            {"phone_number_id": num_id, "caller_number": "+919111111111"},  # Repeat caller
        ])

        service = NumberLifecycleService(supabase_client=mock_db)
        digest = service.generate_daily_missed_call_digest(
            phone_number_id=num_id,
            base_url="https://vaakriti.com",
        )

        assert digest["total_missed_calls"] == 3
        assert digest["unique_callers"] == 2
        assert "sec_token_999" in digest["reactivation_url"]
        assert "vaakriti.com/billing/numbers/phone-digest-1/reactivate" in digest["reactivation_url"]
        assert "3 incoming customer calls" in digest["summary_message"]
        assert len(mock_db.tables["number_lifecycle_digests"]) == 1


# ==============================================================================
# 4. Test Direct FastAPI Route Logic
# ==============================================================================
class TestDirectNumberLifecycleRouteLogic:
    """Direct route verification avoiding broken starlette/httpx TestClient."""

    @pytest.mark.asyncio
    async def test_route_expire_and_reactivate(self, monkeypatch):
        from app.routers.number_lifecycle_router import (
            expire_phone_number,
            reactivate_phone_number,
            ExpireNumberRequest,
            ReactivateNumberRequest,
        )
        mock_db = MockSupabaseClient()
        num_id = "phone-route-101"
        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-route",
            "phone_number": "+919876543210",
            "status": "active",
        })

        test_service = NumberLifecycleService(supabase_client=mock_db)
        monkeypatch.setattr("app.routers.number_lifecycle_router.NumberLifecycleService", lambda: test_service)

        # 1. Expire Number
        exp_res = await expire_phone_number(num_id, ExpireNumberRequest(organization_id="org-route"))
        assert exp_res["success"] is True
        assert exp_res["data"]["status"] == "grace_period"
        token = exp_res["data"]["reactivation_token"]

        # 2. Reactivate Number
        react_res = await reactivate_phone_number(
            num_id,
            ReactivateNumberRequest(organization_id="org-route", token=token),
        )
        assert react_res["success"] is True
        assert react_res["data"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_route_digest_and_transitions(self, monkeypatch):
        from app.routers.number_lifecycle_router import (
            get_missed_call_digest,
            process_lifecycle_transitions,
            get_neutral_twiml,
        )
        mock_db = MockSupabaseClient()
        num_id = "phone-route-102"
        mock_db.tables["phone_numbers"].append({
            "id": num_id,
            "organization_id": "org-route",
            "phone_number": "+919876543210",
            "status": "grace_period",
        })
        test_service = NumberLifecycleService(supabase_client=mock_db)
        monkeypatch.setattr("app.routers.number_lifecycle_router.NumberLifecycleService", lambda: test_service)

        # Digest
        digest_res = await get_missed_call_digest(num_id)
        assert digest_res["success"] is True

        # Transitions
        trans_res = await process_lifecycle_transitions()
        assert trans_res["success"] is True

        # Neutral TwiML
        twiml_res = await get_neutral_twiml()
        assert twiml_res.media_type == "application/xml"
        assert b"currently unavailable" in twiml_res.body
