"""
backend/app/services/role_policy_service.py

Centralized Role and Exemption Policy Engine for Trinetra AI.
Implements Master Plan Section 18.3 & 18.4 (Authoritative Overrides).

Core Mandates:
1. Three Canonical Roles: customer, developer_tester, admin.
2. Central Exemption Policy Function (can_exempt / is_exempt_from_business_limits).
3. Non-Exemptible Primitives (AI disclosure, call recording notice, PII redaction,
   audit logs, MFA, statutory curfew, DND scrubbing) can NEVER be bypassed by any role.
4. developer_tester accounts are strictly excluded from business revenue, MRR/ARR,
   and statutory compliance metrics.
5. developer_tester accounts cannot view or download customer KYC documents.
6. Admin idle timeout is 30 minutes; step-up re-authentication required for
   KYC view, wallet adjustments, price changes, and credentials.
7. Sandbox numbers (labeled TEST) can only be used in test flows, never in customer flows.
"""

from enum import Enum
from typing import Dict, Any, Optional, Tuple, Set


class UserRole(str, Enum):
    CUSTOMER = "customer"
    DEVELOPER_TESTER = "developer_tester"
    ADMIN = "admin"


# Primitives that can NEVER be exempted or bypassed by any role under any circumstance
NON_EXEMPTIBLE_PRIMITIVES: Set[str] = frozenset({
    "ai_disclosure",
    "call_recording_notice",
    "pii_redaction",
    "audit_logging",
    "mfa_requirement",
    "statutory_curfew",    # TRAI 09:00 - 21:00 calling hours floor
    "dnd_scrubbing",       # National & internal DND registry scrubbing
})

# Business limits that developer_tester and admin are permitted to bypass for verification
EXEMPTIBLE_BUSINESS_LIMITS: Set[str] = frozenset({
    "agent_creation_limit",
    "phone_number_claim_limit",
    "call_concurrency_limit",
    "monthly_minutes_quota",
    "trial_period_expiry",
    "wallet_balance_zero_block",
})

# Privileged administrative actions requiring explicit step-up re-authentication
STEP_UP_REAUTH_ACTIONS: Set[str] = frozenset({
    "kyc_view",
    "wallet_adjust",
    "price_change",
    "role_change",
    "credential_update",
    "number_release_override",
})


def normalize_role(role_raw: Optional[str]) -> UserRole:
    """
    Normalizes database/session role strings into the 3 canonical roles:
    - customer (maps legacy 'client')
    - developer_tester
    - admin (maps legacy 'super_admin')
    """
    if not role_raw:
        return UserRole.CUSTOMER
    
    clean = str(role_raw).strip().lower()
    if clean in ("developer_tester", "dev_test", "tester"):
        return UserRole.DEVELOPER_TESTER
    elif clean in ("admin", "super_admin"):
        return UserRole.ADMIN
    elif clean in ("customer", "client", "user"):
        return UserRole.CUSTOMER
    
    return UserRole.CUSTOMER


def can_exempt_primitive(role_raw: Optional[str], primitive: str) -> bool:
    """
    Checks if a role can bypass a security or compliance primitive.
    ALWAYS returns False for any primitive in NON_EXEMPTIBLE_PRIMITIVES.
    """
    p_clean = primitive.strip().lower()
    if p_clean in NON_EXEMPTIBLE_PRIMITIVES:
        return False
    return False


def can_exempt(role_raw: Optional[str], limit_or_primitive: str) -> Dict[str, Any]:
    """
    Central Exemption Policy Function.
    Single source of truth evaluating permission to bypass a limit or rule.
    """
    role = normalize_role(role_raw)
    key = limit_or_primitive.strip().lower()

    # 1. Non-exemptible security and compliance primitives: STRICT NEVER
    if key in NON_EXEMPTIBLE_PRIMITIVES:
        return {
            "exempt": False,
            "role": role.value,
            "key": key,
            "reason": "Security, disclosure, PII redaction, audit logs, and statutory compliance primitives can NEVER be bypassed by any role."
        }

    # 2. Business limits: exempt for developer_tester and admin
    if key in EXEMPTIBLE_BUSINESS_LIMITS:
        if role in (UserRole.DEVELOPER_TESTER, UserRole.ADMIN):
            return {
                "exempt": True,
                "role": role.value,
                "key": key,
                "reason": f"Role '{role.value}' is exempt from business limit '{key}' for testing and verification."
            }
        else:
            return {
                "exempt": False,
                "role": role.value,
                "key": key,
                "reason": f"Customer accounts are subject to standard business limit '{key}'."
            }

    # 3. Default fallback: deny
    return {
        "exempt": False,
        "role": role.value,
        "key": key,
        "reason": f"Unknown or unexemptible rule key: '{key}'."
    }


def is_exempt_from_business_limits(role_raw: Optional[str], limit_key: str) -> bool:
    """Convenience boolean helper for business limit exemptions."""
    return can_exempt(role_raw, limit_key)["exempt"]


def can_view_kyc_documents(role_raw: Optional[str]) -> bool:
    """
    KYC Document Viewing Permission.
    developer_tester accounts are strictly forbidden from viewing or downloading customer KYC documents.
    Admin accounts are permitted (subject to step-up re-authentication).
    Customer accounts can only view their own submitted documents.
    """
    role = normalize_role(role_raw)
    # Developer/tester CANNOT view KYC documents under Section 18.4
    if role == UserRole.DEVELOPER_TESTER:
        return False
    # Admin can view
    if role == UserRole.ADMIN:
        return True
    return False


def is_account_excluded_from_metrics(role_raw: Optional[str]) -> bool:
    """
    Determines if account activity should be filtered out of business analytics.
    developer_tester accounts are programmatically excluded from:
    - Revenue metrics (MRR, ARR, deals won)
    - Production call volume analytics
    - Statutory compliance statistics
    """
    role = normalize_role(role_raw)
    return role == UserRole.DEVELOPER_TESTER


def validate_number_for_flow(
    number_metadata: Dict[str, Any],
    flow_type: str,
    user_role: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Sandbox Number Flow Validator.
    A 'sandbox' flag exists only for admin-added test numbers, labeled TEST,
    unusable in customer flows. Real numbers never go live without provider KYC.
    """
    is_sandbox = bool(
        number_metadata.get("is_sandbox") is True
        or str(number_metadata.get("label", "")).strip().upper() == "TEST"
        or str(number_metadata.get("sandbox_label", "")).strip().upper() == "TEST"
    )

    flow = flow_type.strip().lower()

    if is_sandbox:
        if flow in ("customer_campaign", "customer_live", "production_dialer", "customer_inbound"):
            return False, "Sandbox test numbers (labeled TEST) are strictly prohibited from customer-facing live campaign flows."
        return True, None

    # For non-sandbox (real) numbers:
    # If customer flow, ensure KYC is satisfied
    kyc_status = str(number_metadata.get("kyc_status", "verified")).lower()
    if flow in ("customer_campaign", "customer_live") and kyc_status in ("pending", "rejected", "missing"):
        return False, "Real numbers cannot be activated in live customer flows without verified provider KYC."

    return True, None


def requires_step_up_reauth(action: str) -> bool:
    """Returns True if the administrative action requires step-up MFA/password re-authentication."""
    return action.strip().lower() in STEP_UP_REAUTH_ACTIONS


def get_admin_session_timeout_seconds() -> int:
    """Returns admin idle session timeout: 30 minutes (1800 seconds)."""
    return 1800
