"""
backend/tests/test_admin_sessions_stepup.py

Comprehensive Automated Verification Suite for Task 9:
Admin 30-Minute Idle Sessions, Mandatory MFA & Privileged Step-Up Auth.
Implements and enforces Master Plan Section 18.4 (Authoritative Overrides).

Test Suite Matrix:
1. TestAdminIdleTimeout:
   - Asserts admin idle timeout is strictly 1800s (30m), not 24h.
   - Asserts active session at 15m (900s) and 29m (1740s).
   - Asserts session expiry at 30m+1s (1801s) with status SESSION_EXPIRED.
2. TestMandatoryMFA:
   - Asserts admin without MFA is rejected with MFA_REQUIRED.
   - Asserts developer_tester without MFA is rejected with MFA_REQUIRED.
   - Asserts customer role is denied administrative access.
   - Asserts mfa_requirement is non-exemptible across all roles.
3. TestRFC6238TOTP:
   - Asserts deterministic TOTP generation and verification.
   - Asserts clock drift tolerance (+/- 30s).
   - Asserts rejection of incorrect or malformed codes.
4. TestStepUpAuthToken:
   - Asserts cryptographic HMAC-SHA256 signature validity.
   - Asserts 300s (5m) expiration limit.
   - Asserts rejection of tampered tokens and action/user mismatches.
5. TestPrivilegedOperationsAndKYC:
   - Asserts developer_tester accounts are strictly forbidden from viewing KYC documents.
   - Asserts admin without step-up auth cannot view KYC documents.
   - Asserts admin with step-up auth is authorized and audit log is recorded.
   - Asserts wallet adjustments, price changes, and credential rotations require step-up auth.
6. TestAdminAuthFastAPIRoutes:
   - End-to-end integration tests using FastAPI TestClient.
"""

import os
import sys
import time
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.admin_auth_service import (
    AdminAuthService,
    ADMIN_IDLE_TIMEOUT_SECONDS,
    STEP_UP_TOKEN_VALIDITY_SECONDS,
    generate_totp_code,
    verify_totp_code,
)
from app.services.role_policy_service import (
    UserRole,
    can_exempt,
    NON_EXEMPTIBLE_PRIMITIVES,
    can_view_kyc_documents,
)
from main import app

client = TestClient(app)

TEST_B32_SECRET = "JBSWY3DPEHPK3PXP"  # Standard RFC test secret ("Hello!")


class MockTable:
    def __init__(self):
        self.rows = []

    def insert(self, payload):
        self.rows.append(payload)
        return self

    def execute(self):
        return MagicMock(data=self.rows)


class MockSupabase:
    def __init__(self):
        self.tables = {
            "audit_logs": MockTable(),
            "revenue_audit_logs": MockTable(),
        }

    def table(self, name):
        if name not in self.tables:
            self.tables[name] = MockTable()
        return self.tables[name]


# =============================================================================
# 1. Admin Idle Timeout Tests (30 Minutes / 1,800s)
# =============================================================================
class TestAdminIdleTimeout:

    def test_timeout_constant_is_1800_seconds(self):
        """Admin idle session timeout must be exactly 1800 seconds (30 minutes)."""
        assert ADMIN_IDLE_TIMEOUT_SECONDS == 1800
        # Assert legacy 24h (86400s) is strictly replaced
        assert ADMIN_IDLE_TIMEOUT_SECONDS < 86400

    def test_active_session_within_30_minutes(self):
        """Session active at 10 minutes and 29 minutes."""
        start_time = 1000000.0
        # 10 minutes elapsed (600s)
        is_valid, status, details = AdminAuthService.validate_admin_session(
            user_id="usr_admin_01",
            role_raw="admin",
            last_active_at=start_time,
            is_mfa_verified=True,
            current_time=start_time + 600.0,
        )
        assert is_valid is True
        assert status == "SESSION_ACTIVE"
        assert details["expires_in_seconds"] == 1200

        # 29 minutes elapsed (1740s)
        is_valid_29, status_29, details_29 = AdminAuthService.validate_admin_session(
            user_id="usr_admin_01",
            role_raw="admin",
            last_active_at=start_time,
            is_mfa_verified=True,
            current_time=start_time + 1740.0,
        )
        assert is_valid_29 is True
        assert status_29 == "SESSION_ACTIVE"
        assert details_29["expires_in_seconds"] == 60

    def test_expired_session_beyond_30_minutes(self):
        """Session must be rejected immediately at 1801 seconds (30m + 1s)."""
        start_time = 1000000.0
        is_valid, status, details = AdminAuthService.validate_admin_session(
            user_id="usr_admin_01",
            role_raw="admin",
            last_active_at=start_time,
            is_mfa_verified=True,
            current_time=start_time + 1801.0,
        )
        assert is_valid is False
        assert status == "SESSION_EXPIRED"
        assert "expired due to inactivity" in details["error"]


