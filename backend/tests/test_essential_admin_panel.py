"""
backend/tests/test_essential_admin_panel.py

Authoritative Test Suite for Task 16: Essential Operations Admin Panel & Audit Trail.
Validates:
1. User listing and role modification guards.
2. Self-demotion and self-deactivation lock-out prevention.
3. Mandatory Step-Up re-authentication (`role_change`, `wallet_adjust`, `price_change`).
4. Privileged wallet balance credits/debits and consistency.
5. Global telephony pricing configuration updates.
6. Tamper-evident admin audit trail forensic queryability.
7. Direct route handler logic.
"""

import time
import os
import sys
import pytest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.essential_admin_service import EssentialAdminService
from app.services.admin_auth_service import AdminAuthService
from app.routers.admin_operations_router import (
    list_users,
    update_user_role,
    toggle_user_status,
    adjust_wallet_balance,
    update_telephony_pricing,
    get_audit_trail,
    UpdateRoleRequest,
    ToggleStatusRequest,
    AdjustWalletRequest,
    UpdatePricingRequest,
)


class MockQueryBuilder:
    def __init__(self, data=None):
        self._data = data if data is not None else []

    def select(self, *args, **kwargs):
        return self

    def insert(self, payload):
        if isinstance(payload, dict):
            self._data.append(payload)
        elif isinstance(payload, list):
            self._data.extend(payload)
        return self

    def update(self, payload):
        return self

    def upsert(self, payload):
        return self

    def eq(self, col, val):
        return self

    def order(self, col, desc=False):
        return self

    def range(self, start, end):
        return self

    def single(self):
        return self

    def execute(self):
        res = MagicMock()
        res.data = self._data
        return res


class MockSupabase:
    def __init__(self):
        self.tables = {}

    def table(self, table_name: str):
        if table_name not in self.tables:
            self.tables[table_name] = MockQueryBuilder([])
        return self.tables[table_name]


@pytest.fixture
def mock_supabase():
    sb = MockSupabase()
    # Seed initial test data
    sb.tables["profiles"] = MockQueryBuilder([
        {"id": "usr-admin-1", "email": "admin@trinetra.ai", "full_name": "Root Admin", "role": "admin", "organization_id": "org-admin", "is_active": True, "created_at": "2026-10-01T00:00:00Z"},
        {"id": "usr-cust-1", "email": "customer@acme.com", "full_name": "Acme User", "role": "customer", "organization_id": "org-acme", "is_active": True, "created_at": "2026-10-02T00:00:00Z"},
        {"id": "usr-dev-1", "email": "dev@trinetra.ai", "full_name": "Dev Tester", "role": "developer_tester", "organization_id": "org-dev", "is_active": True, "created_at": "2026-10-03T00:00:00Z"},
    ])
    sb.tables["wallets"] = MockQueryBuilder([
        {"id": "w-1", "organization_id": "org-acme", "balance_paisa": 50000}
    ])
    sb.tables["wallet_transactions"] = MockQueryBuilder([])
    sb.tables["admin_audit_trail"] = MockQueryBuilder([])
    sb.tables["system_configs"] = MockQueryBuilder([])
    return sb


@pytest.fixture
def admin_service(mock_supabase):
    return EssentialAdminService(mock_supabase)


class TestUserManagementAndRoleEscalation:
    def test_admin_list_users_success(self, admin_service):
        res = admin_service.list_users(
            admin_user_id="usr-admin-1",
            admin_role_raw="admin"
        )
        assert res["total_count"] == 3
        assert len(res["users"]) == 3

    def test_non_admin_list_users_rejected(self, admin_service):
        with pytest.raises(PermissionError, match="Access denied: Administrative privileges required"):
            admin_service.list_users(
                admin_user_id="usr-cust-1",
                admin_role_raw="customer"
            )

    def test_admin_update_user_role_success(self, admin_service):
        # Issue valid step-up token
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "role_change")
        res = admin_service.update_user_role(
            admin_user_id="usr-admin-1",
            admin_role_raw="admin",
            target_user_id="usr-cust-1",
            new_role="developer_tester",
            step_up_token=token,
            reason="Promoting trusted client to developer tester for staging verification"
        )
        assert res["success"] is True
        assert res["new_role"] == "developer_tester"
        assert "audit_id" in res

    def test_admin_self_demotion_hard_blocked(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "role_change")
        with pytest.raises(ValueError, match="Self-demotion forbidden"):
            admin_service.update_user_role(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                target_user_id="usr-admin-1",
                new_role="customer",
                step_up_token=token,
                reason="Attempting accidental self demotion"
            )

    def test_invalid_target_role_rejected(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "role_change")
        with pytest.raises(ValueError, match="Invalid target role"):
            admin_service.update_user_role(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                target_user_id="usr-cust-1",
                new_role="super_hacker",
                step_up_token=token,
                reason="Invalid role assignment test"
            )

    def test_missing_step_up_token_rejected(self, admin_service):
        with pytest.raises(PermissionError, match="Step-Up re-authentication required"):
            admin_service.update_user_role(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                target_user_id="usr-cust-1",
                new_role="admin",
                step_up_token="",
                reason="Promoting without MFA challenge"
            )

    def test_expired_or_invalid_step_up_token_rejected(self, admin_service):
        past_time = time.time() - 400
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "role_change", current_time=past_time)
        with pytest.raises(PermissionError, match="Step-Up authentication failed"):
            admin_service.update_user_role(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                target_user_id="usr-cust-1",
                new_role="admin",
                step_up_token=token,
                reason="Expired token test"
            )

    def test_short_reason_rejected(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "role_change")
        with pytest.raises(ValueError, match="Statutory justification required"):
            admin_service.update_user_role(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                target_user_id="usr-cust-1",
                new_role="admin",
                step_up_token=token,
                reason="ok"
            )


