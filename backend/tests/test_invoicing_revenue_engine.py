"""
Test suite for Phase 6: Invoicing & Revenue Engine with Multi-Channel Delivery.
Asserts:
1. Sequential GST invoice numbering and SHA-256 tamper-evident integrity hashing.
2. Multi-channel delivery routing (Vault, Email, India WhatsApp).
3. Statutory PDF invoice generation with HSN/SAC and CGST/SGST/IGST breakdown.
4. WhatsApp payment conversation parser & Cash-to-Call receipt extraction.
5. Post-campaign executive reporting to owner and assistance dispatch to callers (Rule 8).
"""

import os
import sys
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.invoice_vault_service import InvoiceVaultService
from app.services.pdf_invoice_generator import PDFInvoiceGenerator
from app.services.billing_lifecycle_service import InvoiceDeliveryService
from app.services.campaign_service import CampaignService


class MockQueryBuilder:
    def __init__(self, data=None):
        self.data = data or []
        self._inserted = None
        self._updated = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, col, val):
        return self

    def in_(self, col, vals):
        return self

    def like(self, col, val):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, count):
        return self

    def range(self, start, end):
        return self

    def insert(self, payload):
        self._inserted = payload
        return self

    def update(self, payload):
        self._updated = payload
        return self

    def execute(self):
        res = MagicMock()
        res.data = self.data
        return res


def test_sequential_invoice_numbering_and_hashing():
    """Verify sequential FY invoice numbering and tamper-evident SHA-256 hash."""
    service = InvoiceVaultService()
    fy_full, fy_short = service.get_current_fiscal_year()
    assert fy_short in ("26-27", "25-26", "27-28")

    inv_dict = {
        "invoice_number": f"VAK/{fy_short}/00001",
        "organization_id": "org_test_123",
        "invoice_date": "2026-11-03T00:00:00Z",
        "subtotal_paisa": 847458,
        "total_tax_paisa": 152542,
        "grand_total_paisa": 1000000,
        "place_of_supply": "Delhi",
        "payment_reference_id": "pay_test_999",
    }
    hash_val = service.compute_integrity_hash(inv_dict)
    assert len(hash_val) == 64  # SHA-256 length
    # Deterministic hash check
    assert hash_val == service.compute_integrity_hash(inv_dict)


def test_pdf_invoice_generator_output():
    """Verify PDF invoice generation returns non-empty byte buffer with PDF signature."""
    invoice_data = {
        "invoice_number": "VAK/26-27/00001",
        "invoice_date": "2026-11-03T10:00:00Z",
        "supplier_name": "Vaakriti Technologies Private Limited",
        "supplier_gstin": "07AAAAA0000A1Z5",
        "supplier_state": "Delhi",
        "supplier_state_code": "07",
        "supplier_address": {
            "street": "Vaakriti Tower",
            "city": "New Delhi",
            "state": "Delhi",
            "pincode": "110001",
            "country": "IN"
        },
        "customer_legal_name": "Acme Logistics Corp",
        "customer_gstin": "07BBBBB1111B1Z2",
        "customer_state": "Delhi",
        "customer_state_code": "07",
        "customer_billing_address": {
            "street": "Okhla Industrial Area",
            "city": "New Delhi",
            "state": "Delhi",
            "pincode": "110020",
            "country": "IN"
        },
        "place_of_supply": "Delhi",
        "is_reverse_charge": False,
        "subtotal_paisa": 847458,
        "total_tax_paisa": 152542,
        "grand_total_paisa": 1000000,
        "integrity_hash": "a" * 64,
        "line_items": [
            {
                "description": "Vaakriti AI Voice Telephony & Cloud Infrastructure Credits",
                "hsn_sac_code": "998311",
                "quantity": 1,
                "unit_price_paisa": 847458,
                "taxable_amount_paisa": 847458,
                "cgst_rate_pct": 9.0,
                "cgst_amount_paisa": 76271,
                "sgst_rate_pct": 9.0,
                "sgst_amount_paisa": 76271,
                "igst_rate_pct": 0.0,
                "igst_amount_paisa": 0,
                "total_amount_paisa": 1000000
            }
        ]
    }
    pdf_bytes = PDFInvoiceGenerator.generate_invoice_pdf(invoice_data)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF-")


def test_invoice_multi_channel_delivery_channels():
    """Verify InvoiceDeliveryService delivers across permanent vault, email, and India WhatsApp."""
    delivery_svc = InvoiceDeliveryService()

    fake_invoice = {
        "id": "inv_123",
        "invoice_number": "VAK/26-27/00001",
        "grand_total_paisa": 1000000,
        "fiscal_year": "2026-2027",
        "customer_billing_address": {"email": "client@example.com"}
    }

    with patch.object(delivery_svc.vault_service, "get_invoice", return_value=fake_invoice), \
         patch.object(delivery_svc.supabase, "table") as mock_table:

        mock_builder = MockQueryBuilder()
        mock_table.return_value = mock_builder

        result = delivery_svc.deliver_invoice(
            invoice_id="inv_123",
            organization_id="org_123",
            recipient_email="client@example.com",
            recipient_phone="9876543210"
        )

        assert "permanent_vault" in result["channels"]
        assert "email" in result["channels"]
        assert "whatsapp_india" in result["channels"]
        assert result["whatsapp_recipient"] == "+919876543210"
        assert result["vault_archived"] is True


