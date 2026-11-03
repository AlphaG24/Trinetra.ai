"""
backend/tests/test_agent_lifecycle_tier_engine.py

Automated Verification Suite for Phase 4:
Agent Tiers, Free Tier Constraints, 3-Tier Quota, Buffer Claims & 30-Day Purge Engine.
"""

import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.agent_lifecycle_service import AgentLifecycleService, PURGE_THRESHOLD_DAYS
from app.services.wallet_service import WalletService, DEFAULT_RELIABILITY_SCORE


class MockQueryBuilder:
    def __init__(self, table_data):
        self.table_data = table_data
        self.filters = []
        self._action = "select"
        self._update_payload = None
        self._insert_payload = None
        self._limit_n = None
        self._single = False

    def select(self, *args, **kwargs):
        self._action = "select"
        return self

    def eq(self, col, val):
        self.filters.append((col, val, "eq"))
        return self

    def neq(self, col, val):
        self.filters.append((col, val, "neq"))
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    def single(self):
        self._single = True
        return self

    def insert(self, payload):
        self._action = "insert"
        self._insert_payload = payload
        return self

    def update(self, payload):
        self._action = "update"
        self._update_payload = payload
        return self

    def delete(self):
        self._action = "delete"
        return self

    def _matches(self, row):
        for f in self.filters:
            col, val, op = f
            if op == "eq":
                if row.get(col) != val:
                    return False
            elif op == "neq":
                if row.get(col) == val:
                    return False
        return True

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
                if self._matches(row):
                    row.update(self._update_payload)
                    matching.append(dict(row))
            return MagicMock(data=matching)
        elif self._action == "delete":
            initial = len(self.table_data)
            self.table_data[:] = [r for r in self.table_data if not self._matches(r)]
            return MagicMock(data=[{"count": initial - len(self.table_data)}])
        else:  # select
            matched = [dict(r) for r in self.table_data if self._matches(r)]
            if self._limit_n:
                matched = matched[:self._limit_n]
            return MagicMock(data=matched)


class MockDB:
    def __init__(self):
        self.tables = {
            "agents": [],
            "agent_phone_numbers": [],
            "phone_numbers": [],
            "wallets": [],
            "profiles": [],
            "notifications": [],
            "activity_log": [],
            "system_config": [],
        }

    def table(self, name: str):
        if name not in self.tables:
            self.tables[name] = []
        return MockQueryBuilder(self.tables[name])


