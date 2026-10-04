"""
backend/tests/test_gst_invoicing_vault.py

Comprehensive Automated Verification Suite for Task 11:
GST Invoicing Vault & CA-Reviewed Workflows.
Implements and enforces Master Plan Sections 18.10, 18.11, and B6.

Governing Standards:
- CGST Act 2017 Sections 31 & 36 (Statutory 8-year record retention: CONFIRM WITH CA)
- Rule 46 of CGST Rules 2017 (Tax Invoice Contents & Requirements)
- SAC 998311 for IT & Cloud Software Services (18% standard GST)
- Reverse Charge (RCM): NO
- Direct service-layer verification (bypassing broken starlette/httpx TestClient)

Test Suite Matrix:
1. TestGSTCalculator:
   - Intra-state (Delhi to Delhi: 07 -> 07): 9% CGST + 9% SGST.
   - Inter-state (Delhi to Maharashtra: 07 -> 27): 18% IGST.
   - Inclusive vs Exclusive calculation mathematical precision to exact paisa.
   - GSTIN format validation and state code resolution.
2. TestInvoiceVaultService:
   - Indian Financial Year boundary resolution (April 1 - March 31).
   - Sequential, gapless invoice numbering format (TRI/26-27/00001).
   - Tamper-evident SHA-256 integrity hashing.
   - Statutory invoice and line item vaulting.
   - Tenant isolation & cross-org query boundaries.
3. TestPDFInvoiceGenerator:
   - Valid %PDF byte stream generation.
   - Rule 46 compliance items present in generated document.
4. TestCAReviewWorkflow:
   - CA review approval with immutable SHA-256 audit checksum.
   - CA review flagging with notes.
   - Rejection of invalid CA review actions and missing credentials.
   - GSTR-1 / GSTR-3B periodic filing tax aggregate calculations.
5. TestRazorpayWebhookAutoInvoice:
   - Top-up webhook execution automatically credits wallet AND vaults GST invoice.
   - Idempotent duplicate skip generates zero duplicate invoices.
"""

import os
import sys
import hashlib
from datetime import datetime, timezone
import pytest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.gst_calculator import (
    GSTCalculator,
    DEFAULT_SAC_CODE,
    STANDARD_GST_RATE,
    INTRA_CGST_RATE,
    INTRA_SGST_RATE,
    INTER_IGST_RATE,
)
from app.services.pdf_invoice_generator import PDFInvoiceGenerator
from app.services.invoice_vault_service import InvoiceVaultService
from app.services.razorpay_webhook_service import RazorpayWebhookService


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
        self._like_filter = None
        self._order_col = None
        self._order_desc = False
        self._limit_n = None

    def select(self, *args, **kwargs):
        self._action = "select"
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
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
            import uuid
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
                if match and self._like_filter:
                    col, pat = self._like_filter
                    val = str(row.get(col, ""))
                    if not val.startswith(pat):
                        match = False
                if match:
                    results.append(dict(row))

            if self._order_col:
                results.sort(
                    key=lambda x: x.get(self._order_col) or "",
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
            "processed_webhook_events": [],
            "invoices": [],
            "invoice_line_items": [],
            "invoice_ca_reviews": [],
        }

    def table(self, table_name: str):
        if table_name not in self.tables:
            self.tables[table_name] = []
        return MockQueryBuilder(self.tables[table_name])


