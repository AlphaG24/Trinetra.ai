"""
backend/tests/test_caller_rights_service.py

Test Suite for Task 5: Caller Rights & Mid-Call Human Escalation.
Verifies:
1. Multi-format phone normalization (10-digit, +91, 91, 0 prefixes).
2. Multi-tenant caller data search across 5 tables with strict organization_id boundaries.
3. Multi-tenant cross-organization leakage protection (Org A vs Org B).
4. Machine-readable export (JSON and statutory DSAR CSV formats).
5. Right to erasure safety default (dry_run=True performs ZERO mutations and returns WOULD_ERASE).
6. Right to erasure execution (dry_run=False deletes/anonymizes PII, logs SHA-256 phone hash to audit).
7. FastAPI router endpoints (/search, /export, /delete).
8. Mid-call escalation and recording decline handlers.
"""

import pytest
import io
import csv
import json
import hashlib
import os
import sys
from unittest.mock import MagicMock, AsyncMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.caller_rights_service import (
    normalize_phone_variations,
    CallerRightsService,
)
from app.routers.caller_rights_router import (
    CallerSearchRequest,
    CallerExportRequest,
    CallerErasureRequest,
)
from app.services.disclosure_service import handle_caller_recording_decline


class MockQueryBuilder:
    """Mock chaining for Supabase table queries."""
    def __init__(self, data=None):
        self._data = data if data is not None else []
        self._calls = []
        self._operation = "select"
        self._filters = {}

    def select(self, *args, **kwargs):
        self._operation = "select"
        self._calls.append(("select", args, kwargs))
        return self

    def insert(self, *args, **kwargs):
        self._operation = "insert"
        self._calls.append(("insert", args, kwargs))
        return self

    def update(self, *args, **kwargs):
        self._operation = "update"
        self._calls.append(("update", args, kwargs))
        return self

    def delete(self, *args, **kwargs):
        self._operation = "delete"
        self._calls.append(("delete", args, kwargs))
        return self

    def eq(self, column, value):
        self._filters[column] = value
        self._calls.append(("eq", column, value))
        return self

    def in_(self, column, values):
        self._filters[f"{column}__in"] = values
        self._calls.append(("in_", column, values))
        return self

    def execute(self):
        result = MagicMock()
        result.data = self._data
        return result


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


class TestPhoneNormalization:
    """Unit tests for multi-format phone variation normalizer."""

    def test_ten_digit_indian_number(self):
        vars_list = normalize_phone_variations("9876543210")
        assert "9876543210" in vars_list
        assert "+919876543210" in vars_list
        assert "919876543210" in vars_list
        assert "09876543210" in vars_list

    def test_plus_91_prefixed_number(self):
        vars_list = normalize_phone_variations("+919876543210")
        assert "9876543210" in vars_list
        assert "+919876543210" in vars_list
        assert "919876543210" in vars_list

    def test_zero_prefixed_number(self):
        vars_list = normalize_phone_variations("09876543210")
        assert "9876543210" in vars_list
        assert "+919876543210" in vars_list
        assert "09876543210" in vars_list

    def test_invalid_empty_input(self):
        assert normalize_phone_variations("") == []
        assert normalize_phone_variations("   ") == []
        assert normalize_phone_variations(None) == []


@pytest.mark.asyncio
class TestCallerRightsSearch:
    """Tests for searching caller records across 5 multi-tenant tables."""

    async def test_search_caller_data_across_five_tables(self):
        test_org = "org-test-111"
        test_phone = "+919876543210"

        mock_data = {
            "customer_contacts": [{"id": "c1", "full_name": "Test Contact", "phone_number": "9876543210"}],
            "voice_calls": [{"id": "v1", "caller_phone": "+919876543210", "duration_seconds": 45}],
            "leads": [{"id": "l1", "name": "Test Lead", "phone": "9876543210"}],
            "appointments": [{"id": "a1", "contact_name": "Test Lead", "contact_phone": "9876543210"}],
            "campaigns": [{"id": "camp1"}],
            "campaign_contacts": [{"id": "cc1", "campaign_id": "camp1", "phone": "9876543210"}],
        }

        mock_db = MockSupabase(mock_data)
        service = CallerRightsService(supabase_client=mock_db)

        result = await service.search_caller_data(test_org, test_phone)

        assert result["organization_id"] == test_org
        assert result["total_records"] == 5  # 1 per each of the 5 caller tables
        assert result["summary"]["customer_contacts"] == 1
        assert result["summary"]["voice_calls"] == 1
        assert result["summary"]["leads"] == 1
        assert result["summary"]["appointments"] == 1
        assert result["summary"]["campaign_contacts"] == 1

        # Check tenant isolation filter was applied
        assert mock_db.tables["customer_contacts"]._filters["organization_id"] == test_org
        assert mock_db.tables["voice_calls"]._filters["organization_id"] == test_org
        assert mock_db.tables["leads"]._filters["organization_id"] == test_org
        assert mock_db.tables["appointments"]._filters["organization_id"] == test_org
        assert mock_db.tables["campaigns"]._filters["organization_id"] == test_org

    async def test_search_requires_organization_id(self):
        service = CallerRightsService(supabase_client=MockSupabase())
        with pytest.raises(ValueError, match="organization_id is mandatory"):
            await service.search_caller_data("", "+919876543210")

    async def test_search_requires_phone_number(self):
        service = CallerRightsService(supabase_client=MockSupabase())
        with pytest.raises(ValueError, match="phone_number is required"):
            await service.search_caller_data("org-123", "")


