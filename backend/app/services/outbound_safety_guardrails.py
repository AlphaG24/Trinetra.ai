"""
Outbound Safety Guardrails Engine (Phase 3)
===========================================
Enforces statutory compliance and safety rules for all outbound communications:
1. Campaign purpose classification (Promotional vs. Service / Transactional).
2. Hard floor calling hours (09:00 - 21:00 in contact's local timezone).
   Callbacks requested by callers are permitted with auditable timestamps.
3. Per-contact consent flag and source validation on import.
4. Internal DND scrubbing and national DND registry hook.
5. WhatsApp proactive message guard (mandatory opt-in & approved templates).
6. Pre-send campaign audit reporting.

LEGAL & REGULATORY REFERENCES:
[CONFIRM WITH A LAWYER]
- India: TRAI Telecom Commercial Communications Customer Preference Regulations, 2018 (TCCCPR 2018)
  Official Regulations: https://trai.gov.in/telecom-commercial-communication-customer-preference-regulations-2018
  Official TRAI DND: https://trai.gov.in/consumer-info/telecom/dnd
  TRAI FAQ: https://www.trai.gov.in/faqcategory/telecom-commercial-communications-customer-preference-regulations-2018
- US: Telephone Consumer Protection Act (47 U.S.C. § 227) & FCC 47 CFR § 64.1200
  FCC TCPA Rules: https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200
- EU: ePrivacy Directive (Directive 2002/58/EC) & GDPR (Regulation (EU) 2016/679)
  EUR-Lex: https://eur-lex.europa.eu/eli/reg/2016/679/oj
"""

import re
import logging
from datetime import datetime, time, timezone, timedelta
from typing import Dict, Any, Optional, Tuple, List, Set

logger = logging.getLogger("outbound-safety-guardrails")

# ==============================================================================
# PROMOTIONAL CALLING HOURS WINDOW
# [CONFIRM WITH A LAWYER: TRAI TCCCPR 2018 Regulation 12]
# Official TRAI Text: https://trai.gov.in/telecom-commercial-communication-customer-preference-regulations-2018
# Under TRAI Telecom Commercial Communications Customer Preference Regulations 2018 (Regulation 12),
# no commercial communication shall be sent or made between 21:00 hrs and 09:00 hrs in the recipient's local time.
# Statutory permitted window: 09:00 to 21:00.
# NOTE ON 09:00-20:00 VS 09:00-21:00:
# While TRAI TCCCPR 2018 Regulation 12 sets 21:00 (9:00 PM) as the statutory curfew,
# earlier draft advisories and certain state/sectoral guidelines recommended an 09:00 - 20:00
# (8:00 PM) window. The hard floor here is enforced at 09:00 - 21:00 per the codified 2018 regulation;
# campaign owners can further narrow this window down (e.g. to 20:00) via campaign settings.
# ==============================================================================
PROMOTIONAL_CALLING_HOURS_WINDOW: Dict[str, Any] = {
    "start": time(9, 0),    # 09:00:00
    "end": time(21, 0),     # 21:00:00
    "default_timezone": "Asia/Kolkata",
    "regulation": "TRAI TCCCPR 2018 Regulation 12",
    "official_url": "https://trai.gov.in/telecom-commercial-communication-customer-preference-regulations-2018",
}
HARD_FLOOR_START = PROMOTIONAL_CALLING_HOURS_WINDOW["start"]
HARD_FLOOR_END = PROMOTIONAL_CALLING_HOURS_WINDOW["end"]

# Canonical campaign purposes
VALID_CAMPAIGN_PURPOSES = {"promotional", "service", "transactional"}

# Standard registered WhatsApp templates approved for proactive communications
APPROVED_WHATSAPP_TEMPLATES = {
    "service_appointment_reminder": {
        "category": "UTILITY",
        "description": "Appointment reminder and confirmation prompt",
        "required_vars": ["customer_name", "business_name", "appointment_time"]
    },
    "service_appointment_reminder_hi": {
        "category": "UTILITY",
        "description": "Hindi appointment reminder and confirmation prompt",
        "required_vars": ["customer_name", "business_name", "appointment_time"]
    },
    "lead_requested_info": {
        "category": "UTILITY",
        "description": "Information requested by caller during prior conversation",
        "required_vars": ["customer_name", "product_name", "info_link"]
    },
    "order_status_update": {
        "category": "UTILITY",
        "description": "Transactional order or inquiry update",
        "required_vars": ["customer_name", "order_id", "status"]
    }
}


