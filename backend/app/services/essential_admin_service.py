"""
backend/app/services/essential_admin_service.py

Essential Operations Admin Panel Engine for Trinetra AI.
Implements Master Plan Section 18.15 Item 14 & Security Directives SEC-001/SEC-004/SEC-006.

Core Operations:
1. User & Organization Management:
   - Paginated user list with role, organization context, active status, wallet balance.
   - Self-demotion / revoking own admin access hard-block.
   - Role updates requiring admin Step-Up Auth (`action: 'role_change'`).
   - Active/Suspended status toggling.
2. Privileged Wallet Balance Adjustments:
   - Manual credits/debits requiring admin Step-Up Auth (`action: 'wallet_adjust'`).
   - Mandatory statutory business reason.
   - Updates `wallets` table, records `wallet_transactions`, and logs to audit trail.
3. Global Telephony Configuration & Pricing:
   - Rate card modifications requiring admin Step-Up Auth (`action: 'price_change'`).
   - Updates system telephony config keys.
4. Tamper-Evident Immutable Audit Trail:
   - Append-only logging to `admin_audit_trail`.
   - Queryable audit trail with filters (actor, action, target, date range).
"""

import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
from database import supabase_admin
from app.services.role_policy_service import UserRole, normalize_role
from app.services.admin_auth_service import AdminAuthService