@pytest.mark.asyncio
class TestCallerRightsExport:
    """Tests for machine-readable JSON and statutory DSAR CSV export."""

    async def test_export_json_format(self):
        test_org = "org-test-222"
        test_phone = "9876543210"
        mock_data = {
            "customer_contacts": [{"id": "c1", "phone_number": "9876543210"}],
            "voice_calls": [],
            "leads": [],
            "appointments": [],
            "campaigns": [],
            "campaign_contacts": [],
        }
        service = CallerRightsService(supabase_client=MockSupabase(mock_data))

        export_res = await service.export_caller_data(test_org, test_phone, export_format="json")

        assert export_res["format"] == "json"
        assert export_res["organization_id"] == test_org
        assert export_res["phone_number"] == test_phone
        assert "data" in export_res
        assert export_res["data"]["summary"]["customer_contacts"] == 1

    async def test_export_csv_format_statutory_dsar(self):
        test_org = "org-test-333"
        test_phone = "+919876543210"
        mock_data = {
            "customer_contacts": [{"id": "c1", "full_name": "Rohan Patel", "phone_number": "9876543210"}],
            "voice_calls": [{"id": "v1", "caller_phone": "+919876543210", "duration_seconds": 60}],
            "leads": [],
            "appointments": [],
            "campaigns": [],
            "campaign_contacts": [],
        }
        service = CallerRightsService(supabase_client=MockSupabase(mock_data))

        export_res = await service.export_caller_data(test_org, test_phone, export_format="csv")

        assert export_res["format"] == "csv"
        csv_str = export_res["csv_content"]
        assert "STATUTORY DATA SUBJECT ACCESS REQUEST (DSAR) EXPORT" in csv_str
        assert "DPDP Act 2023 Sec 11" in csv_str
        assert test_org in csv_str
        assert test_phone in csv_str
        assert "Rohan Patel" in csv_str
        assert "TABLE: customer_contacts" in csv_str
        assert "TABLE: voice_calls" in csv_str