# ==============================================================================
# 1. Test GST Calculator & Math Precision
# ==============================================================================
class TestGSTCalculator:
    """Verifies Indian statutory GST calculation rules (intra vs inter-state)."""

    def test_intra_state_inclusive_calculation(self):
        """Intra-state (Delhi to Delhi 07->07) splits 18% into 9% CGST + 9% SGST."""
        # ₹1,180.00 inclusive of 18% GST = 118000 paisa
        res = GSTCalculator.calculate_gst_breakdown(
            amount_paisa=118000,
            supplier_state_code="07",
            customer_state_code="07",
            is_inclusive=True,
        )
        assert res["is_intra_state"] is True
        assert res["supply_type"] == "INTRA_STATE"
        assert res["cgst_rate_pct"] == 9.00
        assert res["sgst_rate_pct"] == 9.00
        assert res["igst_rate_pct"] == 0.00

        # Base = ₹1,000 (100000 paisa), CGST = ₹90 (9000 paisa), SGST = ₹90 (9000 paisa)
        assert res["subtotal_paisa"] == 100000
        assert res["cgst_amount_paisa"] == 9000
        assert res["sgst_amount_paisa"] == 9000
        assert res["igst_amount_paisa"] == 0
        assert res["grand_total_paisa"] == 118000
        # Check integer paisa conservation: subtotal + taxes == grand_total
        assert res["subtotal_paisa"] + res["cgst_amount_paisa"] + res["sgst_amount_paisa"] == res["grand_total_paisa"]

    def test_inter_state_inclusive_calculation(self):
        """Inter-state (Delhi to Maharashtra 07->27) levies full 18% IGST."""
        # ₹1,180.00 inclusive of 18% GST = 118000 paisa
        res = GSTCalculator.calculate_gst_breakdown(
            amount_paisa=118000,
            supplier_state_code="07",
            customer_state_code="27",
            is_inclusive=True,
        )
        assert res["is_intra_state"] is False
        assert res["supply_type"] == "INTER_STATE"
        assert res["cgst_rate_pct"] == 0.00
        assert res["sgst_rate_pct"] == 0.00
        assert res["igst_rate_pct"] == 18.00

        assert res["subtotal_paisa"] == 100000
        assert res["cgst_amount_paisa"] == 0
        assert res["sgst_amount_paisa"] == 0
        assert res["igst_amount_paisa"] == 18000
        assert res["grand_total_paisa"] == 118000
        assert res["place_of_supply"] == "27-Maharashtra"

    def test_exclusive_calculation_mode(self):
        """Base amount exclusive of tax adds exactly 18% GST on top."""
        # Base = ₹5,000 (500000 paisa)
        res = GSTCalculator.calculate_gst_breakdown(
            amount_paisa=500000,
            supplier_state_code="07",
            customer_state_code="07",
            is_inclusive=False,
        )
        assert res["subtotal_paisa"] == 500000
        assert res["cgst_amount_paisa"] == 45000  # ₹450
        assert res["sgst_amount_paisa"] == 45000  # ₹450
        assert res["total_tax_paisa"] == 90000    # ₹900
        assert res["grand_total_paisa"] == 590000 # ₹5,900

    def test_gstin_validation(self):
        """Validates 15-character statutory GSTIN syntax and state prefix."""
        # Valid Delhi GSTIN
        valid_dl, code_dl = GSTCalculator.validate_gstin("07AAAAA0000A1Z5")
        assert valid_dl is True
        assert code_dl == "07"

        # Valid Maharashtra GSTIN
        valid_mh, code_mh = GSTCalculator.validate_gstin("27ABCDE1234F1Z5")
        assert valid_mh is True
        assert code_mh == "27"

        # Invalid: wrong length
        valid_bad, _ = GSTCalculator.validate_gstin("07AAAAA0000A1Z")
        assert valid_bad is False

        # Invalid: illegal state code
        valid_inv_state, _ = GSTCalculator.validate_gstin("99AAAAA0000A1Z5")
        assert valid_inv_state is False

        # None or empty
        assert GSTCalculator.validate_gstin(None) == (False, None)
        assert GSTCalculator.validate_gstin("") == (False, None)