# =============================================================================
# 2. Mandatory MFA Enforcement Tests
# =============================================================================
class TestMandatoryMFA:

    def test_admin_without_mfa_is_rejected(self):
        """Admin without MFA verified cannot maintain active admin session."""
        now = time.time()
        is_valid, status, details = AdminAuthService.validate_admin_session(
            user_id="usr_admin_01",
            role_raw="admin",
            last_active_at=now,
            is_mfa_verified=False,
            current_time=now,
        )
        assert is_valid is False
        assert status == "MFA_REQUIRED"
        assert "Mandatory Multi-Factor Authentication" in details["error"]

    def test_developer_tester_without_mfa_is_rejected(self):
        """developer_tester accounts also require mandatory MFA under Section 18.4."""
        now = time.time()
        is_valid, status, details = AdminAuthService.validate_admin_session(
            user_id="usr_dev_01",
            role_raw="developer_tester",
            last_active_at=now,
            is_mfa_verified=False,
            current_time=now,
        )
        assert is_valid is False
        assert status == "MFA_REQUIRED"

    def test_customer_role_denied_admin_session(self):
        """Customer role is denied from starting an administrative session."""
        now = time.time()
        is_valid, status, details = AdminAuthService.validate_admin_session(
            user_id="usr_cust_01",
            role_raw="customer",
            last_active_at=now,
            is_mfa_verified=True,
            current_time=now,
        )
        assert is_valid is False
        assert status == "ACCESS_DENIED"

    def test_mfa_is_non_exemptible_in_central_policy(self):
        """mfa_requirement primitive cannot be bypassed by any role including admin."""
        res_admin = can_exempt("admin", "mfa_requirement")
        assert res_admin["exempt"] is False
        assert "can NEVER be bypassed" in res_admin["reason"]

        res_dev = can_exempt("developer_tester", "mfa_requirement")
        assert res_dev["exempt"] is False


# =============================================================================
# 3. RFC 6238 Pure Python TOTP Generator & Verifier Tests
# =============================================================================
class TestRFC6238TOTP:

    def test_totp_code_generation_format(self):
        """Generated code must be a 6-digit zero-padded numeric string."""
        code = generate_totp_code(TEST_B32_SECRET, timestamp=1000000.0)
        assert len(code) == 6
        assert code.isdigit()

    def test_totp_code_verification_success(self):
        """Verification passes for current time window."""
        t = 1234567890.0
        code = generate_totp_code(TEST_B32_SECRET, timestamp=t)
        assert verify_totp_code(TEST_B32_SECRET, code, timestamp=t) is True

    def test_totp_clock_drift_tolerance(self):
        """Verification tolerates +/- 30s clock drift."""
        t = 1234567890.0
        # Code generated 25 seconds ago (within previous 30s interval)
        code_prev = generate_totp_code(TEST_B32_SECRET, timestamp=t - 25.0)
        assert verify_totp_code(TEST_B32_SECRET, code_prev, timestamp=t, window=1) is True

        # Code generated 25 seconds in future (within next 30s interval)
        code_next = generate_totp_code(TEST_B32_SECRET, timestamp=t + 25.0)
        assert verify_totp_code(TEST_B32_SECRET, code_next, timestamp=t, window=1) is True

    def test_totp_rejection_of_invalid_code(self):
        """Verification rejects wrong, empty, or malformed codes."""
        t = 1234567890.0
        assert verify_totp_code(TEST_B32_SECRET, "000000", timestamp=t) is False
        assert verify_totp_code(TEST_B32_SECRET, "abc", timestamp=t) is False
        assert verify_totp_code(TEST_B32_SECRET, "", timestamp=t) is False