class TestUserStatusToggle:
    def test_toggle_user_status_success(self, admin_service):
        res = admin_service.toggle_user_status(
            admin_user_id="usr-admin-1",
            admin_role_raw="admin",
            target_user_id="usr-cust-1",
            is_active=False,
            reason="Suspected abusive automated calling"
        )
        assert res["success"] is True
        assert res["is_active"] is False
        assert "audit_id" in res

    def test_admin_self_deactivation_blocked(self, admin_service):
        with pytest.raises(ValueError, match="Self-deactivation forbidden"):
            admin_service.toggle_user_status(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                target_user_id="usr-admin-1",
                is_active=False,
                reason="Attempting to lock out primary admin"
            )

    def test_non_admin_toggle_status_rejected(self, admin_service):
        with pytest.raises(PermissionError, match="Access denied"):
            admin_service.toggle_user_status(
                admin_user_id="usr-dev-1",
                admin_role_raw="developer_tester",
                target_user_id="usr-cust-1",
                is_active=False,
                reason="Developer testing deactivation"
            )


class TestPrivilegedWalletAdjustments:
    def test_wallet_credit_success(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "wallet_adjust")
        res = admin_service.adjust_wallet_balance(
            admin_user_id="usr-admin-1",
            admin_role_raw="admin",
            organization_id="org-acme",
            amount_paisa=25000,
            adjustment_type="credit",
            reason="Goodwill credit due to upstream telephony outage",
            step_up_token=token
        )
        assert res["success"] is True
        assert res["previous_balance_paisa"] == 50000
        assert res["new_balance_paisa"] == 75000
        assert "transaction_id" in res

    def test_wallet_debit_success(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "wallet_adjust")
        res = admin_service.adjust_wallet_balance(
            admin_user_id="usr-admin-1",
            admin_role_raw="admin",
            organization_id="org-acme",
            amount_paisa=20000,
            adjustment_type="debit",
            reason="Manual deduction for offline hardware delivery",
            step_up_token=token
        )
        assert res["success"] is True
        assert res["previous_balance_paisa"] == 50000
        assert res["new_balance_paisa"] == 30000

    def test_wallet_debit_exceeding_balance_rejected(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "wallet_adjust")
        with pytest.raises(ValueError, match="Debit exceeds current wallet balance"):
            admin_service.adjust_wallet_balance(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                organization_id="org-acme",
                amount_paisa=999999,
                adjustment_type="debit",
                reason="Debit exceeding balance test",
                step_up_token=token
            )

    def test_wallet_adjustment_invalid_amount_rejected(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "wallet_adjust")
        with pytest.raises(ValueError, match="positive integer"):
            admin_service.adjust_wallet_balance(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                organization_id="org-acme",
                amount_paisa=-500,
                adjustment_type="credit",
                reason="Negative credit test",
                step_up_token=token
            )

    def test_wallet_adjustment_missing_step_up_rejected(self, admin_service):
        with pytest.raises(PermissionError, match="Step-Up re-authentication required"):
            admin_service.adjust_wallet_balance(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                organization_id="org-acme",
                amount_paisa=1000,
                adjustment_type="credit",
                reason="Adjustment without MFA",
                step_up_token=""
            )