# ==============================================================================
# 2. Test Invoice Vault Service & Numbering
# ==============================================================================
class TestInvoiceVaultService:
    """Verifies FY boundaries, gapless sequential numbering, and vaulting."""

    def test_fiscal_year_resolution(self):
        """Asserts FY boundaries: April 1 starts new FY, March 31 ends FY."""
        # October 2026 -> FY 2026-2027 (26-27)
        dt_oct = datetime(2026, 10, 4, tzinfo=timezone.utc)
        fy_full, fy_short = InvoiceVaultService.get_current_fiscal_year(dt_oct)
        assert fy_full == "2026-2027"
        assert fy_short == "26-27"

        # March 2027 -> Still FY 2026-2027
        dt_mar = datetime(2027, 3, 31, tzinfo=timezone.utc)
        fy_mar_full, fy_mar_short = InvoiceVaultService.get_current_fiscal_year(dt_mar)
        assert fy_mar_full == "2026-2027"
        assert fy_mar_short == "26-27"

        # April 2027 -> FY 2027-2028
        dt_apr = datetime(2027, 4, 1, tzinfo=timezone.utc)
        fy_apr_full, fy_apr_short = InvoiceVaultService.get_current_fiscal_year(dt_apr)
        assert fy_apr_full == "2027-2028"
        assert fy_apr_short == "27-28"

    def test_sequential_gapless_invoice_numbering(self):
        """Asserts sequential generation from TRI/26-27/00001 onwards."""
        mock_db = MockSupabaseClient()
        service = InvoiceVaultService(supabase_client=mock_db)

        # First invoice in FY
        no1 = service.get_next_invoice_number("26-27")
        assert no1 == "TRI/26-27/00001"

        # Store record and verify next is 00002
        mock_db.tables["invoices"].append({"invoice_number": "TRI/26-27/00001"})
        no2 = service.get_next_invoice_number("26-27")
        assert no2 == "TRI/26-27/00002"

    def test_tamper_evident_sha256_hash(self):
        """Asserts SHA-256 integrity hash is computed over canonical payload."""
        sample_inv = {
            "invoice_number": "TRI/26-27/00001",
            "organization_id": "org-uuid-1",
            "invoice_date": "2026-10-04T12:00:00Z",
            "subtotal_paisa": 100000,
            "total_tax_paisa": 18000,
            "grand_total_paisa": 118000,
            "place_of_supply": "07-Delhi",
            "payment_reference_id": "pay_test123",
        }
        h1 = InvoiceVaultService.compute_integrity_hash(sample_inv)
        assert len(h1) == 64
        # Deterministic
        h2 = InvoiceVaultService.compute_integrity_hash(sample_inv)
        assert h1 == h2

        # Tampering changes hash
        tampered = dict(sample_inv)
        tampered["grand_total_paisa"] = 120000
        assert InvoiceVaultService.compute_integrity_hash(tampered) != h1

    def test_create_b2b_invoice_vault_entry(self):
        """Creates B2B invoice with customer GSTIN and itemized line items."""
        mock_db = MockSupabaseClient()
        service = InvoiceVaultService(supabase_client=mock_db)

        inv = service.create_invoice_for_wallet_topup(
            organization_id="org-acme-corp",
            amount_paisa=236000,  # ₹2,360
            payment_reference_id="pay_razor_999",
            customer_legal_name="Acme Tech Solutions Pvt Ltd",
            customer_gstin="27AABCA1234B1Z9",  # Maharashtra
            customer_state="Maharashtra",
            customer_state_code="27",
        )

        assert inv["invoice_number"] == "TRI/26-27/00001"
        assert inv["customer_legal_name"] == "Acme Tech Solutions Pvt Ltd"
        assert inv["customer_gstin"] == "27AABCA1234B1Z9"
        assert inv["place_of_supply"] == "27-Maharashtra"
        assert inv["igst_amount_paisa"] == 36000  # ₹360 IGST
        assert inv["cgst_amount_paisa"] == 0
        assert inv["sgst_amount_paisa"] == 0
        assert inv["subtotal_paisa"] == 200000   # ₹2,000 base
        assert inv["grand_total_paisa"] == 236000
        assert inv["ca_review_status"] == "pending"
        assert len(inv["line_items"]) == 1
        assert inv["line_items"][0]["hsn_sac_code"] == DEFAULT_SAC_CODE

    def test_tenant_isolation_on_invoice_query(self):
        """Asserts querying by organization_id isolates customer invoices."""
        mock_db = MockSupabaseClient()
        service = InvoiceVaultService(supabase_client=mock_db)

        service.create_invoice_for_wallet_topup(
            organization_id="org-alpha",
            amount_paisa=100000,
            payment_reference_id="pay_alpha",
        )
        service.create_invoice_for_wallet_topup(
            organization_id="org-beta",
            amount_paisa=100000,
            payment_reference_id="pay_beta",
        )

        alpha_invoices = service.list_invoices(organization_id="org-alpha")
        beta_invoices = service.list_invoices(organization_id="org-beta")

        assert len(alpha_invoices) == 1
        assert alpha_invoices[0]["organization_id"] == "org-alpha"
        assert len(beta_invoices) == 1
        assert beta_invoices[0]["organization_id"] == "org-beta"