class TestAgentLifecyclePhase4:
    """Verifies all Phase 4 agent tier rules, buffer claiming, zero mid-call cut, and 30-day purge."""

    def test_buffer_minutes_claim_blocked_on_trial_and_free(self):
        """Rule: During Free Tier and ₹99 Trial, buffer limits cannot be claimed."""
        mock_db = MockDB()
        org_id = "org-trial-user"
        mock_db.tables["profiles"].append({
            "id": "user-trial",
            "organization_id": org_id,
            "plan_tier": "trial",
        })
        mock_db.tables["wallets"].append({
            "organization_id": org_id,
            "balance_paisa": 0,
            "reliability_score": 90,
            "emergency_minutes_available": 0,
        })

        wallet_svc = WalletService(supabase_client=mock_db)
        success, code, details = wallet_svc.claim_emergency_minutes(org_id)

        assert success is False
        assert code == "TIER_LOCKED"
        assert "cannot be claimed during Free Tier or the ₹99 Trial" in details["error"]

    def test_buffer_minutes_claim_success_on_paid_plan_and_score_decrements(self):
        """Rule: On paid plans with Reliability Score > 80, buffer minutes unlock and score decreases."""
        mock_db = MockDB()
        org_id = "org-paid-user"
        mock_db.tables["profiles"].append({
            "id": "user-paid",
            "organization_id": org_id,
            "plan_tier": "starter",
        })
        mock_db.tables["wallets"].append({
            "organization_id": org_id,
            "balance_paisa": 0,
            "reliability_score": 85,
            "emergency_minutes_available": 0,
        })

        wallet_svc = WalletService(supabase_client=mock_db)
        success, code, wallet = wallet_svc.claim_emergency_minutes(org_id)

        assert success is True
        assert code == "EMERGENCY_MINUTES_GRANTED"
        assert wallet["emergency_minutes_available"] == 50
        # Score decrements by 25 points from 85 -> 60 so user must power it up
        assert wallet["reliability_score"] == 60
        assert mock_db.tables["wallets"][0]["reliability_score"] == 60

    def test_zero_mid_call_disconnection(self):
        """Rule: Active in-progress calls are NEVER cut off mid-conversation."""
        mock_db = MockDB()
        org_id = "org-midcall"
        mock_db.tables["wallets"].append({
            "organization_id": org_id,
            "balance_paisa": 0,
            "emergency_minutes_available": 0,
            "reliability_score": 40,
        })

        wallet_svc = WalletService(supabase_client=mock_db)
        # Even with 0 balance, 0 emergency minutes, and low score:
        allowed, status, details = wallet_svc.check_pre_call_permission(
            organization_id=org_id,
            is_in_progress_call=True,
        )

        assert allowed is True
        assert status == "ACTIVE_CALL_PROTECTED"
        assert details["is_in_progress_call"] is True

    def test_agent_remains_connected_if_time_expired_but_quota_left(self):
        """Rule 5: Agent remains connected if time expired but quota minutes remain."""
        mock_db = MockDB()
        agent_id = "agent-quota-remains"
        now = datetime.now(timezone.utc)
        past_time = (now - timedelta(days=2)).isoformat()

        mock_db.tables["agents"].append({
            "id": agent_id,
            "status": "active",
            "quota_minutes_remaining": 15,  # 15 minutes left!
            "phone_number": "+919876543210",
            "config": {
                "valid_until": past_time,  # Time expired 2 days ago
            },
        })

        svc = AgentLifecycleService(supabase_client=mock_db)
        state = svc.evaluate_agent_operational_state(agent_id)

        assert state["can_call"] is True
        assert state["status"] == "active"
        assert state["validity_expired"] is True
        # Agent status not changed to expired because quota minutes remain
        assert mock_db.tables["agents"][0]["status"] == "active"

    def test_agent_expires_when_quota_buffer_and_wallet_all_exhausted(self):
        """Rule: Agent expires when quota, buffer, and wallet are exhausted; unlinks phone number."""
        mock_db = MockDB()
        agent_id = "agent-exhausted"
        org_id = "org-exhausted"
        phone_id = "num-1"
        phone_str = "+919999988888"

        mock_db.tables["agents"].append({
            "id": agent_id,
            "name": "Support Unit",
            "organization_id": org_id,
            "user_id": "u-1",
            "status": "active",
            "quota_minutes_remaining": 0,
            "phone_number": phone_str,
            "config": {},
        })
        mock_db.tables["wallets"].append({
            "organization_id": org_id,
            "balance_paisa": 0,
            "emergency_minutes_available": 0,
        })
        mock_db.tables["agent_phone_numbers"].append({
            "agent_id": agent_id,
            "phone_number_id": phone_id,
        })
        mock_db.tables["phone_numbers"].append({
            "id": phone_id,
            "phone_number": phone_str,
            "is_assigned": True,
            "assigned_agent_id": agent_id,
        })

        svc = AgentLifecycleService(supabase_client=mock_db)
        state = svc.evaluate_agent_operational_state(agent_id)

        assert state["status"] == "expired"
        assert state["can_call"] is False

        # Verify phone number was unlinked immediately (Rule 4)
        agent_row = mock_db.tables["agents"][0]
        assert agent_row["status"] == "expired"
        assert agent_row["phone_number"] is None
        assert len(mock_db.tables["agent_phone_numbers"]) == 0
        assert mock_db.tables["phone_numbers"][0]["is_assigned"] is False

        # Verify notification created
        assert len(mock_db.tables["notifications"]) == 1
        assert "Expired" in mock_db.tables["notifications"][0]["title"]

    def test_agent_purged_after_30_days_expired(self):
        """Rule: If user didn't renew agent for > 30 days, purge/delete from dashboard."""
        mock_db = MockDB()
        agent_id = "agent-old-expired"
        now = datetime.now(timezone.utc)
        thirty_two_days_ago = (now - timedelta(days=32)).isoformat()

        mock_db.tables["agents"].append({
            "id": agent_id,
            "name": "Old Sales Agent",
            "user_id": "u-2",
            "status": "expired",
            "expired_at": thirty_two_days_ago,
        })

        svc = AgentLifecycleService(supabase_client=mock_db)
        res = svc.evaluate_agent_operational_state(agent_id)

        assert res["status"] == "deleted"
        assert res["purged"] is True
        assert res["days_expired"] >= PURGE_THRESHOLD_DAYS
        assert mock_db.tables["agents"][0]["status"] == "deleted"

        # Verify purge notification
        assert len(mock_db.tables["notifications"]) == 1
        assert "Purged After 30 Days" in mock_db.tables["notifications"][0]["title"]
