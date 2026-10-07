"""
backend/app/services/regional_compliance_service.py

Master Plan Section 3: Global Compliance Strategy
Enforces region-specific compliance rules automatically based on customer location and called-party number (+country_code).
Admin can override per customer.

Canonical 5 Regions:
1. India (IN): Masked Aadhaar/PAN/GST (raw Aadhaar prohibited); TRAI TCCCPR; DND scrub; 09:00–21:00; 15d grace + 14d hold; Audible disclosure; Statutory billing: 8y tax; deals: 90–180d.
2. USA (US): Business EIN/ID; TCPA written consent; 08:00–21:00 local; 15d grace + 14d hold; 2-party consent states require explicit opt-in; Statutory billing: 7y IRS; deals: 90–180d.
3. EU/UK (EU): Company registration; GDPR consent / PECR; 15d grace + 14d hold; Explicit opt-in for recording; Statutory billing: statutory period (10y); deals: 90–180d.
4. Middle East (ME): National ID/Trade License; Local telecom rules; 15d grace + 14d hold; Audible disclosure; Statutory billing: 10y; deals: 90–180d.
5. Southeast Asia (SEA): Local business ID (UEN Singapore, NIB Indonesia); Singapore PDPA / Indonesia PDP; 15d grace + 14d hold; Consent required; Statutory billing: 7y; deals: 90–180d.
"""

import re
import logging
from datetime import datetime, time
from typing import Dict, Any, List, Optional, Tuple

from database import supabase_admin

logger = logging.getLogger("RegionalComplianceService")

# US States requiring 2-party affirmative recording consent
US_TWO_PARTY_CONSENT_STATES = {
    "CA", "FL", "CT", "IL", "MD", "MA", "MI", "MT", "NV", "NH", "PA", "WA"
}

