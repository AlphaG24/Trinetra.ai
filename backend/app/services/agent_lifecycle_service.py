"""
backend/app/services/agent_lifecycle_service.py

Agent Lifecycle & 3-Tier Quota Expiration Engine (Phase 4).
Enforces:
1. 3-Tier Usage Check:
   - Tier 1: Agent / Plan Quota Minutes
   - Tier 2: Buffer Overdraft Minutes
   - Tier 3: Prepaid Wallet Balance
2. Agent Expiration:
   - Agent expires only when all 3 tiers are exhausted, or validity expires with 0 quota left.
   - Mid-call is never terminated (Zero In-Call Cuts).
3. Number Dissociation:
   - Expired agents immediately exclude and unlink phone numbers (unless time expired but quota minutes remain).
4. 30-Day Purge Rule:
   - If an agent remains expired for > 30 days without renewal, automatically delete it from user dashboard.
5. In-App & Multi-Channel User Notifications.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from database import supabase_admin

logger = logging.getLogger("AgentLifecycleService")

PURGE_THRESHOLD_DAYS = 30


class AgentLifecycleService:
    """Manages agent tier lifecycles, expiration checks, and 30-day purge rules."""

    def __init__(self, supabase_client=None):
        self.supabase = supabase_client or supabase_admin

    def evaluate_agent_operational_state(self, agent_id: str) -> Dict[str, Any]:
        """
        Evaluates whether an agent is active, expired, or eligible for 30-day purge.
        Respects the 3-tier exhaustion hierarchy:
        Tier 1: Quota minutes
        Tier 2: Buffer minutes (emergency minutes)
        Tier 3: Prepaid wallet balance
        """
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        res = self.supabase.table("agents").select("*").eq("id", agent_id).limit(1).execute()
        if not res.data or len(res.data) == 0:
            raise ValueError(f"Agent {agent_id} not found.")

        agent = res.data[0]
        status = agent.get("status", "active")
        config = agent.get("config", {}) or {}
        org_id = agent.get("organization_id")
        user_id = agent.get("user_id")

        # 1. Check if already purged
        if status == "deleted":
            return {"agent_id": agent_id, "status": "deleted", "can_call": False}

        # 2. Check 30-Day Purge for already-expired agents
        if status == "expired":
            expired_at_str = agent.get("expired_at") or agent.get("updated_at")
            if expired_at_str:
                try:
                    expired_dt = datetime.fromisoformat(expired_at_str.replace("Z", "+00:00"))
                    days_expired = (now - expired_dt).days
                    if days_expired >= PURGE_THRESHOLD_DAYS:
                        return self.purge_expired_agent(agent_id, days_expired=days_expired)
                except Exception as e:
                    logger.warning(f"Error parsing expired_at for agent {agent_id}: {e}")

            return {
                "agent_id": agent_id,
                "status": "expired",
                "can_call": False,
                "message": "Agent is expired and requires renewal.",
            }

        # 3. Check Validity Dates (trial_ends_at or valid_until)
        validity_expired = False
        valid_until_str = config.get("valid_until") or config.get("trial_ends_at")
        if valid_until_str:
            try:
                valid_dt = datetime.fromisoformat(valid_until_str.replace("Z", "+00:00"))
                if now >= valid_dt:
                    validity_expired = True
            except Exception:
                pass

        # 4. Check 3-Tier Quota & Reserves
        quota_remaining = agent.get("quota_minutes_remaining")
        if quota_remaining is None:
            limit = agent.get("minutes_limit", 0) or config.get("minutes_limit", 0) or 0
            used = agent.get("minutes_used", 0) or 0
            quota_remaining = max(0, limit - used)

        emergency_minutes = 0
        wallet_balance = 0
        if org_id:
            try:
                w_res = self.supabase.table("wallets").select("emergency_minutes_available, balance_paisa").eq("organization_id", org_id).limit(1).execute()
                if w_res.data and len(w_res.data) > 0:
                    emergency_minutes = w_res.data[0].get("emergency_minutes_available", 0) or 0
                    wallet_balance = w_res.data[0].get("balance_paisa", 0) or 0
            except Exception as we:
                logger.debug(f"Wallet check note for org {org_id}: {we}")

        has_quota = quota_remaining > 0
        has_buffer = emergency_minutes > 0
        has_wallet = wallet_balance > 0

        # Rule 5: If agent's time has expired but still quota minutes left, keep connected
        if validity_expired and not has_quota and not has_buffer and not has_wallet:
            return self.expire_agent(agent_id, reason="Validity period ended and all quotas/reserves exhausted.")

        # If quota, buffer, and wallet are ALL exhausted, expire agent
        if not has_quota and not has_buffer and not has_wallet:
            return self.expire_agent(agent_id, reason="Call quota, overdraft buffer, and wallet balance exhausted.")

        return {
            "agent_id": agent_id,
            "status": status,
            "can_call": True,
            "quota_remaining": quota_remaining,
            "buffer_minutes": emergency_minutes,
            "wallet_balance_paisa": wallet_balance,
            "validity_expired": validity_expired,
        }

    def expire_agent(self, agent_id: str, reason: str = "Plan quota or validity exhausted") -> Dict[str, Any]:
        """
        Transitions an agent to 'expired'.
        Rule 4: Immediately unlinks phone numbers from the agent so it cannot be used further.
        """
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        res = self.supabase.table("agents").select("*").eq("id", agent_id).limit(1).execute()
        if not res.data or len(res.data) == 0:
            raise ValueError(f"Agent {agent_id} not found.")

        agent = res.data[0]
        agent_name = agent.get("name", "Voice Agent")
        user_id = agent.get("user_id")
        org_id = agent.get("organization_id")
        phone_number = agent.get("phone_number")

        # 1. Update agents table to expired
        self.supabase.table("agents").update({
            "status": "expired",
            "expired_at": now_iso,
            "phone_number": None,
            "telephony_provider": "simulated",
            "updated_at": now_iso,
        }).eq("id", agent_id).execute()

        # 2. Rule 4: Unlink from agent_phone_numbers junction table
        try:
            self.supabase.table("agent_phone_numbers").delete().eq("agent_id", agent_id).execute()
        except Exception as e:
            logger.warning(f"Error unlinking agent_phone_numbers for expired agent {agent_id}: {e}")

        # 3. Update phone_numbers table to unassigned
        if phone_number:
            try:
                self.supabase.table("phone_numbers").update({
                    "is_assigned": False,
                    "assigned_agent_id": None,
                    "updated_at": now_iso,
                }).eq("assigned_agent_id", agent_id).execute()
            except Exception as e:
                logger.warning(f"Error unassigning phone_numbers for agent {agent_id}: {e}")

        # 4. In-App Notification
        if user_id:
            try:
                self.supabase.table("notifications").insert({
                    "user_id": user_id,
                    "title": f"Agent '{agent_name}' Expired",
                    "message": (
                        f"Your AI agent '{agent_name}' has expired ({reason}). "
                        "The virtual phone line has been unlinked to prevent failed customer calls. "
                        "Please renew your agent plan or quota within 30 days."
                    ),
                    "type": "warning",
                    "action_url": "/dashboard/billing",
                    "action_label": "Renew Agent Plan",
                    "is_read": False,
                    "created_at": now_iso,
                }).execute()
            except Exception as ne:
                logger.warning(f"Error sending agent expiration notification: {ne}")

        logger.info(f"Agent {agent_id} ({agent_name}) transitioned to expired. Phone lines revoked.")
        return {
            "agent_id": agent_id,
            "status": "expired",
            "expired_at": now_iso,
            "can_call": False,
            "reason": reason,
        }

    def purge_expired_agent(self, agent_id: str, days_expired: int) -> Dict[str, Any]:
        """
        Rule: If user didn't renew agent for > 30 days, purge/delete from dashboard.
        Sets status = 'deleted'.
        """
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        res = self.supabase.table("agents").select("id, name, user_id, organization_id").eq("id", agent_id).limit(1).execute()
        agent = res.data[0] if res.data else {"name": "Agent", "user_id": None}
        agent_name = agent.get("name", "Voice Agent")
        user_id = agent.get("user_id")

        # 1. Soft-delete agent from dashboard
        self.supabase.table("agents").update({
            "status": "deleted",
            "deleted_at": now_iso,
            "phone_number": None,
            "updated_at": now_iso,
        }).eq("id", agent_id).execute()

        # 2. Clean junction records
        try:
            self.supabase.table("agent_phone_numbers").delete().eq("agent_id", agent_id).execute()
        except Exception:
            pass

        # 3. Notification to tenant
        if user_id:
            try:
                self.supabase.table("notifications").insert({
                    "user_id": user_id,
                    "title": f"Agent '{agent_name}' Purged After 30 Days",
                    "message": (
                        f"Agent '{agent_name}' was automatically removed from your active dashboard "
                        f"after remaining expired for {days_expired} days without renewal."
                    ),
                    "type": "error",
                    "action_url": "/dashboard/agents",
                    "action_label": "View Agents",
                    "is_read": False,
                    "created_at": now_iso,
                }).execute()
            except Exception as e:
                logger.warning(f"Error inserting purge notification: {e}")

        logger.info(f"Agent {agent_id} purged after {days_expired} days expired.")
        return {
            "agent_id": agent_id,
            "status": "deleted",
            "purged": True,
            "days_expired": days_expired,
        }

    def sweep_all_agents(self) -> Dict[str, Any]:
        """
        Automated sweep routine to check expiration and 30-day purge across all non-deleted agents.
        """
        now = datetime.now(timezone.utc)
        res = self.supabase.table("agents").select("id, status, expired_at, updated_at").neq("status", "deleted").execute()
        agents = res.data or []

        expired_count = 0
        purged_count = 0

        for a in agents:
            aid = a["id"]
            st = a.get("status")
            if st == "expired":
                exp_str = a.get("expired_at") or a.get("updated_at")
                if exp_str:
                    try:
                        exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
                        if (now - exp_dt).days >= PURGE_THRESHOLD_DAYS:
                            self.purge_expired_agent(aid, (now - exp_dt).days)
                            purged_count += 1
                    except Exception:
                        pass
            elif st == "active":
                eval_res = self.evaluate_agent_operational_state(aid)
                if eval_res.get("status") == "expired":
                    expired_count += 1

        return {
            "total_checked": len(agents),
            "expired_count": expired_count,
            "purged_count": purged_count,
            "checked_at": now.isoformat(),
        }