# =============================================================================
# 4. Step-Up Authorization Token Tests
# =============================================================================
class TestStepUpAuthToken:

    def test_token_validity_constant_is_300_seconds(self):
        """Step-up token must be valid for exactly 300 seconds (5 minutes)."""
        assert STEP_UP_TOKEN_VALIDITY_SECONDS == 300

    def test_step_up_token_issuance_and_verification(self):
        """Token issued for kyc_view is verified within 300s."""
        t = 1000000.0
        token = AdminAuthService.issue_step_up_token(
            user_id="usr_admin_01",
            role_raw="admin",
            action="kyc_view",
            current_time=t,
            ttl_seconds=300,
        )
        assert isinstance(token, str)
        assert "." in token

        is_valid, msg, payload = AdminAuthService.verify_step_up_token(
            token=token,
            expected_user_id="usr_admin_01",
            expected_action="kyc_view",
            current_time=t + 100.0,
        )
        assert is_valid is True
        assert msg == "STEP_UP_VERIFIED"
        assert payload["sub"] == "usr_admin_01"
        assert payload["action"] == "kyc_view"

    def test_step_up_token_expiration(self):
        """Token must be rejected after 300 seconds."""
        t = 1000000.0
        token = AdminAuthService.issue_step_up_token(
            user_id="usr_admin_01",
            role_raw="admin",
            action="kyc_view",
            current_time=t,
            ttl_seconds=300,
        )
        is_valid, msg, _ = AdminAuthService.verify_step_up_token(
            token=token,
            expected_user_id="usr_admin_01",
            expected_action="kyc_view",
            current_time=t + 301.0,
        )
        assert is_valid is False
        assert msg == "TOKEN_EXPIRED"

    def test_step_up_token_tampering_rejected(self):
        """Tampered token signature is rejected with INVALID_SIGNATURE."""
        token = AdminAuthService.issue_step_up_token("usr_admin_01", "admin", "kyc_view")
        tampered = token[:-4] + "XXXX"
        is_valid, msg, _ = AdminAuthService.verify_step_up_token(tampered, "usr_admin_01", "kyc_view")
        assert is_valid is False
        assert msg == "INVALID_SIGNATURE"

    def test_step_up_token_user_mismatch_rejected(self):
        """Token issued to user A cannot be used by user B."""
        token = AdminAuthService.issue_step_up_token("usr_admin_A", "admin", "kyc_view")
        is_valid, msg, _ = AdminAuthService.verify_step_up_token(token, "usr_admin_B", "kyc_view")
        assert is_valid is False
        assert msg == "USER_MISMATCH"

    def test_step_up_token_action_mismatch_rejected(self):
        """Token issued for kyc_view cannot be used for wallet_adjust."""
        token = AdminAuthService.issue_step_up_token("usr_admin_01", "admin", "kyc_view")
        is_valid, msg, _ = AdminAuthService.verify_step_up_token(token, "usr_admin_01", "wallet_adjust")
        assert is_valid is False
        assert msg == "ACTION_MISMATCH"


# =============================================================================
# 5. Privileged Operations & KYC Privacy Tests
# =============================================================================
class TestPrivilegedOperationsAndKYC:

    def test_developer_tester_forbidden_from_kyc(self):
        """developer_tester accounts are strictly forbidden from viewing customer KYC documents."""
        # Policy function
        assert can_view_kyc_documents("developer_tester") is False
        assert can_view_kyc_documents("admin") is True

        # Service enforcement
        service = AdminAuthService()
        token = AdminAuthService.issue_step_up_token("usr_dev_01", "developer_tester", "kyc_view")
        authorized, reason = service.authorize_kyc_document_access(
            admin_user_id="usr_dev_01",
            role_raw="developer_tester",
            step_up_token=token,
            document_id="doc_kyc_999",
        )
        assert authorized is False
        assert "Developer/tester accounts are strictly forbidden" in reason

    def test_admin_kyc_view_requires_step_up(self):
        """Admin without valid step-up token is denied KYC view."""
        service = AdminAuthService()
        authorized, reason = service.authorize_kyc_document_access(
            admin_user_id="usr_admin_01",
            role_raw="admin",
            step_up_token="invalid.token",
            document_id="doc_kyc_999",
        )
        assert authorized is False
        assert "step-up authentication required" in reason.lower()

    def test_admin_kyc_view_authorized_with_audit_log(self):
        """Admin with valid step-up token is authorized and audit log is recorded."""
        mock_db = MockSupabase()
        service = AdminAuthService(supabase_client=mock_db)

        token = AdminAuthService.issue_step_up_token("usr_admin_01", "admin", "kyc_view")
        authorized, msg = service.authorize_kyc_document_access(
            admin_user_id="usr_admin_01",
            role_raw="admin",
            step_up_token=token,
            document_id="doc_kyc_999",
            client_ip="192.168.1.1",
        )
        assert authorized is True
        assert "authorized" in msg.lower()

        # Verify audit log entry
        audit_records = mock_db.tables["audit_logs"].rows
        assert len(audit_records) == 1
        assert audit_records[0]["action"] == "admin.kyc_document_accessed"
        assert audit_records[0]["user_id"] == "usr_admin_01"
        assert audit_records[0]["resource_id"] == "doc_kyc_999"

    def test_wallet_adjustment_requires_step_up_and_logs(self):
        """Wallet balance adjustment requires admin + step-up auth and records audit trail."""
        mock_db = MockSupabase()
        service = AdminAuthService(supabase_client=mock_db)

        token = AdminAuthService.issue_step_up_token("usr_admin_01", "admin", "wallet_adjust")
        authorized, msg = service.authorize_wallet_balance_adjustment(
            admin_user_id="usr_admin_01",
            role_raw="admin",
            step_up_token=token,
            target_org_id="org_target_01",
            adjustment_amount_paisa=50000,
            reason="Customer goodwill credit",
        )
        assert authorized is True
        assert len(mock_db.tables["audit_logs"].rows) == 1
        assert mock_db.tables["audit_logs"].rows[0]["action"] == "admin.wallet_balance_adjusted"

    def test_pricing_and_credential_updates_require_step_up(self):
        """Pricing and credential updates require admin role and step-up token."""
        mock_db = MockSupabase()
        service = AdminAuthService(supabase_client=mock_db)

        # Price change
        token_price = AdminAuthService.issue_step_up_token("usr_admin_01", "admin", "price_change")
        auth_price, _ = service.authorize_global_pricing_change(
            admin_user_id="usr_admin_01",
            role_raw="admin",
            step_up_token=token_price,
            plan_key="trial_plan",
            changes={"price_paisa": 9900},
        )
        assert auth_price is True

        # Credential rotation
        token_cred = AdminAuthService.issue_step_up_token("usr_admin_01", "admin", "credential_update")
        auth_cred, _ = service.authorize_credential_update(
            admin_user_id="usr_admin_01",
            role_raw="admin",
            step_up_token=token_cred,
            provider_name="exotel",
            credential_type="api_token",
        )
        assert auth_cred is True
        assert len(mock_db.tables["audit_logs"].rows) == 2