# In-memory Canonical Regions definition (Statutory Fallback & Single Source of Truth)
CANONICAL_REGIONS: Dict[str, Dict[str, Any]] = {
    "IN": {
        "region_code": "IN",
        "name": "India",
        "dial_prefixes": ["+91", "91"],
        "kyc_documents": ["masked_aadhaar", "company_pan", "gstin_certificate", "authorized_signatory_id"],
        "raw_aadhaar_prohibited": True,
        "dnd_scrub_required": True,
        "dnd_regulation": "TRAI TCCCPR 2018 Regulation 12",
        "calling_hours": {
            "start": "09:00",
            "end": "21:00",
            "window_str": "09:00–21:00 IST",
            "timezone_default": "Asia/Kolkata"
        },
        "recording_consent": {
            "rule": "Audible disclosure required",
            "type": "audible_disclosure",
            "requires_explicit_opt_in": False,
            "statutory_notice": "This call is recorded for quality and statutory compliance."
        },
        "lifecycle": {
            "grace_period_days": 15,
            "hold_period_days": 14,
            "cooling_period_days": 0,
            "unavailable_message": "neutral_unavailable"
        },
        "retention": {
            "billing_statutory_years": 8,
            "billing_retention_authority": "Income Tax Act 1961 Section 44AA (CONFIRM WITH CA)",
            "deals_retention_days_min": 90,
            "deals_retention_days_max": 180,
            "deals_retention_days_default": 180
        },
        "statutory_note": "India launch market; raw Aadhaar prohibited under UIDAI regulations; tax retention confirm with CA."
    },
    "US": {
        "region_code": "US",
        "name": "United States of America",
        "dial_prefixes": ["+1", "1"],
        "kyc_documents": ["business_ein", "state_certificate", "drivers_license", "passport"],
        "raw_aadhaar_prohibited": True,
        "dnd_scrub_required": True,
        "dnd_regulation": "TCPA & TSR Written Prior Express Consent",
        "calling_hours": {
            "start": "08:00",
            "end": "21:00",
            "window_str": "08:00–21:00 Local Time",
            "timezone_default": "America/New_York"
        },
        "recording_consent": {
            "rule": "2-party consent states require explicit opt-in; others require 1-party audible disclosure",
            "type": "two_party_opt_in",
            "requires_explicit_opt_in": True,
            "statutory_notice": "This call may be monitored or recorded. Press 1 to consent or stay on line.",
            "two_party_states": sorted(list(US_TWO_PARTY_CONSENT_STATES))
        },
        "lifecycle": {
            "grace_period_days": 15,
            "hold_period_days": 14,
            "cooling_period_days": 0,
            "unavailable_message": "neutral_unavailable"
        },
        "retention": {
            "billing_statutory_years": 7,
            "billing_retention_authority": "IRS Regulation 26 CFR 1.6001-1",
            "deals_retention_days_min": 90,
            "deals_retention_days_max": 180,
            "deals_retention_days_default": 180
        },
        "statutory_note": "TCPA express written consent mandated; check carrier terms (UNVERIFIED, check provider terms)."
    },
    "EU": {
        "region_code": "EU",
        "name": "European Union & United Kingdom",
        "dial_prefixes": [
            "+44", "44",  # UK
            "+33", "33",  # France
            "+49", "49",  # Germany
            "+34", "34",  # Spain
            "+39", "39",  # Italy
            "+31", "31",  # Netherlands
            "+32", "32",  # Belgium
            "+353", "353", # Ireland
            "+46", "46",  # Sweden
            "+48", "48"   # Poland
        ],
        "kyc_documents": ["company_registration", "vat_certificate", "authorized_director_id"],
        "raw_aadhaar_prohibited": True,
        "dnd_scrub_required": True,
        "dnd_regulation": "GDPR Article 6 Consent / ePrivacy PECR Opt-In",
        "calling_hours": {
            "start": "09:00",
            "end": "20:00",
            "window_str": "09:00–20:00 Local Time",
            "timezone_default": "Europe/London"
        },
        "recording_consent": {
            "rule": "Explicit opt-in required for recording",
            "type": "explicit_opt_in",
            "requires_explicit_opt_in": True,
            "statutory_notice": "Pursuant to GDPR Article 6, this call will only be recorded with your affirmative consent."
        },
        "lifecycle": {
            "grace_period_days": 15,
            "hold_period_days": 14,
            "cooling_period_days": 0,
            "unavailable_message": "neutral_unavailable"
        },
        "retention": {
            "billing_statutory_years": 10,
            "billing_retention_authority": "EU Commercial Code / HMRC Statutory Accounts Period",
            "deals_retention_days_min": 90,
            "deals_retention_days_max": 180,
            "deals_retention_days_default": 180
        },
        "statutory_note": "GDPR & PECR strict opt-in mandated; verify provider terms (UNVERIFIED, check provider terms)."
    },
    "ME": {
        "region_code": "ME",
        "name": "Middle East",
        "dial_prefixes": [
            "+971", "971", # UAE
            "+966", "966", # Saudi Arabia
            "+974", "974", # Qatar
            "+965", "965", # Kuwait
            "+968", "968", # Oman
            "+973", "973"  # Bahrain
        ],
        "kyc_documents": ["trade_license", "commercial_registry", "national_id", "passport"],
        "raw_aadhaar_prohibited": True,
        "dnd_scrub_required": True,
        "dnd_regulation": "TDRA / CITC National Do Not Call Registry Regulations",
        "calling_hours": {
            "start": "09:00",
            "end": "21:00",
            "window_str": "09:00–21:00 Local Time",
            "timezone_default": "Asia/Dubai"
        },
        "recording_consent": {
            "rule": "Audible disclosure required",
            "type": "audible_disclosure",
            "requires_explicit_opt_in": False,
            "statutory_notice": "This call is recorded for service quality and verification."
        },
        "lifecycle": {
            "grace_period_days": 15,
            "hold_period_days": 14,
            "cooling_period_days": 0,
            "unavailable_message": "neutral_unavailable"
        },
        "retention": {
            "billing_statutory_years": 10,
            "billing_retention_authority": "Federal Tax Authority / ZATCA Statutory Period",
            "deals_retention_days_min": 90,
            "deals_retention_days_max": 180,
            "deals_retention_days_default": 180
        },
        "statutory_note": "Trade license required; local carrier registration mandated (UNVERIFIED, check provider terms)."
    },
    "SEA": {
        "region_code": "SEA",
        "name": "Southeast Asia",
        "dial_prefixes": [
            "+65", "65", # Singapore
            "+62", "62", # Indonesia
            "+60", "60", # Malaysia
            "+63", "63", # Philippines
            "+66", "66", # Thailand
            "+84", "84"  # Vietnam
        ],
        "kyc_documents": ["local_business_registration", "tax_id", "director_id"],
        "raw_aadhaar_prohibited": True,
        "dnd_scrub_required": True,
        "dnd_regulation": "Singapore PDPA DNC / Indonesia PDP Law",
        "calling_hours": {
            "start": "09:00",
            "end": "21:00",
            "window_str": "09:00–21:00 Local Time",
            "timezone_default": "Asia/Singapore"
        },
        "recording_consent": {
            "rule": "Consent required",
            "type": "explicit_opt_in",
            "requires_explicit_opt_in": True,
            "statutory_notice": "In accordance with local personal data protection laws, this call is recorded upon consent."
        },
        "lifecycle": {
            "grace_period_days": 15,
            "hold_period_days": 14,
            "cooling_period_days": 0,
            "unavailable_message": "neutral_unavailable"
        },
        "retention": {
            "billing_statutory_years": 7,
            "billing_retention_authority": "IRAS Singapore / Indonesia Tax General Provisions",
            "deals_retention_days_min": 90,
            "deals_retention_days_max": 180,
            "deals_retention_days_default": 180
        },
        "statutory_note": "Singapore PDPA & Indonesia PDP Law compliance; check provider terms (UNVERIFIED, check provider terms)."
    }
}

