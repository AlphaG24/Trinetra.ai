"""
backend/tests/test_billing_and_payments_b1_b6.py

Comprehensive Verification Suite for Master Plan Section 1.6 (Billing & Payments):
- B1: Wallet Model (Prepaid wallet, Razorpay funding, zero card numbers stored, zero mid-call drops)
- B2: Subscription Charge (Separated from prepaid wallet; auto-debit or manual)
- B3: Failed Payment Flow (3 retries over 3 days -> 15-day grace -> 14-day hold -> pool release)
- B4: Invoice Delivery (Email + WhatsApp India + permanent in-app vault)
- B5: Credit Rollover (180 days per revised refund policy)
- B6: GST Invoicing (Auto-generated VAK/ series tax invoices reviewed by CA)
"""

import time
from typing import Any, Dict, Optional, List, Tuple
from datetime import datetime, timezone, timedelta
import pytest

from app.services.wallet_service import (
    WalletService,
    DEFAULT_SPEND_LIMIT_PAISA,
    CREDIT_ROLLOVER_DAYS,
)
from app.services.billing_lifecycle_service import (
    SubscriptionChargeService,
    FailedPaymentFlowService,
    InvoiceDeliveryService,
    MAX_PAYMENT_RETRIES,
    PAYMENT_RETRY_INTERVAL_HOURS,
    SUBSCRIPTION_GRACE_PERIOD_DAYS,
    SUBSCRIPTION_ADMIN_HOLD_DAYS,
)
from app.services.invoice_vault_service import InvoiceVaultService
from app.services.gst_calculator import GSTCalculator, DEFAULT_SAC_CODE


from unittest.mock import MagicMock
import uuid


class MockQueryBuilder:
    def __init__(self, table_data):
        self.table_data = table_data
        self.filters = []
        self._action = "select"
        self._update_payload = None
        self._insert_payload = None
        self._like_filter = None
        self._order_col = None
        self._order_desc = False
        self._limit_n = None

    def select(self, *args, **kwargs):
        self._action = "select"
        return self

    def eq(self, col, val):
        self.filters.append((col, "eq", val))
        return self

    def gt(self, col, val):
        self.filters.append((col, "gt", val))
        return self

    def lte(self, col, val):
        self.filters.append((col, "lte", val))
        return self

    def like(self, col, pattern):
        self._like_filter = (col, pattern.replace("%", ""))
        return self

    def order(self, col, desc=False):
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    def range(self, start, end):
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
                match = True
                for col, op, val in self.filters:
                    if op == "eq" and row.get(col) != val:
                        match = False
                        break
                if match:
                    row.update(self._update_payload)
                    matching.append(dict(row))
            return MagicMock(data=matching)

        else:  # select
            results = []
            for row in self.table_data:
                match = True
                for col, op, val in self.filters:
                    row_val = row.get(col)
                    if op == "eq" and row_val != val:
                        match = False
                        break
                    elif op == "gt" and not (row_val is not None and row_val > val):
                        match = False
                        break
                    elif op == "lte" and not (row_val is not None and str(row_val) <= str(val)):
                        match = False
                        break
                if match and self._like_filter:
                    col, pat = self._like_filter
                    val = str(row.get(col, ""))
                    if not val.startswith(pat):
                        match = False
                if match:
                    results.append(dict(row))

            if self._order_col:
                results.sort(
                    key=lambda x: str(x.get(self._order_col) or ""),
                    reverse=self._order_desc,
                )
            if self._limit_n:
                results = results[:self._limit_n]

            return MagicMock(data=results)


class MockSupabaseClient:
    def __init__(self):
        self.tables = {
            "wallets": [],
            "wallet_transactions": [],
            "subscriptions": [],
            "invoices": [],
            "invoice_line_items": [],
            "invoice_ca_reviews": [],
            "audit_logs": [],
        }

    def table(self, table_name: str):
        if table_name not in self.tables:
            self.tables[table_name] = []
        return MockQueryBuilder(self.tables[table_name])


@pytest.fixture
def mock_db():
    return MockSupabaseClient()