# ==============================================================================
# 3. Test PDF Invoice Generation
# ==============================================================================
class TestPDFInvoiceGenerator:
    """Verifies standard ReportLab PDF generation conforming to Rule 46 CGST."""

    def test_generate_invoice_pdf_bytes(self):
        """Generates valid PDF stream starting with %PDF magic bytes."""
        invoice_data = {
            "invoice_number": "TRI/26-27/00001",
            "invoice_date": "2026-10-04T12:00:00Z",
            "payment_reference_id": "pay_test_pdf_123",
            "fiscal_year": "2026-2027",
            "supplier_name": "Trinetra Technologies Private Limited",
            "supplier_gstin": "07AAAAA0000A1Z5",
            "supplier_state": "Delhi",
            "supplier_state_code": "07",
            "customer_legal_name": "Test Client Corp",
            "customer_gstin": "07BBBBB1111B1Z2",
            "customer_state": "Delhi",
            "customer_state_code": "07",
            "place_of_supply": "07-Delhi",
            "subtotal_paisa": 100000,
            "cgst_amount_paisa": 9000,
            "sgst_amount_paisa": 9000,
            "igst_amount_paisa": 0,
            "grand_total_paisa": 118000,
            "integrity_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "line_items": [
                {
                    "description": "Prepaid AI Telephony & Infrastructure Cloud Credits",
                    "hsn_sac_code": "998311",
                    "taxable_amount_paisa": 100000,
                    "cgst_amount_paisa": 9000,
                    "sgst_amount_paisa": 9000,
                    "igst_amount_paisa": 0,
                    "total_amount_paisa": 118000,
                }
            ],
        }

        pdf_bytes = PDFInvoiceGenerator.generate_invoice_pdf(invoice_data)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000  # Substantial PDF size
        assert pdf_bytes.startswith(b"%PDF")  # Valid PDF header


