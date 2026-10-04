"""
backend/tests/test_backup_restore_drill.py

Comprehensive Test Suite for Task 19:
Automated Backup & Restore Drill Engine, Runbook & Status Router.
Implements Master Plan Section 18.15 Item 17 & Section 18.2 Non-Destructive Guardrails.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.backup_restore_service import BackupRestoreService
from app.services.admin_auth_service import AdminAuthService
from app.routers.backup_router import get_drill_status, run_synthetic_drill


# ===========================================================================
# 1. Snapshot Generation & Cryptographic Checksum Tests
# ===========================================================================

class TestBackupSnapshotAndChecksum:
    def test_calculate_sha256_deterministic(self):
        digest1 = BackupRestoreService.calculate_sha256("Trinetra Database Payload")
        digest2 = BackupRestoreService.calculate_sha256("Trinetra Database Payload")
        digest3 = BackupRestoreService.calculate_sha256("Modified Payload")
        assert digest1 == digest2
        assert digest1 != digest3
        assert len(digest1) == 64

    def test_create_synthetic_snapshot_structure(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        assert "payload" in snapshot
        assert "checksum_sha256" in snapshot
        assert "created_at" in snapshot
        
        payload = snapshot["payload"]
        assert payload["snapshot_type"] == "synthetic_drill"
        assert len(payload["core_tables"]) == 10
        for table in BackupRestoreService.CORE_TABLES:
            assert table in payload["table_data"]
            assert len(payload["table_data"][table]) >= 1

    def test_checksum_verification_valid(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        is_valid = BackupRestoreService.verify_checksum(
            snapshot["payload"],
            snapshot["checksum_sha256"]
        )
        assert is_valid is True

    def test_checksum_verification_detects_tampering(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        tampered_payload = dict(snapshot["payload"])
        # Mutate nested payload
        tampered_payload["table_data"]["wallets"][0]["balance_paisa"] = 999999999
        is_valid = BackupRestoreService.verify_checksum(
            tampered_payload,
            snapshot["checksum_sha256"]
        )
        assert is_valid is False


# ===========================================================================
# 2. Synthetic Restore Simulation & Integrity Tests
# ===========================================================================

class TestSyntheticRestoreSimulation:
    def test_successful_synthetic_restore(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        report = BackupRestoreService.simulate_synthetic_restore(snapshot)
        assert report["restore_status"] == "SUCCESS"
        assert report["checksum_verified"] is True
        assert report["tables_restored"] == 10
        assert report["rpo_compliant"] is True
        assert report["rto_compliant"] is True
        assert "row_counts" in report
        assert report["row_counts"]["user_profiles"] == 1
        assert report["row_counts"]["kyc_records"] == 1

    def test_missing_core_tables_fails_restore(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        # Remove a mandatory core table
        del snapshot["payload"]["table_data"]["invoices"]
        # Recalculate checksum so checksum check passes and table check triggers
        import json
        snapshot["checksum_sha256"] = BackupRestoreService.calculate_sha256(
            json.dumps(snapshot["payload"], sort_keys=True)
        )

        report = BackupRestoreService.simulate_synthetic_restore(snapshot)
        assert report["restore_status"] == "FAILED"
        assert "invoices" in report["reason"]

    def test_foreign_key_violation_fails_restore(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        # Break foreign key: agent references non-existent user
        snapshot["payload"]["table_data"]["agents"][0]["user_id"] = "non_existent_user_999"
        import json
        snapshot["checksum_sha256"] = BackupRestoreService.calculate_sha256(
            json.dumps(snapshot["payload"], sort_keys=True)
        )

        report = BackupRestoreService.simulate_synthetic_restore(snapshot)
        assert report["restore_status"] == "FAILED"
        assert "Foreign key violation" in report["reason"]

    def test_checksum_mismatch_fails_restore(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        snapshot["checksum_sha256"] = "bad_checksum_0000000000000000000000000000000000000000000000000000"

        report = BackupRestoreService.simulate_synthetic_restore(snapshot)
        assert report["restore_status"] == "FAILED"
        assert report["checksum_verified"] is False
        assert "checksum" in report["reason"].lower()


# ===========================================================================
# 3. RPO and RTO Threshold Verification
# ===========================================================================

class TestRPOAndRTOThresholds:
    def test_rpo_compliant_when_within_1_hour(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        report = BackupRestoreService.simulate_synthetic_restore(snapshot)
        assert report["rpo_compliant"] is True
        assert report["rpo_achieved_seconds"] <= 3600

    def test_rpo_exceeded_flagged(self):
        snapshot = BackupRestoreService.create_synthetic_snapshot()
        # Set created_at to 2 hours ago
        stale_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        snapshot["created_at"] = stale_time
        snapshot["payload"]["created_at"] = stale_time
        import json
        snapshot["checksum_sha256"] = BackupRestoreService.calculate_sha256(
            json.dumps(snapshot["payload"], sort_keys=True)
        )

        report = BackupRestoreService.simulate_synthetic_restore(snapshot)
        assert report["rpo_compliant"] is False
        assert report["rpo_achieved_seconds"] > 3600

    def test_run_drill_persists_audit_entry(self):
        mock_sb = MagicMock()
        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_table.insert.return_value.execute.return_value = MagicMock(data=[{"id": 1}])

        report = BackupRestoreService.run_drill(
            admin_user_id="adm_test_001",
            mode="synthetic",
            supabase_client=mock_sb
        )
        assert report["restore_status"] == "SUCCESS"
        assert mock_sb.table.called
        assert mock_table.insert.called


# ===========================================================================
# 4. Backup Router Endpoint Direct Handlers
# ===========================================================================

class TestBackupRouterEndpoints:
    @pytest.mark.asyncio
    async def test_get_drill_status(self):
        res = await get_drill_status()
        assert "restore_status" in res
        assert "checksum_sha256" in res
        assert res["restore_status"] == "SUCCESS"

    @pytest.mark.asyncio
    async def test_run_synthetic_drill_admin_success(self):
        res = await run_synthetic_drill(
            x_admin_user_id="adm_001",
            x_admin_role="admin",
            x_step_up_token=None
        )
        assert res["success"] is True
        assert "drill_report" in res
        assert res["drill_report"]["tables_restored"] == 10

    @pytest.mark.asyncio
    async def test_run_synthetic_drill_non_admin_forbidden(self):
        with pytest.raises(HTTPException) as exc:
            await run_synthetic_drill(
                x_admin_user_id="usr_customer",
                x_admin_role="customer",
                x_step_up_token=None
            )
        assert exc.value.status_code == 403
        assert "Forbidden" in exc.value.detail

    @pytest.mark.asyncio
    async def test_run_synthetic_drill_with_valid_step_up_token(self):
        token = AdminAuthService.issue_step_up_token("adm_001", "admin", "backup_drill")
        res = await run_synthetic_drill(
            x_admin_user_id="adm_001",
            x_admin_role="admin",
            x_step_up_token=token
        )
        assert res["success"] is True

    @pytest.mark.asyncio
    async def test_run_synthetic_drill_with_invalid_step_up_token(self):
        with pytest.raises(HTTPException) as exc:
            await run_synthetic_drill(
                x_admin_user_id="adm_001",
                x_admin_role="admin",
                x_step_up_token="fake.forged.token"
            )
        assert exc.value.status_code == 401
        assert "Invalid or expired" in exc.value.detail


# ===========================================================================
# 5. Runbook Documentation Completeness
# ===========================================================================

class TestRunbookDocumentation:
    def test_runbook_file_exists_and_complete(self):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        runbook_path = os.path.join(repo_root, "docs", "operations", "BACKUP_RESTORE_DRILL_RUNBOOK.md")
        assert os.path.exists(runbook_path), f"Runbook missing at {runbook_path}"

        with open(runbook_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Required operational criteria per Master Plan
        assert "Recovery Point Objective (RPO)" in content
        assert "<= 1 Hour" in content
        assert "Recovery Time Objective (RTO)" in content
        assert "<= 4 Hours" in content
        assert "SHA-256" in content
        assert "Point-in-Time Recovery" in content
        assert "user_profiles" in content
        assert "kyc_records" in content
        assert "Synthetic Isolated Schema" in content