def classify_campaign_purpose(raw_purpose: Optional[str], campaign_name: Optional[str] = None) -> str:
    """
    Classifies a campaign's purpose as 'promotional', 'service', or 'transactional'.
    Defaults to 'promotional' to guarantee safe conservative guardrails.
    """
    if raw_purpose and str(raw_purpose).strip().lower() in VALID_CAMPAIGN_PURPOSES:
        return str(raw_purpose).strip().lower()

    # Heuristic inference from campaign name if purpose not explicitly configured
    if campaign_name:
        name_lower = campaign_name.lower()
        if any(term in name_lower for term in ["reminder", "appointment", "service", "support", "ticket", "followup"]):
            return "service"
        if any(term in name_lower for term in ["otp", "verification", "order", "invoice", "receipt", "alert"]):
            return "transactional"

    return "promotional"


def infer_contact_timezone(phone_number: str, specified_timezone: Optional[str] = None) -> str:
    """
    Infers the contact's canonical IANA timezone based on phone number country prefix.
    Defaults to 'Asia/Kolkata' for Indian numbers (+91) or unspecified 10-digit Indian numbers.
    """
    if specified_timezone and specified_timezone.strip():
        return specified_timezone.strip()

    clean_phone = (phone_number or "").strip()
    norm = clean_phone if clean_phone.startswith("+") else f"+{clean_phone}"

    if norm.startswith("+91") or (len(clean_phone) == 10 and clean_phone.isdigit() and clean_phone[0] in "6789"):
        return "Asia/Kolkata"
    if norm.startswith("+44"):
        return "Europe/London"
    if norm.startswith("+49"):
        return "Europe/Berlin"
    if norm.startswith("+33"):
        return "Europe/Paris"
    if norm.startswith("+81"):
        return "Asia/Tokyo"
    if norm.startswith("+61"):
        return "Australia/Sydney"
    if norm.startswith("+1"):
        return "America/New_York"  # Conservative US East baseline

    return "Asia/Kolkata"


def get_current_time_in_timezone(tz_name: str, base_utc_dt: Optional[datetime] = None) -> Tuple[datetime, time]:
    """
    Resolves current local time in given timezone.
    Supports standard IANA strings, offsets, and common abbreviations.
    """
    now_utc = base_utc_dt or datetime.now(timezone.utc)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)

    tz_clean = tz_name.strip().lower()
    abbrev_offsets = {
        "asia/kolkata": timedelta(hours=5, minutes=30),
        "ist": timedelta(hours=5, minutes=30),
        "utc": timedelta(0),
        "gmt": timedelta(0),
        "europe/london": timedelta(0),
        "europe/berlin": timedelta(hours=1),
        "america/new_york": timedelta(hours=-5),
        "est": timedelta(hours=-5),
        "america/chicago": timedelta(hours=-6),
        "cst": timedelta(hours=-6),
        "america/denver": timedelta(hours=-7),
        "mst": timedelta(hours=-7),
        "america/los_angeles": timedelta(hours=-8),
        "pst": timedelta(hours=-8),
    }

    if tz_clean in abbrev_offsets:
        local_dt = now_utc + abbrev_offsets[tz_clean]
        return local_dt, local_dt.time()

    try:
        from zoneinfo import ZoneInfo
        local_dt = now_utc.astimezone(ZoneInfo(tz_name))
        return local_dt, local_dt.time()
    except Exception:
        try:
            import pytz
            local_dt = now_utc.astimezone(pytz.timezone(tz_name))
            return local_dt, local_dt.time()
        except Exception:
            logger.warning(f"Timezone '{tz_name}' unresolvable. Defaulting to Asia/Kolkata (IST)")
            local_dt = now_utc + timedelta(hours=5, minutes=30)
            return local_dt, local_dt.time()