# In-memory customer overrides store for high availability & test isolation
_IN_MEMORY_CUSTOMER_OVERRIDES: Dict[str, Dict[str, Any]] = {}


class RegionalComplianceService:
    """Enterprise global compliance policy engine enforcing region-specific rules."""

    @classmethod
    def normalize_phone_number(cls, phone_number: str) -> str:
        """Strips whitespace, hyphens, and brackets. Ensures E.164 leading plus."""
        if not phone_number:
            return ""
        cleaned = re.sub(r'[\s\-\(\)]', '', str(phone_number).strip())
        if not cleaned.startswith("+"):
            if cleaned.startswith("00"):
                cleaned = "+" + cleaned[2:]
            elif cleaned.startswith("91") and len(cleaned) == 12:
                cleaned = "+" + cleaned
            elif cleaned.startswith("1") and len(cleaned) == 11:
                cleaned = "+" + cleaned
            elif len(cleaned) == 10:
                # Default 10-digit without prefix is treated as Indian national number
                cleaned = "+91" + cleaned
            else:
                cleaned = "+" + cleaned
        return cleaned

    @classmethod
    def resolve_region_by_phone(cls, phone_number: str) -> str:
        """
        Determines the region code ('IN', 'US', 'EU', 'ME', 'SEA') based on +country_code.
        Defaults to 'IN' if unrecognized.
        """
        normalized = cls.normalize_phone_number(phone_number)
        if not normalized:
            return "IN"

        # Check explicit prefixes matching longest prefix first
        candidates: List[Tuple[str, str]] = []
        for region_code, meta in CANONICAL_REGIONS.items():
            for prefix in meta["dial_prefixes"]:
                p_norm = prefix if prefix.startswith("+") else f"+{prefix}"
                if normalized.startswith(p_norm):
                    candidates.append((p_norm, region_code))

        if candidates:
            # Sort by prefix length descending to match longest specific prefix (+353 before +3)
            candidates.sort(key=lambda c: len(c[0]), reverse=True)
            return candidates[0][1]

        # Default fallback is India (launch market)
        return "IN"

    @classmethod
    def get_customer_override(cls, customer_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves administrative region override for a customer."""
        if not customer_id:
            return None

        # Check in-memory store first
        if customer_id in _IN_MEMORY_CUSTOMER_OVERRIDES:
            return _IN_MEMORY_CUSTOMER_OVERRIDES[customer_id]

        # Check database if available
        if supabase_admin:
            try:
                res = supabase_admin.table("customer_region_overrides").select("*").eq("customer_id", customer_id).execute()
                if res.data and len(res.data) > 0:
                    row = res.data[0]
                    _IN_MEMORY_CUSTOMER_OVERRIDES[customer_id] = row
                    return row
            except Exception as e:
                logger.warning(f"Could not read customer_region_overrides from DB: {e}")

        return None

    @classmethod
    def set_customer_override(
        cls,
        customer_id: str,
        region_code: str,
        reason: str,
        overridden_by: str,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Saves an administrative override per customer.
        Region code must be one of: IN, US, EU, ME, SEA.
        """
        region_code = region_code.upper()
        if region_code not in CANONICAL_REGIONS:
            raise ValueError(f"Invalid region_code '{region_code}'. Allowed: {list(CANONICAL_REGIONS.keys())}")

        override_record = {
            "customer_id": customer_id,
            "organization_id": organization_id,
            "region_code": region_code,
            "reason": reason,
            "overridden_by": overridden_by,
            "updated_at": datetime.now().isoformat()
        }

        # Store in-memory
        _IN_MEMORY_CUSTOMER_OVERRIDES[customer_id] = override_record

        # Store in database if available
        if supabase_admin:
            try:
                supabase_admin.table("customer_region_overrides").upsert(
                    override_record, on_conflict="customer_id"
                ).execute()
            except Exception as e:
                logger.warning(f"Could not persist customer_region_override to DB: {e}")

        return {
            "success": True,
            "message": f"Region override for customer '{customer_id}' set to '{region_code}'.",
            "override": override_record
        }

    @classmethod
    def clear_customer_override(cls, customer_id: str) -> bool:
        """Removes customer administrative override."""
        if customer_id in _IN_MEMORY_CUSTOMER_OVERRIDES:
            del _IN_MEMORY_CUSTOMER_OVERRIDES[customer_id]

        if supabase_admin:
            try:
                supabase_admin.table("customer_region_overrides").delete().eq("customer_id", customer_id).execute()
            except Exception as e:
                logger.warning(f"Could not delete customer_region_override from DB: {e}")

        return True

    @classmethod
    def get_compliance_rules_for_call(
        cls,
        phone_number: str,
        customer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Authoritative call-time compliance resolution.
        1. Checks for customer override first.
        2. Resolves region based on called phone prefix (+country_code).
        3. Returns the full rule bundle.
        """
        normalized_phone = cls.normalize_phone_number(phone_number)
        override = cls.get_customer_override(customer_id) if customer_id else None

        if override and override.get("region_code") in CANONICAL_REGIONS:
            effective_region_code = override["region_code"]
            is_overridden = True
            override_reason = override.get("reason")
        else:
            effective_region_code = cls.resolve_region_by_phone(normalized_phone)
            is_overridden = False
            override_reason = None

        rule_template = CANONICAL_REGIONS[effective_region_code]

        return {
            "success": True,
            "phone_number": normalized_phone,
            "customer_id": customer_id,
            "region_code": effective_region_code,
            "region_name": rule_template["name"],
            "is_overridden": is_overridden,
            "override_reason": override_reason,
            "kyc_documents_allowed": rule_template["kyc_documents"],
            "raw_aadhaar_prohibited": rule_template["raw_aadhaar_prohibited"],
            "dnd_scrub_required": rule_template["dnd_scrub_required"],
            "dnd_regulation": rule_template["dnd_regulation"],
            "calling_hours": rule_template["calling_hours"],
            "recording_consent": rule_template["recording_consent"],
            "lifecycle": rule_template["lifecycle"],
            "retention": rule_template["retention"],
            "statutory_note": rule_template["statutory_note"]
        }

    @classmethod
    def validate_kyc_for_region(
        cls,
        region_code: str,
        document_type: str,
        document_number: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Validates KYC document against regional mandates:
        - India: Enforces Masked Aadhaar / PAN / GST. RAW 12-digit Aadhaar strictly prohibited.
        - USA: Business EIN / State Cert / ID.
        - EU: Company registration / VAT.
        - ME: Trade License / Commercial Registry.
        - SEA: Local Business Registration / Tax ID.
        """
        region_code = region_code.upper()
        if region_code not in CANONICAL_REGIONS:
            return False, f"Unknown region code '{region_code}'."

        rules = CANONICAL_REGIONS[region_code]
        allowed_docs = rules["kyc_documents"]

        norm_doc_type = document_type.lower().strip()

        # India Raw Aadhaar check:
        if region_code == "IN":
            if norm_doc_type == "raw_aadhaar":
                return False, "Raw Aadhaar submission is strictly prohibited under UIDAI regulations. Only Masked Aadhaar is allowed."
            if document_number:
                clean_num = re.sub(r'[\s\-]', '', str(document_number))
                if clean_num.isdigit() and len(clean_num) == 12 and not clean_num.startswith("XXXX"):
                    return False, "Unmasked 12-digit Aadhaar number detected. Raw Aadhaar numbers are prohibited."

        if norm_doc_type not in allowed_docs and norm_doc_type not in ["passport", "driving_license", "utility_bill"]:
            return False, f"Document type '{document_type}' is not recognized for region '{region_code}'. Allowed: {allowed_docs}"

        return True, f"Document '{document_type}' validated for region '{region_code}'."

    @classmethod
    def is_two_party_consent_required(cls, region_code: str, state_code: Optional[str] = None) -> bool:
        """
        Checks whether two-party affirmative consent is required for call recording.
        In USA, applies to 12 two-party consent states.
        In EU/SEA, explicit opt-in is standard.
        In India/ME, audible disclosure is required.
        """
        region_code = region_code.upper()
        if region_code == "US":
            if state_code and state_code.upper() in US_TWO_PARTY_CONSENT_STATES:
                return True
            return True  # By default US applies strict two-party safe policy
        elif region_code in ["EU", "SEA"]:
            return True
        return False

    @classmethod
    def check_calling_hours_window(
        cls,
        region_code: str,
        current_time_str: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Verifies that current time falls within statutory calling window:
        - IN: 09:00 to 21:00
        - US: 08:00 to 21:00
        - EU: 09:00 to 20:00
        - ME: 09:00 to 21:00
        - SEA: 09:00 to 21:00
        """
        region_code = region_code.upper()
        region_meta = CANONICAL_REGIONS.get(region_code, CANONICAL_REGIONS["IN"])
        hours = region_meta["calling_hours"]

        start_h, start_m = map(int, hours["start"].split(":"))
        end_h, end_m = map(int, hours["end"].split(":"))
        start_t = time(start_h, start_m)
        end_t = time(end_h, end_m)

        if current_time_str:
            cur_h, cur_m = map(int, current_time_str.split(":"))
            check_t = time(cur_h, cur_m)
        else:
            now = datetime.now()
            check_t = time(now.hour, now.minute)

        if start_t <= check_t <= end_t:
            return True, f"Time {check_t.strftime('%H:%M')} is within legal window ({hours['start']}–{hours['end']}) for {region_meta['name']}."
        else:
            return False, f"Time {check_t.strftime('%H:%M')} is outside legal calling window ({hours['start']}–{hours['end']}) for {region_meta['name']}."

    @classmethod
    def list_all_regions(cls) -> Dict[str, Any]:
        """Lists metadata and statutory configuration for all 5 canonical regions."""
        return {
            "success": True,
            "count": len(CANONICAL_REGIONS),
            "regions": CANONICAL_REGIONS
        }
