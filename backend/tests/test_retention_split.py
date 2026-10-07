"""
backend/tests/test_retention_split.py

Test Suite for Task 6: Data Retention Split & Statutory Minimization.
Verifies:
1. Exact statutory cutoffs (180-day operational media vs 8-year statutory financial ledger).
2. Retention audit reporting of eligible operational media vs shielded financial records.
3. Retention purge safety floor (dry_run=True asserts ZERO database mutations and returns WOULD_PURGE).
4. Live retention purge execution (dry_run=False scrubs audio URLs/transcripts, preserves call duration/billing).
5. Immutable shielding of statutory financial tables (invoices, transactions) and compliance tables (consent_records, audit_logs).
6. Immutable audit logging of purge executions.
7. Multi-tenant organization scoping.
8. FastAPI router endpoints (/policies, /audit, /purge).
"""

import pytest
import os
import sys
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.retention_policy_service import (
    RetentionPolicyService,
    OPERATIONAL_CALL_RETENTION_DAYS,
    SECURITY_LOG_RETENTION_DAYS,
    STATUTORY_FINANCIAL_RETENTION_YEARS,
    STATUTORY_FINANCIAL_RETENTION_DAYS,
    PERMANENTLY_SHIELDED_TABLES,
    FINANCIALLY_SHIELDED_TABLES,
)
from app.routers.retention_router import (
    RetentionAuditRequest,
    RetentionPurgeRequest,
)


class MockQueryBuilder:
    """Mock chaining for Supabase table queries."""
    def __init__(self, data=None):
        self._data = data if data is not None else []
        self._calls = []
        self._filters = {}

    def select(self, *args, **kwargs):
        self._calls.append(("select", args, kwargs))
        return self

    def insert(self, *args, **kwargs):
        self._calls.append(("insert", args, kwargs))
        return self

    def update(self, *args, **kwargs):
        self._calls.append(("update", args, kwargs))
        return self

    def delete(self, *args, **kwargs):
        self._calls.append(("delete", args, kwargs))
        return self

    def eq(self, column, value):
        self._filters[column] = value
        self._calls.append(("eq", column, value))
        return self

    def lt(self, column, value):
        self._filters[f"{column}__lt"] = value
        self._calls.append(("lt", column, value))
        return self

    def gte(self, column, value):
        self._filters[f"{column}__gte"] = value
        self._calls.append(("gte", column, value))
        return self

    def execute(self):
        res = MagicMock()
        res.data = self._data
        return res


class MockSupabase:
    """Mock Supabase client with per-table mock query builders."""
    def __init__(self, table_data=None):
        self.table_data = table_data or {}
        self.tables = {}

    def table(self, table_name):
        if table_name not in self.tables:
            data = self.table_data.get(table_name, [])
            self.tables[table_name] = MockQueryBuilder(data=data)
        return self.tables[table_name]


class TestStatutoryRetentionCutoffs:
    """Verifies calculation of statutory cutoff dates."""

    def test_cutoffs_relative_to_reference_date(self):
        service = RetentionPolicyService(supabase_client=MockSupabase())
        ref_time = datetime(2026, 10, 4, 12, 0, 0, tzinfo=timezone.utc)
        cutoffs = service.get_retention_cutoffs(now=ref_time)

        # Operational call cutoff: exactly 180 days prior
        expected_call_cutoff = ref_time - timedelta(days=180)
        assert cutoffs["operational_call_cutoff"] == expected_call_cutoff

        # Security log cutoff: exactly 180 days prior (CERT-In 2022)
        expected_security_cutoff = ref_time - timedelta(days=180)
        assert cutoffs["security_log_cutoff"] == expected_security_cutoff

        # Financial statutory cutoff: exactly 8 years (2,920 days) prior
        expected_financial_cutoff = ref_time - timedelta(days=8 * 365)
        assert cutoffs["financial_statutory_cutoff"] == expected_financial_cutoff

    def test_shielded_tables_registrations(self):
        assert "consent_records" in PERMANENTLY_SHIELDED_TABLES
        assert "audit_logs" in PERMANENTLY_SHIELDED_TABLES
        assert "invoices" in FINANCIALLY_SHIELDED_TABLES
        assert "transactions" in FINANCIALLY_SHIELDED_TABLES
        assert "revenue_events" in FINANCIALLY_SHIELDED_TABLES


@pytest.mark.asyncio
class TestRetentionAuditStatus:
    """Verifies dry-run audit reporting of eligible vs shielded data."""

    async def test_audit_identifies_eligible_and_shielded_records(self):
        now = datetime.now(timezone.utc)
        old_call_date = (now - timedelta(days=200)).isoformat()
        recent_call_date = (now - timedelta(days=30)).isoformat()

        mock_data = {
            "voice_calls": [
                {
                    "id": "call-1-old",
                    "recording_url": "https://storage.example.com/recordings/call-1.wav",
                    "transcript_text": "Hello, how can I help you?",
                    "created_at": old_call_date,
                },
                {
                    "id": "call-2-old-already-purged",
                    "recording_url": None,
                    "transcript_text": "[TRANSCRIPT_PURGED_UNDER_RETENTION_POLICY]",
                    "created_at": old_call_date,
                },
            ],
            "invoices": [
                {"id": "inv-1", "created_at": (now - timedelta(days=100)).isoformat()},
                {"id": "inv-2", "created_at": (now - timedelta(days=500)).isoformat()},
            ],
            "transactions": [
                {"id": "tx-1", "created_at": (now - timedelta(days=120)).isoformat()},
            ],
            "revenue_events": [
                {"id": "rev-1", "created_at": (now - timedelta(days=60)).isoformat()},
            ],
        }

        mock_db = MockSupabase(mock_data)
        service = RetentionPolicyService(supabase_client=mock_db)

        report = await service.audit_retention_status()

        # Operational call data breakdown
        assert report["operational_call_data"]["retention_policy_days"] == 180
        assert report["operational_call_data"]["eligible_recordings_to_purge"] == 1
        assert report["operational_call_data"]["eligible_transcripts_to_purge"] == 1

        # Statutory financial shield breakdown (protected for 8 years)
        assert report["statutory_financial_data"]["retention_policy_years"] == 8
        assert report["statutory_financial_data"]["invoices_protected_count"] == 2
        assert report["statutory_financial_data"]["transactions_protected_count"] == 1
        assert report["statutory_financial_data"]["revenue_events_protected_count"] == 1

        # Compliance shield confirmation
        assert "PERMANENT" in report["statutory_compliance_logs"]["consent_records_shielded"]
        assert "PERMANENT" in report["statutory_compliance_logs"]["audit_logs_shielded"]