# =============================================================================
# 6. FastAPI Endpoints Integration Tests
# =============================================================================
class TestAdminAuthFastAPIRoutes:

    def test_route_session_verify_active(self):
        """POST /api/admin/auth/session/verify returns 200 for active session."""
        now = time.time()
        res = client.post(
            "/api/admin/auth/session/verify",
            json={
                "user_id": "usr_adm_01",
                "role": "admin",
                "last_active_at": now - 300,  # 5 min ago
                "is_mfa_verified": True,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["session"]["role"] == "admin"

    def test_route_session_verify_expired(self):
        """POST /api/admin/auth/session/verify returns 401 when idle > 1800s."""
        now = time.time()
        res = client.post(
            "/api/admin/auth/session/verify",
            json={
                "user_id": "usr_adm_01",
                "role": "admin",
                "last_active_at": now - 1805,  # > 30 minutes
                "is_mfa_verified": True,
            },
        )
        assert res.status_code == 401
        assert "expired" in res.json()["detail"]["error"]

    def test_route_session_verify_mfa_required(self):
        """POST /api/admin/auth/session/verify returns 403 when MFA not verified."""
        now = time.time()
        res = client.post(
            "/api/admin/auth/session/verify",
            json={
                "user_id": "usr_adm_01",
                "role": "admin",
                "last_active_at": now - 60,
                "is_mfa_verified": False,
            },
        )
        assert res.status_code == 403
        assert "Multi-Factor Authentication" in res.json()["detail"]["error"]

    def test_route_step_up_challenge_success_and_use(self):
        """POST /api/admin/auth/step-up/challenge issues token that authorizes KYC view."""
        # 1. Request step-up token with valid password
        res = client.post(
            "/api/admin/auth/step-up/challenge",
            json={
                "user_id": "usr_adm_99",
                "role": "admin",
                "action": "kyc_view",
                "credential_type": "password",
                "credential": "trinetra-admin-secure-2026",
            },
        )
        assert res.status_code == 200
        token = res.json()["step_up_token"]
        assert token is not None

        # 2. Use token on secure KYC view
        res_kyc = client.post(
            "/api/admin/auth/kyc/view",
            json={
                "user_id": "usr_adm_99",
                "role": "admin",
                "document_id": "doc_identity_777",
                "step_up_token": token,
            },
        )
        assert res_kyc.status_code == 200
        assert res_kyc.json()["authorized"] is True

    def test_route_kyc_view_developer_tester_forbidden(self):
        """POST /api/admin/auth/kyc/view strictly rejects developer_tester role."""
        token = AdminAuthService.issue_step_up_token("usr_dev_99", "developer_tester", "kyc_view")
        res = client.post(
            "/api/admin/auth/kyc/view",
            json={
                "user_id": "usr_dev_99",
                "role": "developer_tester",
                "document_id": "doc_identity_777",
                "step_up_token": token,
            },
        )
        assert res.status_code == 403
        assert "forbidden" in str(res.json()["detail"]).lower()