# =============================================================================
# Decision B1: Prepaid Wallet Model
# =============================================================================
class TestDecisionB1WalletModel:
    def test_prepaid_wallet_ledger_and_balance(self, mock_db):
        service = WalletService(supabase_client=mock_db)
        org_id = "org_test_b1"
        
        # Initial provisioning
        w = service.get_or_create_wallet(org_id)
        assert w["balance_paisa"] == 0
        assert w["currency"] == "INR"
        assert w["spend_limit_paisa"] == DEFAULT_SPEND_LIMIT_PAISA
        
        # Credit wallet via Razorpay topup
        credited = service.credit_wallet(
            organization_id=org_id,
            amount_paisa=50000,  # ₹500
            tx_type="topup",
            reference_id="pay_razorpay_001",
        )
        assert credited["balance_paisa"] == 50000
        
        # Debit usage
        success, status, debited = service.debit_wallet(
            organization_id=org_id,
            amount_paisa=1100,  # 1 minute at ₹11
            tx_type="call_debit",
        )
        assert success is True
        assert debited["balance_paisa"] == 48900
        assert debited["current_spend_paisa"] == 1100

    def test_zero_card_numbers_stored_guarantee(self, mock_db):
        service = WalletService(supabase_client=mock_db)
        org_id = "org_test_zero_card"
        
        service.credit_wallet(
            organization_id=org_id,
            amount_paisa=100000,
            reference_id="pay_123456789",
            description="Recharged via Razorpay UPI",
        )
        
        txs = mock_db.tables["wallet_transactions"]
        for tx in txs:
            # Card PAN and CVV must never be present anywhere in transaction ledger
            desc = str(tx.get("description", ""))
            ref = str(tx.get("reference_id", ""))
            assert "cvv" not in desc.lower()
            assert "card_number" not in tx
            assert len(ref) < 30

    def test_pre_call_protection_and_zero_in_call_disconnect(self, mock_db):
        service = WalletService(supabase_client=mock_db)
        org_id = "org_test_protection"
        
        # In-progress call must NEVER disconnect even if balance is 0
        can_call, status, details = service.check_pre_call_permission(
            organization_id=org_id,
            is_in_progress_call=True,
        )
        assert can_call is True
        assert status == "ACTIVE_CALL_PROTECTED"


# =============================================================================
# Decision B2: Subscription Charge Segregation
# =============================================================================
class TestDecisionB2SubscriptionCharge:
    def test_subscription_creation_manual_and_autodebit_modes(self, mock_db):
        service = SubscriptionChargeService(supabase_client=mock_db)
        org_id = "org_test_b2"
        
        # 1. Manual billing mode
        sub_manual = service.create_or_update_subscription(
            organization_id=org_id,
            plan_tier="professional",
            billing_mode="manual",
            amount_paisa=499900,  # ₹4,999
        )
        assert sub_manual["plan_tier"] == "professional"
        assert sub_manual["billing_mode"] == "manual"
        assert sub_manual["status"] == "active"
        
        # 2. Auto-debit mode with recurring mandate
        sub_auto = service.create_or_update_subscription(
            organization_id=org_id,
            plan_tier="enterprise",
            billing_mode="auto_debit",
            amount_paisa=1499900,
            mandate_id="mandate_rzp_999",
        )
        assert sub_auto["billing_mode"] == "auto_debit"
        assert sub_auto["mandate_id"] == "mandate_rzp_999"

    def test_wallet_isolation_policy(self, mock_db):
        service = SubscriptionChargeService(supabase_client=mock_db)
        res = service.verify_wallet_isolation("org_test_iso", 499900)
        assert res["wallet_isolated"] is True
        assert "exclusive" in res["policy"].lower()