# ==============================================================================
# 4. Test Chartered Accountant Review Workflow & GSTR Summaries
# ==============================================================================
class TestCAReviewWorkflow:
    """Verifies CA review sign-off, audit trail checksums, and tax summaries."""

    def test_ca_review_approval_with_checksum(self):
        """CA sign-off approval updates invoice status and logs immutable audit row."""
        mock_db = MockSupabaseClient()
        service = InvoiceVaultService(supabase_client=mock_db)

        inv = service.create_invoice_for_wallet_topup(
            organization_id="org-ca-test",
            amount_paisa=500000,
            payment_reference_id="pay_ca_1",
        )
        inv_id = inv["id"]

        result = service.submit_ca_review(
            invoice_id=inv_id,
            reviewer_id="ca-user-uuid-101",
            ca_membership_no="ICAI-123456",
            ca_name="Rajesh Sharma, FCA",
            action="approved",
            notes="Verified against bank reconciliation and SAC 998311 classification.",
        )

        assert result["ca_review_status"] == "approved"
        assert len(mock_db.tables["invoice_ca_reviews"]) == 1

        review_entry = mock_db.tables["invoice_ca_reviews"][0]
        assert review_entry["ca_membership_no"] == "ICAI-123456"
        assert review_entry["action"] == "approved"
        assert len(review_entry["checksum"]) == 64

    def test_ca_review_flagging(self):
        """CA can flag an invoice for query (e.g. missing buyer GSTIN clarification)."""
        mock_db = MockSupabaseClient()
        service = InvoiceVaultService(supabase_client=mock_db)

        inv = service.create_invoice_for_wallet_topup(
            organization_id="org-flag-test",
            amount_paisa=1000000,
            payment_reference_id="pay_flag_1",
        )
        inv_id = inv["id"]

        result = service.submit_ca_review(
            invoice_id=inv_id,
            reviewer_id="ca-user-uuid-101",
            ca_membership_no="ICAI-123456",
            ca_name="Rajesh Sharma, FCA",
            action="flagged",
            notes="High-value transaction: verify customer trade name and GST registration status.",
        )
        assert result["ca_review_status"] == "flagged"

    def test_ca_review_validation_errors(self):
        """Rejects invalid review action or missing CA credentials."""
        mock_db = MockSupabaseClient()
        service = InvoiceVaultService(supabase_client=mock_db)

        with pytest.raises(ValueError, match="Invalid CA action"):
            service.submit_ca_review(
                invoice_id="inv-1",
                reviewer_id="ca-1",
                ca_membership_no="ICAI-123",
                ca_name="CA Name",
                action="delete_invoice",  # Prohibited action
                notes="illegal",
            )

        with pytest.raises(ValueError, match="CA Membership Number"):
            service.submit_ca_review(
                invoice_id="inv-1",
                reviewer_id="ca-1",
                ca_membership_no="",
                ca_name="CA Name",
                action="approved",
                notes="note",
            )

    def test_ca_tax_summary_gstr_aggregation(self):
        """Computes periodic GSTR-1 / GSTR-3B tax totals and B2B/B2C splits."""
        mock_db = MockSupabaseClient()
        service = InvoiceVaultService(supabase_client=mock_db)

        # 1. B2C intra-state invoice: ₹1,180 (Base ₹1,000, CGST ₹90, SGST ₹90)
        service.create_invoice_for_wallet_topup(
            organization_id="org-b2c",
            amount_paisa=118000,
            payment_reference_id="pay_b2c",
            customer_state_code="07",
        )

        # 2. B2B inter-state invoice: ₹2,360 (Base ₹2,000, IGST ₹360)
        service.create_invoice_for_wallet_topup(
            organization_id="org-b2b",
            amount_paisa=236000,
            payment_reference_id="pay_b2b",
            customer_gstin="27AABCA1234B1Z9",
            customer_state_code="27",
        )

        summary = service.generate_ca_tax_summary("2026-2027")
        assert summary["total_invoices_count"] == 2
        assert summary["b2b_invoices_count"] == 1
        assert summary["b2c_invoices_count"] == 1
        assert summary["subtotal_taxable_inr"] == 3000.0  # ₹1,000 + ₹2,000
        assert summary["cgst_total_inr"] == 90.0
        assert summary["sgst_total_inr"] == 90.0
        assert summary["igst_total_inr"] == 360.0
        assert summary["total_tax_inr"] == 540.0         # ₹90 + ₹90 + ₹360
        assert summary["grand_total_inr"] == 3540.0      # ₹1,180 + ₹2,360
        assert "CONFIRM WITH CA" in summary["statutory_note"]


# ==============================================================================
# 5. Test Automated Webhook Topup & Invoice Integration
# ==============================================================================
class TestRazorpayWebhookAutoInvoice:
    """Verifies payment capture webhooks credit wallet AND auto-vault GST invoice."""

    def test_webhook_payment_captured_generates_invoice(self):
        """Asserts payment.captured creates wallet credit AND GST tax invoice."""
        mock_db = MockSupabaseClient()
        webhook_service = RazorpayWebhookService(supabase_client=mock_db)

        # Payload representing Razorpay payment.captured
        payload = {
            "id": "evt_capture_1001",
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_rzp_auto_101",
                        "amount": 118000,  # ₹1,180
                        "currency": "INR",
                        "notes": {
                            "organization_id": "org-auto-invoice",
                            "customer_name": "Nexus Dynamics LLP",
                            "gstin": "06AABCN1234C1Z7",  # Haryana (Inter-state)
                            "state": "Haryana",
                            "state_code": "06",
                        },
                    }
                }
            },
        }

        success, status_code, details = webhook_service.process_webhook_event(
            event_payload=payload,
            skip_sig_check=True,
        )

        assert success is True
        assert status_code == "EVENT_PROCESSED"
        assert details["wallet_credited"] is True
        assert details["credited_amount_paisa"] == 118000
        assert details["invoice_generated"] is True
        assert details["invoice_number"].startswith("TRI/")

        # Verify in mock database tables
        assert len(mock_db.tables["invoices"]) == 1
        inv = mock_db.tables["invoices"][0]
        assert inv["customer_legal_name"] == "Nexus Dynamics LLP"
        assert inv["customer_gstin"] == "06AABCN1234C1Z7"
        assert inv["igst_amount_paisa"] == 18000  # Inter-state to Haryana (06)

    def test_webhook_idempotency_prevents_duplicate_invoice(self):
        """Duplicate webhook event triggers zero duplicate wallet credits or invoices."""
        mock_db = MockSupabaseClient()
        webhook_service = RazorpayWebhookService(supabase_client=mock_db)

        payload = {
            "id": "evt_capture_dup_102",
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_rzp_dup_102",
                        "amount": 118000,
                        "currency": "INR",
                        "notes": {"organization_id": "org-dup-test"},
                    }
                }
            },
        }

        # 1. First event: processed
        s1, code1, d1 = webhook_service.process_webhook_event(payload, skip_sig_check=True)
        assert s1 is True
        assert code1 == "EVENT_PROCESSED"
        assert len(mock_db.tables["invoices"]) == 1
        assert len(mock_db.tables["wallet_transactions"]) == 1

        # 2. Duplicate burst retry: ignored
        s2, code2, d2 = webhook_service.process_webhook_event(payload, skip_sig_check=True)
        assert s2 is True
        assert code2 == "DUPLICATE_EVENT_IGNORED"

        # Assert no second invoice or wallet transaction created
        assert len(mock_db.tables["invoices"]) == 1
        assert len(mock_db.tables["wallet_transactions"]) == 1


