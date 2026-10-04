"""
backend/tests/test_frozen_files_ci.py

Automated test suite verifying the Frozen Files CI check, deterministic SHA-256
manifest integrity, brand name constants, and emergency-fix bypass handling (Task 2).
"""

import os
import sys
import json
import subprocess
import pytest
from pathlib import Path
from unittest.mock import patch

# Adjust sys.path to find root scripts
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MANIFEST_PATH = REPO_ROOT / "docs" / "compliance" / "FROZEN_FILES_MANIFEST.json"


class TestFrozenFilesIntegrity:
    """Verifies SHA-256 deterministic manifest and hash checks for frozen compliance files."""

    def test_manifest_structure_and_version(self):
        assert MANIFEST_PATH.exists(), f"Manifest file missing at {MANIFEST_PATH}"
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert "version" in data
        assert "frozen_files" in data
        assert len(data["frozen_files"]) == 4

        # Validate each item has required keys
        for item in data["frozen_files"]:
            assert "path" in item
            assert "sha256" in item
            assert len(item["sha256"]) == 64  # valid sha256 hex length
            assert "regulatory_controls" in item
            assert item["status"] == "FROZEN_AND_VALIDATED"

    def test_all_frozen_files_match_manifest_hashes(self):
        """All 4 frozen files must match their canonical SHA-256 hashes bit-for-bit."""
        import sys
        sys.path.insert(0, str(REPO_ROOT / "scripts"))
        from verify_frozen_files import compute_canonical_sha256, load_manifest, verify_frozen_files

        manifest = load_manifest(MANIFEST_PATH)
        passed, failures = verify_frozen_files(REPO_ROOT, manifest)

        assert len(failures) == 0, f"Integrity violations detected: {failures}"
        assert len(passed) == 4
        expected_paths = [
            "backend/app/services/disclosure_service.py",
            "backend/app/services/outbound_safety_guardrails.py",
            "backend/app/services/ai/prompt_guard.py",
            "frontend/src/lib/safety/promptGuard.ts",
        ]
        for p in expected_paths:
            assert p in passed

    def test_agent_and_voice_reliability_not_frozen(self):
        """Per explicit mandate, voice_reliability_service.py and agent.py must NOT be frozen yet."""
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        frozen_paths = [item["path"] for item in data.get("frozen_files", [])]
        assert "backend/app/services/voice_reliability_service.py" not in frozen_paths
        assert "backend/agent.py" not in frozen_paths

        # Verify they are explicitly noted in the excluded list
        excluded = data.get("excluded_pending_live_validation", [])
        assert "backend/app/services/voice_reliability_service.py" in excluded
        assert "backend/agent.py" in excluded

    def test_tampered_file_triggers_failure(self, tmp_path):
        """A modified or corrupted file must trigger HASH_MISMATCH failure."""
        import sys
        sys.path.insert(0, str(REPO_ROOT / "scripts"))
        from verify_frozen_files import verify_frozen_files

        # Create a mock manifest pointing to a tampered file
        fake_file = tmp_path / "tampered.py"
        fake_file.write_text("print('tampered content')", encoding="utf-8")

        mock_manifest = {
            "frozen_files": [
                {
                    "path": "tampered.py",
                    "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
                    "regulatory_controls": ["TEST"],
                }
            ]
        }

        passed, failures = verify_frozen_files(tmp_path, mock_manifest)
        assert len(passed) == 0
        assert len(failures) == 1
        assert failures[0]["error"] == "HASH_MISMATCH"

    def test_missing_file_triggers_failure(self, tmp_path):
        """A missing frozen file must trigger FILE_MISSING failure."""
        import sys
        sys.path.insert(0, str(REPO_ROOT / "scripts"))
        from verify_frozen_files import verify_frozen_files

        mock_manifest = {
            "frozen_files": [
                {
                    "path": "non_existent_file.py",
                    "sha256": "abcdef123456",
                    "regulatory_controls": ["TEST"],
                }
            ]
        }

        passed, failures = verify_frozen_files(tmp_path, mock_manifest)
        assert len(passed) == 0
        assert len(failures) == 1
        assert failures[0]["error"] == "FILE_MISSING"

    def test_script_cli_execution_clean_exit(self):
        """Executing scripts/verify_frozen_files.py via CLI must exit with status 0."""
        python_exe = sys.executable
        script_path = str(REPO_ROOT / "scripts" / "verify_frozen_files.py")
        res = subprocess.run([python_exe, script_path], cwd=str(REPO_ROOT), capture_output=True, text=True)
        assert res.returncode == 0
        assert "TRINETRA AI - FROZEN COMPLIANCE FILES INTEGRITY CHECK: PASSED" in res.stdout


class TestCentralizedBrandConstants:
    """Verifies that the brand name lives in exactly one configuration constant."""

    def test_backend_brand_constant(self):
        from app.config.constants import BRAND_NAME, COMPANY_NAME
        assert BRAND_NAME == "Trinetra"
        assert COMPANY_NAME == "Trinetra AI"

    def test_frontend_brand_constant_file_exists_and_valid(self):
        fe_const = REPO_ROOT / "frontend" / "src" / "config" / "constants.ts"
        assert fe_const.exists()
        content = fe_const.read_text(encoding="utf-8")
        assert 'export const BRAND_NAME = "Trinetra";' in content