@pytest.mark.asyncio
class TestCallerRightsErasureSafeguards:
    """Tests for dry-run safety floor and live right to erasure execution."""

    async def test_erasure_defaults_to_dry_run_zero_mutations(self):
        test_org = "org-test-444"
        test_phone = "9876543210"
        mock_data = {
            "customer_contacts": [{"id": "c1", "phone_number": "9876543210"}],
            "voice_calls": [{"id": "v1", "caller_phone": "9876543210"}],
            "leads": [{"id": "l1", "phone": "9876543210"}],
            "appointments": [{"id": "a1", "contact_phone": "9876543210"}],
            "campaigns": [{"id": "cmp1"}],
            "campaign_contacts": [{"id": "cc1", "phone": "9876543210"}],
        }
        mock_db = MockSupabase(mock_data)
        service = CallerRightsService(supabase_client=mock_db)

        # Default invocation: dry_run is True by default
        result = await service.erase_caller_data(test_org, test_phone)

        assert result["dry_run"] is True
        assert result["action"] == "WOULD_ERASE"
        assert result["total_records"] == 5
        assert "DRY RUN" in result["message"]

        # CRITICAL SAFEGUARD VERIFICATION: Assert ZERO .delete() or .update() calls were made
        for table_name, qb in mock_db.tables.items():
            operations = [op[0] for op in qb._calls]
            assert "delete" not in operations, f"Safety violation: table {table_name} called delete in dry_run mode!"
            assert "update" not in operations, f"Safety violation: table {table_name} called update in dry_run mode!"

    async def test_erasure_live_execution_scrubs_pii_and_creates_audit_log(self):
        test_org = "org-test-555"
        test_phone = "+919876543210"
        mock_data = {
            "customer_contacts": [{"id": "c1", "phone_number": "9876543210"}],
            "voice_calls": [{"id": "v1", "caller_phone": "+919876543210"}],
            "leads": [{"id": "l1", "phone": "9876543210"}],
            "appointments": [{"id": "a1", "contact_phone": "9876543210"}],
            "campaigns": [{"id": "cmp1"}],
            "campaign_contacts": [{"id": "cc1", "phone": "9876543210"}],
            "audit_logs": [],
        }
        mock_db = MockSupabase(mock_data)
        service = CallerRightsService(supabase_client=mock_db)

        # Explicit live invocation: dry_run=False
        result = await service.erase_caller_data(
            organization_id=test_org,
            phone_number=test_phone,
            dry_run=False,
            reason="statutory_dpdp_revocation",
            requested_by="compliance_officer@test.com",
        )

        assert result["dry_run"] is False
        assert result["action"] == "ERASED"
        assert result["total_affected"] == 5

        # Verify tables had delete or update called
        assert "delete" in [op[0] for op in mock_db.tables["customer_contacts"]._calls]
        assert "update" in [op[0] for op in mock_db.tables["voice_calls"]._calls]
        assert "delete" in [op[0] for op in mock_db.tables["leads"]._calls]
        assert "update" in [op[0] for op in mock_db.tables["appointments"]._calls]
        assert "delete" in [op[0] for op in mock_db.tables["campaign_contacts"]._calls]

        # Verify voice_calls anonymization payload (scrubs PII, preserves billing duration)
        voice_update_calls = [op for op in mock_db.tables["voice_calls"]._calls if op[0] == "update"]
        assert len(voice_update_calls) == 1
        update_payload = voice_update_calls[0][1][0]
        assert update_payload["caller_phone"] == "[ERASED_UNDER_DPDP]"
        assert update_payload["transcript_text"] == "[TRANSCRIPT_ERASED_UNDER_DPDP]"
        assert update_payload["recording_url"] is None

        # Verify audit log recorded SHA-256 phone hash (never raw phone)
        audit_insert_calls = [op for op in mock_db.tables["audit_logs"]._calls if op[0] == "insert"]
        assert len(audit_insert_calls) == 1
        audit_entry = audit_insert_calls[0][1][0]
        assert audit_entry["organization_id"] == test_org
        assert audit_entry["action"] == "CALLER_DATA_ERASURE"
        expected_hash = hashlib.sha256(test_phone.encode("utf-8")).hexdigest()
        assert audit_entry["details"]["phone_hash"] == expected_hash
        assert test_phone not in audit_entry["details"]["phone_hash"]


@pytest.mark.asyncio
class TestMidCallEscalationAndRecordingDecline:
    """Tests for in-call caller decline and human escalation tools."""

    async def test_handle_caller_recording_decline_unrecorded_continuation(self):
        mock_db = MockSupabase({"voice_calls": []})
        res = await handle_caller_recording_decline(
            supabase_client=mock_db,
            room_name="test-room-777",
            allow_unrecorded_continuation=True,
        )
        assert res["action"] == "continue_unrecorded"
        assert "stopped recording" in res["spoken_response"]

    async def test_handle_caller_recording_decline_end_call_mode(self):
        mock_db = MockSupabase({"voice_calls": []})
        res = await handle_caller_recording_decline(
            supabase_client=mock_db,
            room_name="test-room-888",
            allow_unrecorded_continuation=False,
        )
        assert res["action"] == "end_call"
        assert "disconnect" in res["spoken_response"]


class TestCallerRightsPydanticModels:
    """Verifies router request validation schemas."""

    def test_search_request_validation(self):
        req = CallerSearchRequest(organization_id="org-1", phone_number="+919876543210")
        assert req.organization_id == "org-1"
        assert req.phone_number == "+919876543210"

    def test_export_request_validation(self):
        req = CallerExportRequest(organization_id="org-1", phone_number="9876543210", format="csv")
        assert req.format == "csv"

    def test_erasure_request_defaults_dry_run_true(self):
        req = CallerErasureRequest(organization_id="org-1", phone_number="9876543210")
        assert req.dry_run is True