# =============================================================================
# Decision B3: Failed Payment Flow (3 Retries -> 15-Day Grace -> Hold -> Release)
# =============================================================================
class TestDecisionB3FailedPaymentFlow:
    def test_three_retries_over_three_days_schedule(self, mock_db):
        service = FailedPaymentFlowService(supabase_client=mock_db)
        sub_id = "sub_fail_test_01"
        org_id = "org_fail_01"
        
        # Retry 1 (Day 1)
        r1 = service.record_payment_failure(sub_id, org_id, failure_reason="Insufficient balance", current_retry_count=0)
        assert r1["status"] == "payment_retry_1"
        assert r1["retry_count"] == 1
        assert r1["in_grace_period"] is False
        assert "next_retry_scheduled_at" in r1
        
        # Retry 2 (Day 2)
        r2 = service.record_payment_failure(sub_id, org_id, failure_reason="Card expired", current_retry_count=1)
        assert r2["status"] == "payment_retry_2"
        assert r2["retry_count"] == 2
        assert r2["in_grace_period"] is False
        
        # Retry 3 (Day 3) -> 3rd failure enters 15-day Grace Period
        r3 = service.record_payment_failure(sub_id, org_id, failure_reason="Network failure", current_retry_count=2)
        assert r3["status"] == "in_grace"
        assert r3["retry_count"] == 3
        assert r3["in_grace_period"] is True
        assert r3["grace_period_days"] == 15
        assert "grace_period_ends_at" in r3

    def test_grace_period_to_administrative_hold_transition(self, mock_db):
        service = FailedPaymentFlowService(supabase_client=mock_db)
        sub_id = "sub_grace_transition"
        
        # Grace period expired 1 second ago
        past_grace_end = (datetime.now(timezone.utc) - timedelta(seconds=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        res = service.evaluate_grace_and_hold_transitions(
            subscription_id=sub_id,
            current_status="in_grace",
            grace_period_ends_at_iso=past_grace_end,
        )
        assert res["status"] == "administrative_hold"
        assert res["hold_period_days"] == 14

    def test_administrative_hold_to_release_transition(self, mock_db):
        service = FailedPaymentFlowService(supabase_client=mock_db)
        sub_id = "sub_hold_release"
        
        # Hold period expired
        past_hold_end = (datetime.now(timezone.utc) - timedelta(seconds=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        res = service.evaluate_grace_and_hold_transitions(
            subscription_id=sub_id,
            current_status="administrative_hold",
            grace_period_ends_at_iso=None,
            hold_period_ends_at_iso=past_hold_end,
        )
        assert res["status"] == "released"

    def test_successful_payment_clears_retry_and_restores_active(self, mock_db):
        service = FailedPaymentFlowService(supabase_client=mock_db)
        sub_id = "sub_recovery"
        org_id = "org_recovery"
        
        res = service.record_payment_success(sub_id, org_id, payment_reference_id="pay_recovered_999")
        assert res["status"] == "active"
        assert res["payment_reference_id"] == "pay_recovered_999"


# =============================================================================
# Decision B4: Invoice Delivery (Email + WhatsApp India + Permanent Vault)
# =============================================================================
class TestDecisionB4InvoiceDelivery:
    def test_multi_channel_delivery_email_and_whatsapp_india(self, mock_db):
        # Seed an invoice in mock_db
        invoice_record = {
            "id": "inv_deliv_001",
            "invoice_number": "VAK/26-27/00101",
            "organization_id": "org_deliv",
            "grand_total_paisa": 118000,  # ₹1,180
            "fiscal_year": "2026-2027",
            "status": "paid",
            "customer_billing_address": {"email": "customer@example.com"},
        }
        mock_db.tables["invoices"].append(invoice_record)
        
        service = InvoiceDeliveryService(supabase_client=mock_db)
        
        # Deliver to Indian phone number (+91)
        res = service.deliver_invoice(
            invoice_id="inv_deliv_001",
            organization_id="org_deliv",
            recipient_email="finance@corp.in",
            recipient_phone="+919876543210",
        )
        
        assert res["vault_archived"] is True
        assert "permanent_vault" in res["channels"]
        assert "email" in res["channels"]
        assert "whatsapp_india" in res["channels"]
        assert res["email_status"] == "SENT"
        assert res["whatsapp_status"] == "SENT"
        assert res["whatsapp_recipient"] == "+919876543210"

    def test_whatsapp_delivery_skipped_for_non_india_numbers(self, mock_db):
        invoice_record = {
            "id": "inv_us_001",
            "invoice_number": "VAK/26-27/00102",
            "organization_id": "org_us",
            "grand_total_paisa": 50000,
            "status": "paid",
        }
        mock_db.tables["invoices"].append(invoice_record)
        
        service = InvoiceDeliveryService(supabase_client=mock_db)
        
        # Deliver with US (+1) phone number
        res = service.deliver_invoice(
            invoice_id="inv_us_001",
            organization_id="org_us",
            recipient_email="us_customer@example.com",
            recipient_phone="+14155552671",
        )
        
        assert "email" in res["channels"]
        assert "whatsapp_india" not in res["channels"]
        assert res["whatsapp_status"] == "SKIPPED_NON_INDIA"


# =============================================================================
# Decision B5: Credit Rollover (180 Days per Refund Policy Revision)
# =============================================================================
class TestDecisionB5CreditRollover:
    def test_rollover_constant_matches_revised_refund_policy(self):
        assert CREDIT_ROLLOVER_DAYS == 180, "Credit rollover must be strictly 180 days per revised refund policy"

    def test_credit_wallet_stamps_180_day_expiry(self, mock_db):
        service = WalletService(supabase_client=mock_db)
        org_id = "org_rollover_test"
        
        w = service.credit_wallet(
            organization_id=org_id,
            amount_paisa=250000,
            reference_id="topup_180d",
        )
        
        txs = mock_db.tables["wallet_transactions"]
        assert len(txs) == 1
        tx = txs[0]
        assert "expires_at" in tx
        
        # Verify expires_at is approximately 180 days from now
        expires_at_str = tx["expires_at"]
        exp_time = time.mktime(time.strptime(expires_at_str[:19], "%Y-%m-%dT%H:%M:%S"))
        diff_days = (exp_time - time.time()) / 86400.0
        assert 179.0 <= diff_days <= 181.0

    def test_check_expired_credits_audit(self, mock_db):
        service = WalletService(supabase_client=mock_db)
        org_id = "org_audit_exp"
        
        # Seed an unconsumed credit from 200 days ago
        past_exp = (datetime.now(timezone.utc) - timedelta(days=20)).strftime("%Y-%m-%dT%H:%M:%SZ")
        mock_db.tables["wallet_transactions"].append({
            "organization_id": org_id,
            "amount_paisa": 100000,
            "type": "topup",
            "expires_at": past_exp,
        })
        
        res = service.check_expired_credits(org_id)
        assert res["expired_credits_count"] == 1
        assert res["total_expired_paisa"] == 100000
        assert res["total_expired_inr"] == 1000.0
        assert res["rollover_period_days"] == 180


# =============================================================================
# Decision B6: Statutory GST Invoicing (VAK/ Series & CA Review Workflow)
# =============================================================================
class TestDecisionB6GSTInvoicing:
    def test_vak_series_numbering_ceiling_rule_46(self, mock_db):
        service = InvoiceVaultService(supabase_client=mock_db)
        fy_full, fy_short = service.get_current_fiscal_year()
        inv_no = service.get_next_invoice_number(fy_short, prefix="VAK")
        
        assert inv_no.startswith("VAK/")
        assert len(inv_no) <= 16, f"Invoice number '{inv_no}' must not exceed 16 characters per Rule 46(b)"

    def test_gst_sac_code_and_statutory_split(self):
        breakdown = GSTCalculator.calculate_gst_breakdown(
            amount_paisa=118000,
            supplier_state_code="07",  # Delhi
            customer_state_code="07",  # Delhi (Intra-state)
            is_inclusive=True,
            hsn_sac=DEFAULT_SAC_CODE,
        )
        assert DEFAULT_SAC_CODE in ("998311", "998413")
        assert breakdown["is_intra_state"] is True
        assert breakdown["cgst_amount_paisa"] == breakdown["sgst_amount_paisa"]
        assert breakdown["igst_amount_paisa"] == 0
        assert breakdown["grand_total_paisa"] == 118000

    def test_ca_review_workflow_and_checksum(self, mock_db):
        invoice_record = {
            "id": "inv_ca_test",
            "invoice_number": "VAK/26-27/00099",
            "organization_id": "org_ca",
            "grand_total_paisa": 59000,
            "ca_review_status": "pending",
        }
        mock_db.tables["invoices"].append(invoice_record)
        
        service = InvoiceVaultService(supabase_client=mock_db)
        rev = service.submit_ca_review(
            invoice_id="inv_ca_test",
            reviewer_id="ca_usr_007",
            ca_membership_no="ICAI-123456",
            ca_name="Rajesh Sharma, FCA",
            action="approved",
            notes="Statutory verification of SAC 998413 and CGST/SGST ledger complete.",
        )
        
        assert rev["ca_review_status"] == "approved"
        assert len(rev["review"]["checksum"]) == 64  # SHA-256 length