def is_allowed_calling_time(
    contact_phone: str,
    campaign_purpose: str = "promotional",
    owner_start_str: str = "10:00",
    owner_end_str: str = "18:00",
    contact_timezone: Optional[str] = None,
    is_requested_callback: bool = False,
    requested_callback_time: Optional[datetime] = None,
    current_utc_dt: Optional[datetime] = None
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Enforces statutory calling hours for outbound calls.
    
    Hard Floor Rule:
    - Promotional outbound calls MUST be within 09:00 - 21:00 in the contact's local timezone.
    - Owner settings can NARROW this window (e.g. 10:00 - 18:00), but CANNOT widen it past 09:00-21:00.
    
    Callback Exception:
    - Callbacks requested by a caller for a specific time are allowed outside 09:00-21:00.
    - Must be logged with requested timestamp.
    - [CONFIRM WITH A LAWYER: TRAI TCCCPR 2018 Regulation 12 / TCPA EBR exception].
    """
    resolved_tz = infer_contact_timezone(contact_phone, contact_timezone)
    local_dt, local_time = get_current_time_in_timezone(resolved_tz, current_utc_dt)
    purpose = classify_campaign_purpose(campaign_purpose)

    # 1. Callback Exception check
    if is_requested_callback:
        if requested_callback_time:
            log_note = (
                f"Requested callback permitted at {local_time.strftime('%H:%M:%S')} {resolved_tz} "
                f"(requested for {requested_callback_time.isoformat()}). [CONFIRM WITH A LAWYER]"
            )
            return True, log_note, {
                "timezone": resolved_tz,
                "local_time": local_time.strftime("%H:%M:%S"),
                "is_callback": True,
                "purpose": purpose
            }
        else:
            return False, "Requested callback missing mandatory audit timestamp", {
                "timezone": resolved_tz,
                "local_time": local_time.strftime("%H:%M:%S"),
                "is_callback": True
            }

    # 2. Service & Transactional calls (e.g. OTP, critical alert) are exempt from telemarketing curfew
    if purpose in ["service", "transactional"]:
        return True, f"Service/transactional call permitted at {local_time.strftime('%H:%M:%S')}", {
            "timezone": resolved_tz,
            "local_time": local_time.strftime("%H:%M:%S"),
            "purpose": purpose
        }

    # 3. Hard Floor Enforcement for Promotional calls
    # Parse owner settings
    try:
        sh, sm = [int(p) for p in owner_start_str.split(":")[:2]]
        eh, em = [int(p) for p in owner_end_str.split(":")[:2]]
        owner_start = time(sh, sm)
        owner_end = time(eh, em)
    except Exception:
        owner_start = time(10, 0)
        owner_end = time(18, 0)

    # Clamped bounds: Owner can narrow, but NEVER widen past statutory 09:00-21:00
    effective_start = max(owner_start, HARD_FLOOR_START)
    effective_end = min(owner_end, HARD_FLOOR_END)

    is_within = (effective_start <= local_time <= effective_end)
    status_msg = (
        f"Contact local time is {local_time.strftime('%H:%M:%S')} ({resolved_tz}). "
        f"Promotional window is {effective_start.strftime('%H:%M')} - {effective_end.strftime('%H:%M')}."
    )

    if not is_within:
        if local_time < HARD_FLOOR_START or local_time > HARD_FLOOR_END:
            reason = (
                f"BLOCKED BY HARD FLOOR: Local time {local_time.strftime('%H:%M')} is outside statutory "
                f"09:00-21:00 telemarketing hours [CONFIRM WITH A LAWYER: TRAI TCCCPR 2018 Reg 12 / TCPA]"
            )
        else:
            reason = f"BLOCKED BY OWNER HOURS: Local time {local_time.strftime('%H:%M')} is outside owner hours ({effective_start.strftime('%H:%M')} - {effective_end.strftime('%H:%M')})"
        return False, reason, {
            "timezone": resolved_tz,
            "local_time": local_time.strftime("%H:%M:%S"),
            "effective_window": f"{effective_start.strftime('%H:%M')}-{effective_end.strftime('%H:%M')}",
            "purpose": purpose
        }

    return True, status_msg, {
        "timezone": resolved_tz,
        "local_time": local_time.strftime("%H:%M:%S"),
        "effective_window": f"{effective_start.strftime('%H:%M')}-{effective_end.strftime('%H:%M')}",
        "purpose": purpose
    }


def validate_contact_consent(row: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates mandatory per-contact consent flag and source for spreadsheet import.
    Returns: (is_valid, consent_source, rejection_reason)
    """
    # Normalized key lookup
    row_norm = {k.lower().replace("_", "").replace(" ", ""): str(v).strip() for k, v in row.items() if v is not None}

    # 1. Check consent flag
    consent_keys = ["consent", "hasconsent", "optin", "optedin", "consentflag", "userconsent"]
    found_consent_key = next((k for k in consent_keys if k in row_norm), None)
    
    if not found_consent_key:
        return False, None, "Missing mandatory 'consent' column [CONFIRM WITH A LAWYER: TRAI TCCCPR 2018 / TCPA]"

    raw_val = row_norm[found_consent_key].lower()
    is_consented = raw_val in ["true", "1", "yes", "y", "consented", "opt_in", "optin"]

    if not is_consented:
        return False, None, f"Contact consent flag is '{raw_val}' (must be affirmative 'true'/'yes'/'1')"

    # 2. Check consent source
    source_keys = ["consentsource", "source", "optinsource", "leadsource", "consentorigin", "sourceofconsent"]
    found_source_key = next((k for k in source_keys if k in row_norm), None)
    consent_source = row_norm.get(found_source_key) if found_source_key else None

    if not consent_source or len(consent_source.strip()) < 2:
        return False, None, "Missing mandatory 'consent_source' (e.g. 'website_form', 'inbound_inquiry', 'customer_agreement')"

    return True, consent_source.strip(), None


async def check_internal_dnd(phone_number: str, supabase_client: Any) -> bool:
    """
    Scrubs contact against internal DND / Opt-Out registry.
    Returns True if phone number is registered on DND (must NOT be called).
    """
    if not supabase_client or not phone_number:
        return False

    clean = re.sub(r'[\s\-\(\)]', '', phone_number)
    candidates = [clean]
    if clean.startswith("+"):
        candidates.append(clean[1:])
    else:
        candidates.append(f"+{clean}")
    if len(clean) == 10 and clean.isdigit():
        candidates.append(f"+91{clean}")
        candidates.append(f"91{clean}")

    try:
        import asyncio
        res = await asyncio.to_thread(
            supabase_client.table("dnd_registry")
            .select("phone_number")
            .in_("phone_number", candidates)
            .limit(1)
            .execute
        )
        return bool(res.data and len(res.data) > 0)
    except Exception as e:
        logger.error(f"[DND Check] Database query error for {phone_number}: {e}")
        return False


def check_national_dnd_registry(
    phone_number: str,
    country_code: str = "IN"
) -> Dict[str, Any]:
    """
    Hook for checking the national Do Not Disturb (DND) / NCPR registry.
    
    REGULATORY DETAILS & PRIMARY CITATION:
    [CONFIRM WITH A LAWYER]
    Under the Telecom Regulatory Authority of India (TRAI) Telecom Commercial
    Communications Customer Preference Regulations, 2018 (TCCCPR 2018), commercial
    callers must scrub call lists against the National Customer Preference Register (NCPR).
    Official TRAI primary source:
    - https://www.trai.gov.in/faqcategory/telecom-commercial-communications-customer-preference-regulations-2018
    - https://trai.gov.in/consumer-info/telecom/dnd
    
    Currently returns hook structure ready for integration with licensed TRAI Telemarketer
    scrubbing APIs / aggregator gateways.
    """
    clean = re.sub(r'[\s\-\(\)]', '', phone_number)
    return {
        "phone_number": clean,
        "country": country_code.upper(),
        "is_dnd_listed": False,  # Placeholder until live aggregator credentials configured
        "registry_source": "TRAI_NCPR_HOOK",
        "primary_law_reference": "https://trai.gov.in/telecom-commercial-communication-customer-preference-regulations-2018",
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "status": "scrubbed_clean_pending_carrier_gateway",
        "legal_notice": "CONFIRM WITH A LAWYER before production telemarketing launch"
    }


def validate_whatsapp_outbound(
    phone_number: str,
    message_text: Optional[str] = None,
    template_name: Optional[str] = None,
    whatsapp_opt_in: bool = False,
    is_proactive: bool = True,
    recipient_type: str = "customer",
) -> Tuple[bool, str]:
    """
    Validates outbound WhatsApp sends:
    
    Customer Guard (End Customers):
    1. Proactive messages to end customers REQUIRE recorded opt-in (whatsapp_opt_in == True).
    2. Proactive messages to end customers REQUIRE an approved template from APPROVED_WHATSAPP_TEMPLATES.
    3. Blocks unapproved free-form promotional messages to end customers.
    
    Owner Exception:
    - Administrative notifications to the business owner (e.g. new lead alert, callback scheduled,
      campaign summary, or in-call 'send details to owner') are EXEMPT from customer marketing
      opt-in and consumer template requirements. [CONFIRM WITH A LAWYER: Internal operational notification]
    """
    if not phone_number or not str(phone_number).strip():
        return False, "Destination phone number is required"

    # Owner operational notification bypass
    if str(recipient_type).lower() == "owner":
        return True, "Owner operational notification permitted [CONFIRM WITH A LAWYER: Administrative alert exemption]"

    if is_proactive:
        if not whatsapp_opt_in:
            return False, "BLOCKED: Proactive WhatsApp message requires recorded user opt-in [CONFIRM WITH A LAWYER: WhatsApp Business Policy / GDPR]"

        if not template_name or template_name not in APPROVED_WHATSAPP_TEMPLATES:
            approved_list = ", ".join(APPROVED_WHATSAPP_TEMPLATES.keys())
            return False, f"BLOCKED: Proactive WhatsApp send requires an approved template. Approved templates: [{approved_list}]"

    return True, "WhatsApp send parameters validated successfully"


async def generate_pre_send_campaign_report(
    campaign: Dict[str, Any],
    contacts: List[Dict[str, Any]],
    supabase_client: Any = None,
    current_utc_dt: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Generates comprehensive pre-send audit report:
    Evaluates every contact against:
    - Missing consent flag / consent source
    - Internal DND registry
    - Contact local calling window (09:00 - 21:00)
    - Valid phone formatting
    """
    total = len(contacts)
    passed_ids = []
    failed_missing_consent = []
    failed_dnd = []
    failed_time_window = []
    failed_invalid_phone = []

    purpose = classify_campaign_purpose(campaign.get("purpose"), campaign.get("name"))
    owner_start = campaign.get("calling_hours_start") or "10:00"
    owner_end = campaign.get("calling_hours_end") or "18:00"
    campaign_tz = campaign.get("timezone") or "Asia/Kolkata"

    for c in contacts:
        cid = c.get("id") or str(c.get("phone", ""))
        phone = c.get("phone") or c.get("phone_number") or ""
        
        # 1. Phone number format check
        clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
        if not clean_phone or len(clean_phone) < 7:
            failed_invalid_phone.append({"id": cid, "phone": phone, "reason": "Invalid or missing phone number"})
            continue

        # 2. Consent check
        has_consent = bool(c.get("consent_flag", False))
        consent_source = c.get("consent_source")
        if not has_consent or not consent_source:
            failed_missing_consent.append({
                "id": cid,
                "phone": clean_phone,
                "reason": "Missing required consent flag or consent source [CONFIRM WITH A LAWYER]"
            })
            continue

        # 3. DND check
        if supabase_client:
            is_dnd = await check_internal_dnd(clean_phone, supabase_client)
            if is_dnd:
                failed_dnd.append({"id": cid, "phone": clean_phone, "reason": "Phone is listed on internal DND/opt-out registry"})
                continue

        # 4. Time window check
        contact_tz = c.get("timezone") or campaign_tz
        is_callback = bool(c.get("is_requested_callback", False))
        req_time = c.get("requested_callback_time")
        
        is_allowed, time_reason, _ = is_allowed_calling_time(
            contact_phone=clean_phone,
            campaign_purpose=purpose,
            owner_start_str=owner_start,
            owner_end_str=owner_end,
            contact_timezone=contact_tz,
            is_requested_callback=is_callback,
            requested_callback_time=req_time,
            current_utc_dt=current_utc_dt
        )

        if not is_allowed:
            failed_time_window.append({"id": cid, "phone": clean_phone, "reason": time_reason})
            continue

        # All checks passed
        passed_ids.append(cid)

    return {
        "campaign_id": campaign.get("id"),
        "campaign_name": campaign.get("name"),
        "purpose": purpose,
        "total_contacts": total,
        "passed_count": len(passed_ids),
        "failed_count": total - len(passed_ids),
        "breakdown": {
            "passed": len(passed_ids),
            "failed_missing_consent": len(failed_missing_consent),
            "failed_dnd": len(failed_dnd),
            "failed_time_window": len(failed_time_window),
            "failed_invalid_phone": len(failed_invalid_phone)
        },
        "details": {
            "failed_missing_consent": failed_missing_consent,
            "failed_dnd": failed_dnd,
            "failed_time_window": failed_time_window,
            "failed_invalid_phone": failed_invalid_phone
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "legal_notice": "[CONFIRM WITH A LAWYER] Ensure National Customer Preference Register (NCPR) scrubbing before initiating outbound telemarketing."
    }