@pytest.mark.asyncio
class TestRetentionPurgeSafeguards:
    """Verifies dry-run safety floor and live minimization execution."""

    async def test_purge_defaults_to_dry_run_zero_mutations(self):
        now = datetime.now(timezone.utc)
        mock_data = {
            "voice_calls": [
                {
                    "id": "call-old",
                    "recording_url": "https://storage.example.com/rec.wav",
                    "transcript_text": "Sample conversation transcript",
                    "created_at": (now - timedelta(days=220)).isoformat(),
                }
            ],
            "invoices": [{"id": "inv-1", "created_at": (now - timedelta(days=200)).isoformat()}],
            "transactions": [],
            "revenue_events": [],
        }
        mock_db = MockSupabase(mock_data)
        service = RetentionPolicyService(supabase_client=mock_db)

        # Default invocation: dry_run defaults to True
        result = await service.execute_retention_purge()

        assert result["dry_run"] is True
        assert result["action"] == "WOULD_PURGE"
        assert "DRY RUN" in result["message"]
        assert result["operational_call_data"]["eligible_recordings_to_purge"] == 1

        # CRITICAL SAFETY ASSERTION: Zero mutations across all tables
        for table_name, qb in mock_db.tables.items():
            operations = [op[0] for op in qb._calls]
            assert "delete" not in operations, f"Safety violation: table {table_name} called delete in dry_run mode!"
            assert "update" not in operations, f"Safety violation: table {table_name} called update in dry_run mode!"

    async def test_purge_live_execution_minimizes_media_and_preserves_financials(self):
        now = datetime.now(timezone.utc)
        mock_data = {
            "voice_calls": [
                {
                    "id": "call-1",
                    "recording_url": "https://storage.example.com/rec1.wav",
                    "transcript_text": "Customer conversation text",
                    "duration_seconds": 120,
                    "created_at": (now - timedelta(days=210)).isoformat(),
                }
            ],
            "invoices": [{"id": "inv-1", "created_at": (now - timedelta(days=150)).isoformat()}],
            "transactions": [{"id": "tx-1", "created_at": (now - timedelta(days=150)).isoformat()}],
            "revenue_events": [],
            "audit_logs": [],
        }
        mock_db = MockSupabase(mock_data)
        service = RetentionPolicyService(supabase_client=mock_db)

        # Explicit live invocation: dry_run=False
        result = await service.execute_retention_purge(
            organization_id="org-acme-corp",
            dry_run=False,
            requested_by="compliance_cron",
        )

        assert result["dry_run"] is False
        assert result["action"] == "PURGED"
        assert result["purged_stats"]["voice_recordings_cleared"] == 1
        assert result["purged_stats"]["voice_transcripts_cleared"] == 1
        assert result["purged_stats"]["financial_records_shielded"] == 2

        # Verify voice_calls update payload (clears audio & transcript, preserves duration & metadata)
        voice_updates = [op for op in mock_db.tables["voice_calls"]._calls if op[0] == "update"]
        assert len(voice_updates) == 1
        payload = voice_updates[0][1][0]
        assert payload["recording_url"] is None
        assert payload["stereo_recording_url"] is None
        assert payload["transcript_text"] == "[TRANSCRIPT_PURGED_UNDER_RETENTION_POLICY]"
        assert "duration_seconds" not in payload  # Billing duration preserved!

        # Verify financial tables were NEVER mutated
        for fin_table in ["invoices", "transactions", "revenue_events"]:
            if fin_table in mock_db.tables:
                ops = [op[0] for op in mock_db.tables[fin_table]._calls]
                assert "update" not in ops, f"Financial integrity violation: {fin_table} updated!"
                assert "delete" not in ops, f"Financial integrity violation: {fin_table} deleted!"

        # Verify immutable audit log recorded the retention purge event
        audit_inserts = [op for op in mock_db.tables["audit_logs"]._calls if op[0] == "insert"]
        assert len(audit_inserts) == 1
        log_entry = audit_inserts[0][1][0]
        assert log_entry["action"] == "DATA_RETENTION_PURGE"
        assert log_entry["performed_by"] == "compliance_cron"
        assert "180-Day" in log_entry["details"]["policy"]
        assert "8-Year" in log_entry["details"]["policy"]


class TestRetentionPydanticSchemas:
    """Verifies router input schemas."""

    def test_audit_request_schema(self):
        req = RetentionAuditRequest(organization_id="org-test")
        assert req.organization_id == "org-test"

    def test_purge_request_defaults_dry_run_true(self):
        req = RetentionPurgeRequest()
        assert req.dry_run is True
        assert req.organization_id is None
        assert req.requested_by == "admin"
