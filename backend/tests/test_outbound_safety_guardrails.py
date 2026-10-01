"""
Outbound Safety Guardrails Test Suite (Phase 3)
==============================================
Tests statutory compliance and safety rules for all outbound communications:
1. Campaign purpose classification.
2. Hard floor calling hours (09:00 - 21:00 in contact's local timezone).
3. Clamping of owner hours to the hard floor.
4. Specific requested callback exception with logged timestamp.
5. Per-contact consent flag and source validation on spreadsheet import.
6. Internal DND registry scrubbing and national DND hook.
7. WhatsApp proactive messaging guard (opt-in and approved template).
8. Pre-send campaign audit reporting breakdown.

LEGAL REFERENCES:
[CONFIRM WITH A LAWYER]
- TRAI TCCCPR 2018: https://trai.gov.in/telecom-commercial-communication-customer-preference-regulations-2018
- TRAI DND Portal: https://trai.gov.in/consumer-info/telecom/dnd
- FCC TCPA 47 CFR § 64.1200: https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200
"""

import pytest
import unittest
from datetime import datetime, time, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock

from app.services.outbound_safety_guardrails import (
    classify_campaign_purpose,
    infer_contact_timezone,
    get_current_time_in_timezone,
    is_allowed_calling_time,
    validate_contact_consent,
    check_internal_dnd,
    check_national_dnd_registry,
    validate_whatsapp_outbound,
    generate_pre_send_campaign_report,
    HARD_FLOOR_START,
    HARD_FLOOR_END,
    APPROVED_WHATSAPP_TEMPLATES,
)