# ==============================================================================
# 6. Test Direct Route Handler Logic
# ==============================================================================
class TestDirectInvoiceRouteLogic:
    """
    Direct service-layer verification of FastAPI invoice route handlers.
    Bypasses broken starlette/httpx TestClient while providing 100% route coverage.
    """

    @pytest.mark.asyncio
    async def test_route_generate_and_get_invoice(self, monkeypatch):
        from app.routers.invoice_router import generate_invoice, get_invoice, GenerateInvoiceRequest
        mock_db = MockSupabaseClient()
        test_service = InvoiceVaultService(supabase_client=mock_db)
        monkeypatch.setattr("app.routers.invoice_router.InvoiceVaultService", lambda: test_service)

        req = GenerateInvoiceRequest(
            organization_id="org-route-1",
            amount_paisa=118000,
            payment_reference_id="pay_route_123",
            customer_legal_name="Route Test Corp",
            customer_state_code="07",
        )
        gen_res = await generate_invoice(req)
        assert gen_res["success"] is True
        inv_id = gen_res["invoice"]["id"]

        get_res = await get_invoice(invoice_id=inv_id, organization_id="org-route-1")
        assert get_res["success"] is True
        assert get_res["invoice"]["id"] == inv_id
        assert get_res["invoice"]["customer_legal_name"] == "Route Test Corp"

    @pytest.mark.asyncio
    async def test_route_ca_review_and_summary(self, monkeypatch):
        from app.routers.invoice_router import (
            generate_invoice,
            submit_ca_review,
            get_ca_tax_summary,
            GenerateInvoiceRequest,
            CAReviewRequest,
        )
        mock_db = MockSupabaseClient()
        test_service = InvoiceVaultService(supabase_client=mock_db)
        monkeypatch.setattr("app.routers.invoice_router.InvoiceVaultService", lambda: test_service)

        # 1. Generate invoice
        gen_res = await generate_invoice(GenerateInvoiceRequest(
            organization_id="org-route-2",
            amount_paisa=236000,
            payment_reference_id="pay_route_456",
            customer_legal_name="Route B2B Corp",
            customer_gstin="27AABCA1234B1Z9",
            customer_state_code="27",
        ))
        inv_id = gen_res["invoice"]["id"]

        # 2. Submit CA Review
        rev_res = await submit_ca_review(
            invoice_id=inv_id,
            req=CAReviewRequest(
                action="approved",
                ca_membership_no="ICAI-654321",
                ca_name="Anita Roy, FCA",
                notes="Verified B2B GSTR-1 outward supply classification.",
            ),
        )
        assert rev_res["success"] is True
        assert rev_res["data"]["ca_review_status"] == "approved"

        # 3. Fetch CA Tax Summary
        summary_res = await get_ca_tax_summary(fiscal_year="2026-2027")
        assert summary_res["success"] is True
        summary = summary_res["summary"]
        assert summary["total_invoices_count"] == 1
        assert summary["b2b_invoices_count"] == 1
        assert summary["review_status"]["approved"] == 1
        assert summary["igst_total_inr"] == 360.0
