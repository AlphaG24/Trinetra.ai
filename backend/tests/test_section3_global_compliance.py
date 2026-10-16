"""
backend/tests/test_section3_global_compliance.py

Comprehensive Automated Verification Suite for Master Plan Section 3: Global Compliance Strategy.
Tests:
- Automatic region-specific rules enforcement based on called party number (+country_code).
- Canonical 5 regions: India (IN), USA (US), EU/UK (EU), Middle East (ME), Southeast Asia (SEA).
- Admin override per customer.
- Regional KYC document restrictions (strict raw Aadhaar prohibition for India).
- Regional DND & Calling hour windows (09:00-21:00 vs 08:00-21:00).
- Regional call recording consent policies (audible disclosure vs 2-party/explicit opt-in).
- Expiry handling: 15d grace + 14d hold across regions (neutral unavailable message, no 90d cooling).
- Data retention rules (statutory billing tax period vs deals 90-180d).
- FastAPI API endpoints verification.
"""

import unittest
from fastapi.testclient import TestClient

from main import app
from app.services.regional_compliance_service import (
    RegionalComplianceService,
    CANONICAL_REGIONS,
    US_TWO_PARTY_CONSENT_STATES
)


class TestSection3GlobalComplianceStrategy(unittest.TestCase):
    """Exhaustive test suite for Section 3 Global Compliance Strategy."""

    def setUp(self):
        self.client = TestClient(app)
        # Clean any test overrides before each test
        RegionalComplianceService.clear_customer_override("test_cust_section3_01")
        RegionalComplianceService.clear_customer_override("test_cust_section3_02")

    def tearDown(self):
        RegionalComplianceService.clear_customer_override("test_cust_section3_01")
        RegionalComplianceService.clear_customer_override("test_cust_section3_02")

    # =========================================================================
    # 1. Automatic Region Resolution by +country_code
    # =========================================================================
    def test_region_resolution_india(self):
        """Resolves Indian numbers (+91) to region 'IN'."""
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+919876543210"), "IN")
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("919876543210"), "IN")
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("9876543210"), "IN")  # 10-digit default

    def test_region_resolution_usa(self):
        """Resolves USA numbers (+1) to region 'US'."""
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+12025550123"), "US")
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("12025550123"), "US")

    def test_region_resolution_eu_uk(self):
        """Resolves EU & UK numbers (+44, +33, +49, +34, +39, +31, +32, +353) to region 'EU'."""
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+442079460958"), "EU")  # UK
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+33123456789"), "EU")   # France
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+4930123456"), "EU")    # Germany
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+35312345678"), "EU")  # Ireland

    def test_region_resolution_middle_east(self):
        """Resolves Middle East numbers (+971, +966, +974, +965) to region 'ME'."""
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+971501234567"), "ME")  # UAE
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+966501234567"), "ME")  # Saudi
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+97433123456"), "ME")   # Qatar

    def test_region_resolution_southeast_asia(self):
        """Resolves Southeast Asia numbers (+65, +62, +60, +63, +66, +84) to region 'SEA'."""
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+6561234567"), "SEA")   # Singapore
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+62812345678"), "SEA")  # Indonesia
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+60123456789"), "SEA")  # Malaysia

    def test_region_resolution_unknown_fallback(self):
        """Unrecognized foreign prefixes gracefully fall back to 'IN' launch market."""
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone("+9999999999"), "IN")
        self.assertEqual(RegionalComplianceService.resolve_region_by_phone(""), "IN")

    # =========================================================================
    # 2. Administrative Override Per Customer
    # =========================================================================
    def test_customer_regional_override_flow(self):
        """Admin can override compliance region per customer and override takes precedence."""
        cust_id = "test_cust_section3_01"
        phone = "+919876543210"  # Normally India

        # Baseline: resolves to India
        base = RegionalComplianceService.get_compliance_rules_for_call(phone, customer_id=cust_id)
        self.assertEqual(base["region_code"], "IN")
        self.assertFalse(base["is_overridden"])

        # Admin overrides to USA
        override_res = RegionalComplianceService.set_customer_override(
            customer_id=cust_id,
            region_code="US",
            reason="US subsidiary enterprise customer override",
            overridden_by="admin_sec3"
        )
        self.assertTrue(override_res["success"])

        # Call-time lookup now applies US rules
        overridden = RegionalComplianceService.get_compliance_rules_for_call(phone, customer_id=cust_id)
        self.assertEqual(overridden["region_code"], "US")
        self.assertTrue(overridden["is_overridden"])
        self.assertEqual(overridden["override_reason"], "US subsidiary enterprise customer override")
        self.assertEqual(overridden["calling_hours"]["start"], "08:00")
        self.assertEqual(overridden["recording_consent"]["type"], "two_party_opt_in")

        # Clear override and verify revert
        cleared = RegionalComplianceService.clear_customer_override(cust_id)
        self.assertTrue(cleared)

        reverted = RegionalComplianceService.get_compliance_rules_for_call(phone, customer_id=cust_id)
        self.assertEqual(reverted["region_code"], "IN")
        self.assertFalse(reverted["is_overridden"])

    def test_customer_override_invalid_region_rejected(self):
        """Setting invalid region code raises ValueError."""
        with self.assertRaises(ValueError):
            RegionalComplianceService.set_customer_override(
                customer_id="test_cust_section3_02",
                region_code="INVALID_REGION",
                reason="Invalid test",
                overridden_by="admin"
            )

    # =========================================================================
    # 3. Regional KYC Requirements & Raw Aadhaar Prohibition
    # =========================================================================
    def test_india_kyc_raw_aadhaar_prohibited(self):
        """Raw Aadhaar is strictly prohibited for India under UIDAI regulations."""
        # Raw Aadhaar document type
        valid1, msg1 = RegionalComplianceService.validate_kyc_for_region("IN", "raw_aadhaar")
        self.assertFalse(valid1)
        self.assertIn("Raw Aadhaar submission is strictly prohibited", msg1)

        # Unmasked 12-digit numeric Aadhaar number
        valid2, msg2 = RegionalComplianceService.validate_kyc_for_region("IN", "company_pan", "123456789012")
        self.assertFalse(valid2)
        self.assertIn("Unmasked 12-digit Aadhaar number detected", msg2)

    def test_india_kyc_valid_documents(self):
        """India permits Masked Aadhaar, Company PAN, GSTIN certificate."""
        valid, _ = RegionalComplianceService.validate_kyc_for_region("IN", "masked_aadhaar")
        self.assertTrue(valid)

        valid_pan, _ = RegionalComplianceService.validate_kyc_for_region("IN", "company_pan")
        self.assertTrue(valid_pan)

        valid_gstin, _ = RegionalComplianceService.validate_kyc_for_region("IN", "gstin_certificate")
        self.assertTrue(valid_gstin)

    def test_usa_kyc_requirements(self):
        """USA permits Business EIN, State Certificate, Driver's License, Passport."""
        valid_ein, _ = RegionalComplianceService.validate_kyc_for_region("US", "business_ein")
        self.assertTrue(valid_ein)

        valid_state, _ = RegionalComplianceService.validate_kyc_for_region("US", "state_certificate")
        self.assertTrue(valid_state)

    def test_eu_middle_east_sea_kyc(self):
        """EU requires company registration; ME requires trade license; SEA requires local business ID."""
        valid_eu, _ = RegionalComplianceService.validate_kyc_for_region("EU", "company_registration")
        self.assertTrue(valid_eu)

        valid_me, _ = RegionalComplianceService.validate_kyc_for_region("ME", "trade_license")
        self.assertTrue(valid_me)

        valid_sea, _ = RegionalComplianceService.validate_kyc_for_region("SEA", "local_business_registration")
        self.assertTrue(valid_sea)

    # =========================================================================
    # 4. Regional Calling Hour Windows
    # =========================================================================
    def test_calling_hours_india_0900_to_2100(self):
        """India calling window is strictly 09:00 to 21:00 IST."""
        in_win, _ = RegionalComplianceService.check_calling_hours_window("IN", "10:30")
        self.assertTrue(in_win)

        out_win_early, _ = RegionalComplianceService.check_calling_hours_window("IN", "08:45")
        self.assertFalse(out_win_early)

        out_win_late, _ = RegionalComplianceService.check_calling_hours_window("IN", "21:15")
        self.assertFalse(out_win_late)

    def test_calling_hours_usa_0800_to_2100(self):
        """USA calling window is 08:00 to 21:00 local time."""
        in_win_early, _ = RegionalComplianceService.check_calling_hours_window("US", "08:15")
        self.assertTrue(in_win_early)

        out_win_too_early, _ = RegionalComplianceService.check_calling_hours_window("US", "07:45")
        self.assertFalse(out_win_too_early)

        out_win_late, _ = RegionalComplianceService.check_calling_hours_window("US", "21:30")
        self.assertFalse(out_win_late)

    def test_calling_hours_eu_0900_to_2000(self):
        """EU calling window closes at 20:00 local time."""
        in_win, _ = RegionalComplianceService.check_calling_hours_window("EU", "19:30")
        self.assertTrue(in_win)

        out_win_late, _ = RegionalComplianceService.check_calling_hours_window("EU", "20:30")
        self.assertFalse(out_win_late)

    # =========================================================================
    # 5. Recording Consent Rules & 2-Party Consent States
    # =========================================================================
    def test_recording_consent_rules(self):
        """Validates statutory consent requirements across regions."""
        # India: Audible disclosure required
        rule_in = CANONICAL_REGIONS["IN"]["recording_consent"]
        self.assertEqual(rule_in["type"], "audible_disclosure")
        self.assertFalse(rule_in["requires_explicit_opt_in"])

        # USA: 2-party consent states require explicit opt-in
        rule_us = CANONICAL_REGIONS["US"]["recording_consent"]
        self.assertEqual(rule_us["type"], "two_party_opt_in")
        self.assertTrue(rule_us["requires_explicit_opt_in"])
        self.assertIn("CA", US_TWO_PARTY_CONSENT_STATES)
        self.assertIn("FL", US_TWO_PARTY_CONSENT_STATES)
        self.assertIn("PA", US_TWO_PARTY_CONSENT_STATES)

        # EU: Explicit opt-in required (GDPR)
        rule_eu = CANONICAL_REGIONS["EU"]["recording_consent"]
        self.assertEqual(rule_eu["type"], "explicit_opt_in")
        self.assertTrue(rule_eu["requires_explicit_opt_in"])

        # Middle East: Audible disclosure required
        rule_me = CANONICAL_REGIONS["ME"]["recording_consent"]
        self.assertEqual(rule_me["type"], "audible_disclosure")
        self.assertFalse(rule_me["requires_explicit_opt_in"])

        # SEA: Explicit opt-in / consent required
        rule_sea = CANONICAL_REGIONS["SEA"]["recording_consent"]
        self.assertEqual(rule_sea["type"], "explicit_opt_in")
        self.assertTrue(rule_sea["requires_explicit_opt_in"])

    # =========================================================================
    # 6. Expiry Handling: 15d Grace + 14d Hold Across All Regions
    # =========================================================================
    def test_lifecycle_expiry_handling_across_all_regions(self):
        """All regions enforce 15-day grace + 14-day hold with neutral unavailable message and no 90d cooling."""
        for reg_code, meta in CANONICAL_REGIONS.items():
            lifecycle = meta["lifecycle"]
            self.assertEqual(lifecycle["grace_period_days"], 15, f"Region {reg_code} must have 15d grace")
            self.assertEqual(lifecycle["hold_period_days"], 14, f"Region {reg_code} must have 14d hold")
            self.assertEqual(lifecycle["cooling_period_days"], 0, f"Region {reg_code} must have no 90d cooling")
            self.assertEqual(lifecycle["unavailable_message"], "neutral_unavailable")

    # =========================================================================
    # 7. Retention Rules: Statutory Billing vs Deals
    # =========================================================================
    def test_statutory_retention_rules(self):
        """Verifies tax statutory periods and 90-180d deal retention."""
        for reg_code, meta in CANONICAL_REGIONS.items():
            retention = meta["retention"]
            self.assertGreaterEqual(retention["billing_statutory_years"], 7)
            self.assertEqual(retention["deals_retention_days_min"], 90)
            self.assertEqual(retention["deals_retention_days_max"], 180)

        # India: 8 years tax statutory period (Income Tax Act 1961 Section 44AA)
        self.assertEqual(CANONICAL_REGIONS["IN"]["retention"]["billing_statutory_years"], 8)
        # USA: 7 years IRS period
        self.assertEqual(CANONICAL_REGIONS["US"]["retention"]["billing_statutory_years"], 7)
        # EU: 10 years statutory period
        self.assertEqual(CANONICAL_REGIONS["EU"]["retention"]["billing_statutory_years"], 10)

    # =========================================================================
    # 8. HTTP API Endpoints Verification
    # =========================================================================
    def test_api_list_regions(self):
        """GET /api/compliance/regions returns all 5 canonical regions."""
        response = self.client.get("/api/compliance/regions")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["count"], 5)
        self.assertSetEqual(set(data["regions"].keys()), {"IN", "US", "EU", "ME", "SEA"})

    def test_api_resolve_call_compliance(self):
        """GET /api/compliance/resolve-call returns regional rules based on phone number."""
        response = self.client.get("/api/compliance/resolve-call", params={"phone_number": "+14155552671"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["region_code"], "US")
        self.assertEqual(data["region_name"], "United States of America")
        self.assertEqual(data["calling_hours"]["start"], "08:00")
        self.assertEqual(data["calling_hours"]["end"], "21:00")
        self.assertEqual(data["lifecycle"]["grace_period_days"], 15)
        self.assertEqual(data["lifecycle"]["hold_period_days"], 14)

    def test_api_override_region_and_resolve(self):
        """POST /api/compliance/override-region and DELETE /api/compliance/override-region/{id}."""
        cust_id = "test_cust_api_sec3"
        # Set override
        post_resp = self.client.post("/api/compliance/override-region", json={
            "customer_id": cust_id,
            "region_code": "EU",
            "reason": "European subsidiary GDPR routing",
            "overridden_by": "admin_api"
        })
        self.assertEqual(post_resp.status_code, 200)
        self.assertTrue(post_resp.json()["success"])

        # Resolve call with override
        resolve_resp = self.client.get("/api/compliance/resolve-call", params={
            "phone_number": "+919876543210",
            "customer_id": cust_id
        })
        self.assertEqual(resolve_resp.status_code, 200)
        data = resolve_resp.json()
        self.assertEqual(data["region_code"], "EU")
        self.assertTrue(data["is_overridden"])
        self.assertEqual(data["override_reason"], "European subsidiary GDPR routing")

        # Delete override
        del_resp = self.client.delete(f"/api/compliance/override-region/{cust_id}")
        self.assertEqual(del_resp.status_code, 200)
        self.assertTrue(del_resp.json()["success"])

        # Verify reverted
        revert_resp = self.client.get("/api/compliance/resolve-call", params={
            "phone_number": "+919876543210",
            "customer_id": cust_id
        })
        self.assertEqual(revert_resp.json()["region_code"], "IN")
        self.assertFalse(revert_resp.json()["is_overridden"])

    def test_api_validate_kyc(self):
        """POST /api/compliance/validate-kyc validates documents per region."""
        # Raw Aadhaar blocked
        resp_bad = self.client.post("/api/compliance/validate-kyc", json={
            "region_code": "IN",
            "document_type": "raw_aadhaar"
        })
        self.assertEqual(resp_bad.status_code, 200)
        self.assertFalse(resp_bad.json()["valid"])

        # Masked Aadhaar permitted
        resp_good = self.client.post("/api/compliance/validate-kyc", json={
            "region_code": "IN",
            "document_type": "masked_aadhaar"
        })
        self.assertEqual(resp_good.status_code, 200)
        self.assertTrue(resp_good.json()["valid"])

    def test_api_check_calling_hours(self):
        """GET /api/compliance/check-calling-hours validates statutory windows."""
        # US allowed at 08:30
        resp_us = self.client.get("/api/compliance/check-calling-hours", params={
            "region_code": "US",
            "time": "08:30"
        })
        self.assertEqual(resp_us.status_code, 200)
        self.assertTrue(resp_us.json()["within_window"])

        # IN rejected at 08:30 (opens at 09:00)
        resp_in = self.client.get("/api/compliance/check-calling-hours", params={
            "region_code": "IN",
            "time": "08:30"
        })
        self.assertEqual(resp_in.status_code, 200)
        self.assertFalse(resp_in.json()["within_window"])


if __name__ == "__main__":
    unittest.main()