class TestTelephonyPricingAndConfigs:
    def test_update_telephony_pricing_success(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "price_change")
        res = admin_service.update_telephony_pricing(
            admin_user_id="usr-admin-1",
            admin_role_raw="admin",
            pricing_updates={
                "exotel_mobile_did_cost_paisa": "16000",
                "twilio_US_local_cost_paisa": "12000",
                "trinetra_number_markup_percent": "25"
            },
            step_up_token=token,
            reason="Annual provider carrier cost adjustment"
        )
        assert res["success"] is True
        assert res["updated_configs"]["exotel_mobile_did_cost_paisa"] == "16000"
        assert "audit_id" in res

    def test_update_telephony_pricing_negative_value_rejected(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "price_change")
        with pytest.raises(ValueError, match="must be non-negative"):
            admin_service.update_telephony_pricing(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                pricing_updates={"twilio_US_local_cost_paisa": "-50"},
                step_up_token=token,
                reason="Negative pricing test"
            )

    def test_update_telephony_pricing_missing_token_rejected(self, admin_service):
        with pytest.raises(PermissionError, match="Step-Up re-authentication required"):
            admin_service.update_telephony_pricing(
                admin_user_id="usr-admin-1",
                admin_role_raw="admin",
                pricing_updates={"twilio_US_local_cost_paisa": "5000"},
                step_up_token="",
                reason="Pricing update without token"
            )


class TestAuditTrailForensics:
    def test_get_audit_trail_admin_success(self, admin_service):
        # Insert a test audit record
        admin_service.log_audit_trail(
            actor_user_id="usr-admin-1",
            actor_role="admin",
            action="role_change",
            target_type="user",
            target_id="usr-cust-1",
            details={"note": "test"},
            step_up_verified=True
        )
        res = admin_service.get_audit_trail(
            admin_user_id="usr-admin-1",
            admin_role_raw="admin",
            action_filter="role_change"
        )
        assert res["count"] >= 1
        assert "records" in res

    def test_get_audit_trail_non_admin_forbidden(self, admin_service):
        with pytest.raises(PermissionError, match="Access denied"):
            admin_service.get_audit_trail(
                admin_user_id="usr-cust-1",
                admin_role_raw="customer"
            )


class TestDirectAdminRouteLogic:
    @pytest.mark.asyncio
    async def test_route_list_users(self, admin_service):
        res = await list_users(
            role_filter=None,
            search=None,
            limit=50,
            offset=0,
            x_user_id="usr-admin-1",
            x_user_role="admin",
            service=admin_service
        )
        assert "users" in res
        assert res["total_count"] == 3

    @pytest.mark.asyncio
    async def test_route_update_user_role(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "role_change")
        payload = UpdateRoleRequest(
            new_role="customer",
            step_up_token=token,
            reason="Demoting dev tester back to customer"
        )
        res = await update_user_role(
            target_user_id="usr-dev-1",
            payload=payload,
            x_user_id="usr-admin-1",
            x_user_role="admin",
            service=admin_service
        )
        assert res["success"] is True

    @pytest.mark.asyncio
    async def test_route_toggle_status(self, admin_service):
        payload = ToggleStatusRequest(
            is_active=False,
            reason="Administrative account suspension"
        )
        res = await toggle_user_status(
            target_user_id="usr-cust-1",
            payload=payload,
            x_user_id="usr-admin-1",
            x_user_role="admin",
            service=admin_service
        )
        assert res["success"] is True
        assert res["is_active"] is False

    @pytest.mark.asyncio
    async def test_route_adjust_wallet(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "wallet_adjust")
        payload = AdjustWalletRequest(
            amount_paisa=15000,
            adjustment_type="credit",
            reason="Direct API route credit test",
            step_up_token=token
        )
        res = await adjust_wallet_balance(
            organization_id="org-acme",
            payload=payload,
            x_user_id="usr-admin-1",
            x_user_role="admin",
            service=admin_service
        )
        assert res["success"] is True
        assert res["new_balance_paisa"] == 65000

    @pytest.mark.asyncio
    async def test_route_update_telephony_pricing(self, admin_service):
        token = AdminAuthService.issue_step_up_token("usr-admin-1", "admin", "price_change")
        payload = UpdatePricingRequest(
            pricing_updates={"twilio_UK_local_cost_paisa": "14000"},
            reason="UK carrier tariff revision",
            step_up_token=token
        )
        res = await update_telephony_pricing(
            payload=payload,
            x_user_id="usr-admin-1",
            x_user_role="admin",
            service=admin_service
        )
        assert res["success"] is True

    @pytest.mark.asyncio
    async def test_route_get_audit_trail(self, admin_service):
        res = await get_audit_trail(
            action_filter=None,
            target_type=None,
            limit=10,
            offset=0,
            x_user_id="usr-admin-1",
            x_user_role="admin",
            service=admin_service
        )
        assert "records" in res