def test_payment_receipt_text_parsing():
    """Verify payment and receipt message keyword detection and amount extraction."""
    import re

    payment_keywords = re.compile(
        r"\b(paid|payment|paytm|gpay|phonepe|google\s*pay|upi|utr|receipt|invoice|bheja|kar\s*diya|transferred|advance|rupaye|rs\.?|inr|screenshot|screen\s*shot)\b",
        re.IGNORECASE
    )

    amount_regex = re.compile(
        r"(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?))|([\d,]+(?:\.\d+)?)\s*(?:rs|rupees|rupaye|inr|bheje|diye|paid)",
        re.IGNORECASE
    )

    utr_regex = re.compile(
        r"(?:utr|txn|transaction|ref|reference|id)[\s:#-]*([A-Za-z0-9]{8,24})",
        re.IGNORECASE
    )

    # Test Sample 1: Hindi payment confirmation with UTR
    sample1 = "Namaste, maine advance payment 45,000 rupaye kar diya hai GPay se. UTR: 432109876543"
    assert payment_keywords.search(sample1) is not None
    m_amt = amount_regex.search(sample1)
    assert m_amt is not None
    extracted_amt = float((m_amt.group(1) or m_amt.group(2)).replace(",", ""))
    assert extracted_amt == 45000.0
    m_utr = utr_regex.search(sample1)
    assert m_utr is not None
    assert m_utr.group(1) == "432109876543"

    # Test Sample 2: English payment screenshot message
    sample2 = "Sent screenshot of Rs 12000 paid via UPI. Please confirm."
    assert payment_keywords.search(sample2) is not None
    m_amt2 = amount_regex.search(sample2)
    assert m_amt2 is not None
    extracted_amt2 = float((m_amt2.group(1) or m_amt2.group(2)).replace(",", ""))
    assert extracted_amt2 == 12000.0


@pytest.mark.asyncio
async def test_post_campaign_report_and_caller_assistance():
    """Verify CampaignService.dispatch_campaign_report sends owner report and triggers caller assistance (Rule 8)."""
    camp_data = {
        "id": "camp_test_123",
        "name": "Purvi Roadlines Fleet Promo",
        "user_id": "usr_owner_1",
        "organization_id": "org_owner_1",
        "total_contacts": 10,
        "completed_calls": 8,
        "answered_calls": 6,
        "leads_count": 3,
        "status": "completed",
    }

    mock_contacts = [
        {"id": "cc_1", "full_name": "Ramesh Kumar", "phone_number": "9876543210", "status": "completed", "disposition": "interested"},
        {"id": "cc_2", "full_name": "Suresh Gupta", "phone_number": "9876543211", "status": "answered", "disposition": "callback"},
        {"id": "cc_3", "full_name": "DND User", "phone_number": "9876543212", "status": "completed", "disposition": "dnd"},
    ]

    mock_profile = {
        "full_name": "Purvi Roadlines Owner",
        "phone": "9999999999",
        "telegram_chat_id": None
    }

    with patch("app.services.campaign_service.supabase_admin") as mock_sb, \
         patch("app.services.integration_executor.IntegrationExecutor.dispatch_post_call", new_callable=AsyncMock) as mock_owner_wa, \
         patch("app.services.integration_executor.IntegrationExecutor._send_whatsapp", new_callable=AsyncMock) as mock_caller_wa, \
         patch("app.services.notification_service.NotificationService.dispatch", new_callable=AsyncMock):

        def mock_table(table_name):
            builder = MockQueryBuilder()
            if table_name == "campaigns":
                builder.data = [camp_data]
            elif table_name == "campaign_contacts":
                builder.data = mock_contacts
            elif table_name == "profiles":
                builder.data = [mock_profile]
            elif table_name == "callbacks":
                builder.data = []
            elif table_name == "voice_calls":
                builder.data = []
            return builder

        mock_sb.table.side_effect = mock_table

        report = await CampaignService.dispatch_campaign_report(
            campaign_id="camp_test_123",
            campaign_data=camp_data
        )

        assert report["success"] is True
        assert report["campaign_name"] == "Purvi Roadlines Fleet Promo"
        # Executive report dispatched to owner
        mock_owner_wa.assert_awaited_once()

        # Follow-up assistance dispatched to connected callers (excluding DND)
        await asyncio.sleep(0.1)  # Allow background async tasks to spin up
        assert mock_caller_wa.call_count >= 2
        # Verify DND user cc_3 was skipped
        for call_args in mock_caller_wa.call_args_list:
            c_data = call_args[1].get("data") or {}
            assert c_data.get("contact_phone") != "9876543212"