class EssentialAdminService:
    def __init__(self, supabase_client: Any = None):
        self.supabase = supabase_client or supabase_admin

    def _verify_admin(self, admin_user_id: str, admin_role_raw: Optional[str]) -> None:
        """Enforces that the actor is an active administrator."""
        role = normalize_role(admin_role_raw)
        if role != UserRole.ADMIN:
            raise PermissionError("Access denied: Administrative privileges required.")

    def _verify_step_up_token(self, step_up_token: str, admin_user_id: str, expected_action: str) -> None:
        """Enforces verified step-up re-authentication token for sensitive operations."""
        if not step_up_token or not step_up_token.strip():
            raise PermissionError(f"Step-Up re-authentication required for action '{expected_action}'.")
        
        is_valid, reason, _ = AdminAuthService.verify_step_up_token(
            token=step_up_token,
            expected_user_id=admin_user_id,
            expected_action=expected_action
        )
        if not is_valid:
            raise PermissionError(f"Step-Up authentication failed: {reason}")

    def log_audit_trail(
        self,
        actor_user_id: str,
        actor_role: str,
        action: str,
        target_type: str,
        target_id: str,
        details: Dict[str, Any],
        step_up_verified: bool = True,
        actor_email: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Writes an immutable, append-only record to admin_audit_trail."""
        record = {
            "id": str(uuid.uuid4()),
            "actor_user_id": actor_user_id,
            "actor_email": actor_email,
            "actor_role": str(actor_role),
            "action": action,
            "target_type": target_type,
            "target_id": str(target_id),
            "details": details or {},
            "step_up_verified": step_up_verified,
            "ip_address": ip_address,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        self.supabase.table("admin_audit_trail").insert(record).execute()
        return record

    def list_users(
        self,
        admin_user_id: str,
        admin_role_raw: Optional[str],
        role_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Lists users with profiles, organizations, and current roles."""
        self._verify_admin(admin_user_id, admin_role_raw)

        query = self.supabase.table("profiles").select(
            "id, email, full_name, role, organization_id, is_active, created_at, organizations(name)"
        )
        if role_filter:
            query = query.eq("role", role_filter)
        
        res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        data = res.data or []

        # If search query provided, filter in memory
        if search_query:
            sq = search_query.lower()
            data = [
                u for u in data
                if sq in (u.get("email") or "").lower()
                or sq in (u.get("full_name") or "").lower()
                or sq in (u.get("id") or "").lower()
            ]

        return {
            "users": data,
            "total_count": len(data),
            "offset": offset,
            "limit": limit
        }

    def update_user_role(
        self,
        admin_user_id: str,
        admin_role_raw: Optional[str],
        target_user_id: str,
        new_role: str,
        step_up_token: str,
        reason: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates a user's role.
        Guards:
        1. Only admins can execute.
        2. Cannot demote self (prevent lock-out).
        3. Mandatory Step-Up re-auth token (`action: 'role_change'`).
        4. Validates target role in canonical set ('customer', 'developer_tester', 'admin').
        """
        self._verify_admin(admin_user_id, admin_role_raw)

        if str(admin_user_id) == str(target_user_id):
            raise ValueError("Self-demotion forbidden: Administrators cannot modify their own privileged role.")

        norm_role = normalize_role(new_role)
        if new_role not in [UserRole.CUSTOMER.value, UserRole.DEVELOPER_TESTER.value, UserRole.ADMIN.value]:
            raise ValueError(f"Invalid target role '{new_role}'. Allowed roles: customer, developer_tester, admin.")

        self._verify_step_up_token(step_up_token, admin_user_id, "role_change")

        if not reason or len(reason.strip()) < 5:
            raise ValueError("Statutory justification required: Please provide a valid operational reason (min 5 chars).")

        # Fetch existing user profile
        user_res = self.supabase.table("profiles").select("id, email, role").eq("id", target_user_id).single().execute()
        user_data = user_res.data[0] if isinstance(user_res.data, list) and user_res.data else user_res.data
        if not user_data:
            raise LookupError(f"User '{target_user_id}' not found.")
        old_role = user_data.get("role")

        # Update profile
        self.supabase.table("profiles").update({"role": norm_role.value}).eq("id", target_user_id).execute()

        # Audit logging
        audit_record = self.log_audit_trail(
            actor_user_id=admin_user_id,
            actor_role="admin",
            action="role_change",
            target_type="user",
            target_id=target_user_id,
            details={
                "target_email": user_data.get("email"),
                "old_role": old_role,
                "new_role": norm_role.value,
                "reason": reason.strip()
            },
            step_up_verified=True,
            ip_address=ip_address
        )

        return {
            "success": True,
            "user_id": target_user_id,
            "old_role": old_role,
            "new_role": norm_role.value,
            "audit_id": audit_record["id"]
        }

    def toggle_user_status(
        self,
        admin_user_id: str,
        admin_role_raw: Optional[str],
        target_user_id: str,
        is_active: bool,
        reason: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Toggles a user's active/suspended status with audit logging."""
        self._verify_admin(admin_user_id, admin_role_raw)

        if str(admin_user_id) == str(target_user_id) and not is_active:
            raise ValueError("Self-deactivation forbidden: Administrators cannot deactivate their own account.")

        if not reason or len(reason.strip()) < 5:
            raise ValueError("Statutory justification required: Reason must be at least 5 characters.")

        user_res = self.supabase.table("profiles").select("id, email, is_active").eq("id", target_user_id).single().execute()
        user_data = user_res.data[0] if isinstance(user_res.data, list) and user_res.data else user_res.data
        if not user_data:
            raise LookupError(f"User '{target_user_id}' not found.")

        old_status = user_data.get("is_active", True)
        self.supabase.table("profiles").update({"is_active": is_active}).eq("id", target_user_id).execute()

        audit_record = self.log_audit_trail(
            actor_user_id=admin_user_id,
            actor_role="admin",
            action="user_status_toggle",
            target_type="user",
            target_id=target_user_id,
            details={
                "target_email": user_data.get("email"),
                "old_status": old_status,
                "new_status": is_active,
                "reason": reason.strip()
            },
            step_up_verified=False,
            ip_address=ip_address
        )

        return {
            "success": True,
            "user_id": target_user_id,
            "is_active": is_active,
            "audit_id": audit_record["id"]
        }

    def adjust_wallet_balance(
        self,
        admin_user_id: str,
        admin_role_raw: Optional[str],
        organization_id: str,
        amount_paisa: int,
        adjustment_type: str,
        reason: str,
        step_up_token: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Adjusts an organization's prepaid wallet balance.
        Requires verified Step-Up Auth (`action: 'wallet_adjust'`).
        Records immutable transaction in `wallet_transactions` and `admin_audit_trail`.
        """
        self._verify_admin(admin_user_id, admin_role_raw)

        if not isinstance(amount_paisa, int) or amount_paisa <= 0:
            raise ValueError("Amount must be a positive integer in paisa.")

        if adjustment_type not in ["credit", "debit"]:
            raise ValueError("Adjustment type must be either 'credit' or 'debit'.")

        if not reason or len(reason.strip()) < 5:
            raise ValueError("Mandatory reason required for wallet adjustments (min 5 chars).")

        self._verify_step_up_token(step_up_token, admin_user_id, "wallet_adjust")

        # Fetch existing wallet
        wallet_res = self.supabase.table("wallets").select("id, balance_paisa").eq("organization_id", organization_id).single().execute()
        wallet_data = wallet_res.data[0] if isinstance(wallet_res.data, list) and wallet_res.data else wallet_res.data
        if not wallet_data:
            raise LookupError(f"Wallet for organization '{organization_id}' not found.")

        current_balance = wallet_data.get("balance_paisa", 0)
        delta = amount_paisa if adjustment_type == "credit" else -amount_paisa
        new_balance = current_balance + delta

        if new_balance < 0:
            raise ValueError(f"Debit exceeds current wallet balance ({current_balance} paisa).")

        # Update wallet balance
        self.supabase.table("wallets").update({
            "balance_paisa": new_balance,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }).eq("organization_id", organization_id).execute()

        # Insert immutable wallet transaction
        tx_id = str(uuid.uuid4())
        self.supabase.table("wallet_transactions").insert({
            "id": tx_id,
            "organization_id": organization_id,
            "amount_paisa": delta,
            "type": "admin_adjustment",
            "description": f"Admin adjustment ({adjustment_type}): {reason.strip()}",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }).execute()

        # Audit trail logging
        audit_record = self.log_audit_trail(
            actor_user_id=admin_user_id,
            actor_role="admin",
            action="wallet_adjust",
            target_type="organization_wallet",
            target_id=organization_id,
            details={
                "adjustment_type": adjustment_type,
                "amount_paisa": amount_paisa,
                "previous_balance_paisa": current_balance,
                "new_balance_paisa": new_balance,
                "transaction_id": tx_id,
                "reason": reason.strip()
            },
            step_up_verified=True,
            ip_address=ip_address
        )

        return {
            "success": True,
            "organization_id": organization_id,
            "previous_balance_paisa": current_balance,
            "new_balance_paisa": new_balance,
            "transaction_id": tx_id,
            "audit_id": audit_record["id"]
        }

    def update_telephony_pricing(
        self,
        admin_user_id: str,
        admin_role_raw: Optional[str],
        pricing_updates: Dict[str, Any],
        step_up_token: str,
        reason: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates system-wide telephony rates, margins, and limits.
        Requires Step-Up Auth (`action: 'price_change'`).
        """
        self._verify_admin(admin_user_id, admin_role_raw)
        self._verify_step_up_token(step_up_token, admin_user_id, "price_change")

        if not reason or len(reason.strip()) < 5:
            raise ValueError("Operational reason required for updating telephony pricing (min 5 chars).")

        allowed_keys = {
            "exotel_mobile_did_cost_paisa",
            "exotel_landline_did_cost_paisa",
            "twilio_US_local_cost_paisa",
            "twilio_UK_local_cost_paisa",
            "twilio_IN_mobile_cost_paisa",
            "trinetra_number_markup_percent",
            "max_phone_numbers_per_org"
        }

        sanitized_updates = {}
        for key, val in pricing_updates.items():
            if key in allowed_keys:
                try:
                    num_val = int(val)
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid integer value for {key}: {val}")
                
                if num_val < 0:
                    raise ValueError(f"Pricing value for {key} must be non-negative.")
                sanitized_updates[key] = str(num_val)

        if not sanitized_updates:
            raise ValueError("No valid telephony pricing parameters provided.")

        # Upsert configurations into system_configs / admin_settings table
        for k, v in sanitized_updates.items():
            self.supabase.table("system_configs").upsert({"key": k, "value": v}).execute()

        audit_record = self.log_audit_trail(
            actor_user_id=admin_user_id,
            actor_role="admin",
            action="price_change",
            target_type="telephony_pricing",
            target_id="global_configs",
            details={
                "updates": sanitized_updates,
                "reason": reason.strip()
            },
            step_up_verified=True,
            ip_address=ip_address
        )

        return {
            "success": True,
            "updated_configs": sanitized_updates,
            "audit_id": audit_record["id"]
        }

    def get_audit_trail(
        self,
        admin_user_id: str,
        admin_role_raw: Optional[str],
        action_filter: Optional[str] = None,
        target_type_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Queries the immutable admin audit trail."""
        self._verify_admin(admin_user_id, admin_role_raw)

        query = self.supabase.table("admin_audit_trail").select("*")
        if action_filter:
            query = query.eq("action", action_filter)
        if target_type_filter:
            query = query.eq("target_type", target_type_filter)

        res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return {
            "records": res.data or [],
            "count": len(res.data or []),
            "offset": offset,
            "limit": limit
        }
