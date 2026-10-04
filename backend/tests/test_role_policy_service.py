"""
backend/tests/test_role_policy_service.py

Comprehensive test suite verifying the Centralized Role & Exemption Policy Engine (Task 3).
Enforces Master Plan Section 18.3 & 18.4 (Authoritative Overrides).

Verifies:
1. Normalization of roles across customer, developer_tester, admin.
2. Non-exemptible compliance & security primitives cannot be bypassed by ANY role (including admin).
3. KYC document privacy: developer_tester cannot view KYC documents; admin can.
4. Business limit exemptions for developer_tester and admin.
5. Metrics exclusion for developer_tester accounts.
6. Sandbox numbers (labeled TEST) blocked from customer flows.
7. Admin 30-minute idle session timeout and step-up re-authentication actions.
"""

import pytest
from app.services.role_policy_service import (
    UserRole,
    NON_EXEMPTIBLE_PRIMITIVES,
    EXEMPTIBLE_BUSINESS_LIMITS,
    STEP_UP_REAUTH_ACTIONS,
    normalize_role,
    can_exempt,
    is_exempt_from_business_limits,
    can_view_kyc_documents,
    is_account_excluded_from_metrics,
    validate_number_for_flow,
    requires_step_up_reauth,
    get_admin_session_timeout_seconds,
)


class TestRoleNormalization:
    """Verifies that all legacy and variant role strings map to canonical roles."""

    def test_customer_role_normalization(self):
        assert normalize_role("customer") == UserRole.CUSTOMER
        assert normalize_role("client") == UserRole.CUSTOMER
        assert normalize_role("user") == UserRole.CUSTOMER
        assert normalize_role("") == UserRole.CUSTOMER
        assert normalize_role(None) == UserRole.CUSTOMER
        assert normalize_role("unknown_role") == UserRole.CUSTOMER

    def test_developer_tester_role_normalization(self):
        assert normalize_role("developer_tester") == UserRole.DEVELOPER_TESTER
        assert normalize_role("dev_test") == UserRole.DEVELOPER_TESTER
        assert normalize_role("tester") == UserRole.DEVELOPER_TESTER
        assert normalize_role(" DEVELOPER_TESTER ") == UserRole.DEVELOPER_TESTER

    def test_admin_role_normalization(self):
        assert normalize_role("admin") == UserRole.ADMIN
        assert normalize_role("super_admin") == UserRole.ADMIN
        assert normalize_role(" ADMIN ") == UserRole.ADMIN


class TestNonExemptibleSecurityPrimitives:
    """Verifies that compliance, disclosure, audit, and security primitives can NEVER be bypassed."""

    @pytest.mark.parametrize("role", ["customer", "client", "developer_tester", "admin", "super_admin"])
    @pytest.mark.parametrize("primitive", list(NON_EXEMPTIBLE_PRIMITIVES))
    def test_no_role_can_bypass_primitives(self, role, primitive):
        """Under Section 18.3, NO role (even admin) can exempt disclosure, PII, audit, curfew, DND, or MFA."""
        res = can_exempt(role, primitive)
        assert res["exempt"] is False, f"Role '{role}' illegally exempted primitive '{primitive}'!"
        assert "NEVER be bypassed" in res["reason"]


class TestKycDocumentPermissions:
    """Verifies that developer_tester accounts are strictly forbidden from viewing customer KYC."""

    def test_developer_tester_cannot_view_kyc(self):
        assert can_view_kyc_documents("developer_tester") is False
        assert can_view_kyc_documents("dev_test") is False

    def test_customer_cannot_view_general_kyc(self):
        assert can_view_kyc_documents("customer") is False
        assert can_view_kyc_documents("client") is False

    def test_admin_can_view_kyc_with_stepup(self):
        assert can_view_kyc_documents("admin") is True
        assert can_view_kyc_documents("super_admin") is True
        # Must require step-up re-authentication
        assert requires_step_up_reauth("kyc_view") is True


class TestBusinessLimitExemptions:
    """Verifies that developer_tester and admin are exempt from business limits, while customers are not."""

    @pytest.mark.parametrize("limit_key", list(EXEMPTIBLE_BUSINESS_LIMITS))
    def test_developer_tester_and_admin_exempt_from_business_limits(self, limit_key):
        assert is_exempt_from_business_limits("developer_tester", limit_key) is True
        assert is_exempt_from_business_limits("admin", limit_key) is True

    @pytest.mark.parametrize("limit_key", list(EXEMPTIBLE_BUSINESS_LIMITS))
    def test_customers_not_exempt_from_business_limits(self, limit_key):
        assert is_exempt_from_business_limits("customer", limit_key) is False
        assert is_exempt_from_business_limits("client", limit_key) is False


class TestMetricsExclusion:
    """Verifies that developer_tester accounts are excluded from business revenue and compliance metrics."""

    def test_developer_tester_excluded_from_metrics(self):
        assert is_account_excluded_from_metrics("developer_tester") is True
        assert is_account_excluded_from_metrics("dev_test") is True

    def test_customer_included_in_metrics(self):
        assert is_account_excluded_from_metrics("customer") is False
        assert is_account_excluded_from_metrics("client") is False

    def test_admin_included_in_metrics(self):
        assert is_account_excluded_from_metrics("admin") is False


class TestSandboxNumberValidation:
    """Verifies sandbox number isolation and live customer flow restrictions."""

    def test_sandbox_number_blocked_from_customer_campaigns(self):
        sandbox_meta = {"is_sandbox": True, "label": "TEST"}
        valid, reason = validate_number_for_flow(sandbox_meta, "customer_campaign")
        assert valid is False
        assert "strictly prohibited" in reason

    def test_sandbox_number_blocked_from_customer_live_inbound(self):
        sandbox_meta = {"sandbox_label": "TEST"}
        valid, reason = validate_number_for_flow(sandbox_meta, "customer_inbound")
        assert valid is False
        assert "strictly prohibited" in reason

    def test_sandbox_number_allowed_in_test_flow(self):
        sandbox_meta = {"is_sandbox": True, "label": "TEST"}
        valid, reason = validate_number_for_flow(sandbox_meta, "testing")
        assert valid is True
        assert reason is None

    def test_real_number_with_verified_kyc_allowed(self):
        real_meta = {"is_sandbox": False, "kyc_status": "verified"}
        valid, reason = validate_number_for_flow(real_meta, "customer_campaign")
        assert valid is True
        assert reason is None

    def test_real_number_with_pending_kyc_blocked_from_live_flow(self):
        real_meta = {"is_sandbox": False, "kyc_status": "pending"}
        valid, reason = validate_number_for_flow(real_meta, "customer_campaign")
        assert valid is False
        assert "without verified provider KYC" in reason


class TestAdminSessionsAndStepUpAuth:
    """Verifies admin 30-minute idle session timeout and step-up re-authentication."""

    def test_admin_idle_timeout_is_30_minutes(self):
        timeout = get_admin_session_timeout_seconds()
        assert timeout == 1800  # 30 * 60 seconds

    @pytest.mark.parametrize("action", ["kyc_view", "wallet_adjust", "price_change", "credential_update"])
    def test_privileged_actions_require_step_up(self, action):
        assert requires_step_up_reauth(action) is True

    @pytest.mark.parametrize("action", ["dashboard_view", "list_agents", "view_calls"])
    def test_unprivileged_actions_do_not_require_step_up(self, action):
        assert requires_step_up_reauth(action) is False