class TestOutboundSafetyGuardrails(unittest.IsolatedAsyncioTestCase):

    def test_campaign_purpose_classification(self):
        """Verify purpose classification defaults safely to promotional."""
        self.assertEqual(classify_campaign_purpose("promotional"), "promotional")
        self.assertEqual(classify_campaign_purpose("service"), "service")
        self.assertEqual(classify_campaign_purpose("transactional"), "transactional")
        
        # Inferred from campaign name
        self.assertEqual(classify_campaign_purpose(None, "Doctor Appointment Reminder"), "service")
        self.assertEqual(classify_campaign_purpose(None, "OTP Verification System"), "transactional")
        self.assertEqual(classify_campaign_purpose(None, "Diwali Special Discount Offer"), "promotional")
        self.assertEqual(classify_campaign_purpose(None, "Cold Lead Outreach"), "promotional")

    def test_contact_timezone_inference(self):
        """Verify timezone inference from phone prefixes and explicit configurations."""
        self.assertEqual(infer_contact_timezone("+919876543210"), "Asia/Kolkata")
        self.assertEqual(infer_contact_timezone("9876543210"), "Asia/Kolkata")  # 10-digit Indian mobile
        self.assertEqual(infer_contact_timezone("+442071838750"), "Europe/London")
        self.assertEqual(infer_contact_timezone("+4915123456789"), "Europe/Berlin")
        self.assertEqual(infer_contact_timezone("+14155552671"), "America/New_York")
        # Explicit override
        self.assertEqual(infer_contact_timezone("+919876543210", "America/Los_Angeles"), "America/Los_Angeles")

    def test_hard_floor_calling_hours_promotional_allowed(self):
        """Promotional call at 14:00 (within 09:00 - 21:00) is allowed."""
        # 14:00 IST is 08:30 UTC
        mock_utc = datetime(2026, 10, 1, 8, 30, tzinfo=timezone.utc)
        is_allowed, msg, meta = is_allowed_calling_time(
            contact_phone="+919876543210",
            campaign_purpose="promotional",
            owner_start_str="10:00",
            owner_end_str="18:00",
            current_utc_dt=mock_utc
        )
        self.assertTrue(is_allowed, f"Expected allowed, got: {msg}")
        self.assertEqual(meta["local_time"], "14:00:00")

    def test_hard_floor_calling_hours_promotional_blocked_early_morning(self):
        """Promotional call at 07:30 IST is BLOCKED by hard floor (before 09:00)."""
        # 07:30 IST is 02:00 UTC
        mock_utc = datetime(2026, 10, 1, 2, 0, tzinfo=timezone.utc)
        is_allowed, msg, meta = is_allowed_calling_time(
            contact_phone="+919876543210",
            campaign_purpose="promotional",
            owner_start_str="07:00",  # Owner attempts early morning start
            owner_end_str="20:00",
            current_utc_dt=mock_utc
        )
        self.assertFalse(is_allowed)
        self.assertIn("BLOCKED BY HARD FLOOR", msg)
        self.assertEqual(meta["local_time"], "07:30:00")

    def test_hard_floor_calling_hours_promotional_blocked_late_night(self):
        """Promotional call at 21:30 IST is BLOCKED by hard floor (after 21:00)."""
        # 21:30 IST is 16:00 UTC
        mock_utc = datetime(2026, 10, 1, 16, 0, tzinfo=timezone.utc)
        is_allowed, msg, meta = is_allowed_calling_time(
            contact_phone="+919876543210",
            campaign_purpose="promotional",
            owner_start_str="09:00",
            owner_end_str="23:00",  # Owner attempts late night calling
            current_utc_dt=mock_utc
        )
        self.assertFalse(is_allowed)
        self.assertIn("BLOCKED BY HARD FLOOR", msg)
        self.assertEqual(meta["local_time"], "21:30:00")

    def test_hard_floor_owner_hours_cannot_widen_past_statutory_bounds(self):
        """Owner settings 06:00 - 23:00 are clamped strictly to 09:00 - 21:00."""
        # 08:30 IST (after owner start 06:00, but before hard floor 09:00)
        mock_utc = datetime(2026, 10, 1, 3, 0, tzinfo=timezone.utc)
        is_allowed, msg, meta = is_allowed_calling_time(
            contact_phone="+919876543210",
            campaign_purpose="promotional",
            owner_start_str="06:00",
            owner_end_str="23:00",
            current_utc_dt=mock_utc
        )
        self.assertFalse(is_allowed)
        self.assertIn("BLOCKED BY HARD FLOOR", msg)

    def test_requested_callback_permitted_outside_calling_hours(self):
        """
        Caller explicitly requested callback at 22:00: permitted outside 09:00-21:00
        when logged with requested timestamp. [CONFIRM WITH A LAWYER: TRAI TCCCPR 2018 Reg 12].
        """
        mock_utc = datetime(2026, 10, 1, 16, 30, tzinfo=timezone.utc) # 22:00 IST
        req_time = datetime(2026, 10, 1, 22, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

        is_allowed, msg, meta = is_allowed_calling_time(
            contact_phone="+919876543210",
            campaign_purpose="promotional",
            is_requested_callback=True,
            requested_callback_time=req_time,
            current_utc_dt=mock_utc
        )
        self.assertTrue(is_allowed)
        self.assertIn("Requested callback permitted", msg)
        self.assertIn("CONFIRM WITH A LAWYER", msg)

    def test_service_transactional_campaigns_exempt_from_telemarketing_hours(self):
        """Service/transactional alerts (e.g. OTP, security) permitted at any time."""
        mock_utc = datetime(2026, 10, 1, 2, 0, tzinfo=timezone.utc) # 07:30 IST
        is_allowed, msg, _ = is_allowed_calling_time(
            contact_phone="+919876543210",
            campaign_purpose="transactional",
            current_utc_dt=mock_utc
        )
        self.assertTrue(is_allowed)
        self.assertIn("permitted", msg)

    def test_contact_consent_validation_valid(self):
        """Valid row with explicit affirmative consent and source passes."""
        valid_row = {
            "name": "Amit Sharma",
            "phone": "+919876543210",
            "consent": "yes",
            "consent_source": "website_quote_form"
        }
        is_valid, source, reason = validate_contact_consent(valid_row)
        self.assertTrue(is_valid)
        self.assertEqual(source, "website_quote_form")
        self.assertIsNone(reason)

    def test_contact_consent_validation_missing_consent_flag(self):
        """Row missing consent column is rejected."""
        bad_row = {
            "name": "Amit Sharma",
            "phone": "+919876543210",
            "consent_source": "website_quote_form"
        }
        is_valid, source, reason = validate_contact_consent(bad_row)
        self.assertFalse(is_valid)
        self.assertIn("Missing mandatory 'consent' column", reason)

    def test_contact_consent_validation_missing_consent_source(self):
        """Row with consent=true but missing source is rejected."""
        bad_row = {
            "name": "Amit Sharma",
            "phone": "+919876543210",
            "consent": "true",
            "consent_source": ""
        }
        is_valid, source, reason = validate_contact_consent(bad_row)
        self.assertFalse(is_valid)
        self.assertIn("Missing mandatory 'consent_source'", reason)

    def test_contact_consent_validation_negative_consent(self):
        """Row with consent=false or opt_out is rejected."""
        bad_row = {
            "name": "Amit Sharma",
            "phone": "+919876543210",
            "consent": "false",
            "consent_source": "lead_broker"
        }
        is_valid, source, reason = validate_contact_consent(bad_row)
        self.assertFalse(is_valid)
        self.assertIn("must be affirmative", reason)

    async def test_internal_dnd_scrubbing(self):
        """Phone present in dnd_registry table is detected as DND."""
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_in = MagicMock()
        mock_limit = MagicMock()

        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.in_.return_value = mock_in
        mock_in.limit.return_value = mock_limit
        # Return DND match
        mock_limit.execute.return_value = MagicMock(data=[{"phone_number": "+919876543210"}])

        is_dnd = await check_internal_dnd("+919876543210", mock_supabase)
        self.assertTrue(is_dnd)

    def test_national_dnd_registry_hook_and_trai_citations(self):
        """National DND registry hook provides official TRAI primary citations."""
        res = check_national_dnd_registry("+919876543210", country_code="IN")
        self.assertEqual(res["phone_number"], "+919876543210")
        self.assertEqual(res["country"], "IN")
        self.assertIn("trai.gov.in", res["primary_law_reference"])
        self.assertIn("CONFIRM WITH A LAWYER", res["legal_notice"])

    def test_whatsapp_proactive_requires_opt_in(self):
        """Proactive WhatsApp message fails without recorded opt-in."""
        is_valid, reason = validate_whatsapp_outbound(
            phone_number="+919876543210",
            template_name="service_appointment_reminder",
            whatsapp_opt_in=False,
            is_proactive=True
        )
        self.assertFalse(is_valid)
        self.assertIn("requires recorded user opt-in", reason)

    def test_whatsapp_proactive_requires_approved_template(self):
        """Proactive WhatsApp message fails with arbitrary unapproved template."""
        is_valid, reason = validate_whatsapp_outbound(
            phone_number="+919876543210",
            template_name="arbitrary_unapproved_marketing_blast",
            whatsapp_opt_in=True,
            is_proactive=True
        )
        self.assertFalse(is_valid)
        self.assertIn("requires an approved template", reason)

    def test_whatsapp_proactive_with_approved_template_succeeds(self):
        """Proactive WhatsApp message with recorded opt-in and approved template succeeds."""
        is_valid, reason = validate_whatsapp_outbound(
            phone_number="+919876543210",
            template_name="service_appointment_reminder",
            whatsapp_opt_in=True,
            is_proactive=True
        )
        self.assertTrue(is_valid)
        self.assertIn("validated successfully", reason)

    async def test_generate_pre_send_campaign_report(self):
        """Pre-send audit report calculates accurate pass/fail counts across all checks."""
        mock_campaign = {
            "id": "camp-123",
            "name": "Solar Offer Campaign",
            "purpose": "promotional",
            "calling_hours_start": "10:00",
            "calling_hours_end": "18:00",
            "timezone": "Asia/Kolkata"
        }

        # 14:00 IST (valid daytime)
        mock_utc = datetime(2026, 10, 1, 8, 30, tzinfo=timezone.utc)

        mock_contacts = [
            # 1. Valid compliant contact
            {
                "id": "c1",
                "phone": "+919876543211",
                "consent_flag": True,
                "consent_source": "website_form"
            },
            # 2. Missing consent contact
            {
                "id": "c2",
                "phone": "+919876543212",
                "consent_flag": False,
                "consent_source": None
            },
            # 3. Invalid phone format
            {
                "id": "c3",
                "phone": "123",
                "consent_flag": True,
                "consent_source": "website_form"
            }
        ]

        report = await generate_pre_send_campaign_report(
            campaign=mock_campaign,
            contacts=mock_contacts,
            supabase_client=None,
            current_utc_dt=mock_utc
        )

        self.assertEqual(report["total_contacts"], 3)
        self.assertEqual(report["passed_count"], 1)
        self.assertEqual(report["failed_count"], 2)
        self.assertEqual(report["breakdown"]["passed"], 1)
        self.assertEqual(report["breakdown"]["failed_missing_consent"], 1)
        self.assertEqual(report["breakdown"]["failed_invalid_phone"], 1)
        self.assertIn("CONFIRM WITH A LAWYER", report["legal_notice"])


if __name__ == "__main__":
    unittest.main()
