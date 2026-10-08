"""
backend/app/services/support_ticket_service.py

Support Tickets System with Predefined CFU (Call Forwarding Unconditional) Workflows & SLA Tracking.
Implements Master Plan Section 18.15 Item 12.

Key Features:
1. Predefined CFU Carrier Instructions & Dial Codes:
   - India: Airtel (*21*<target>#), Jio (*401*<target>), Vi (*21*<target>#), BSNL (*21*<target>#)
   - US/Global: AT&T, Verizon, T-Mobile, Generic GSM (*21*), Generic CDMA (*72)
2. Automated SLA Management:
   - Dynamic SLA calculation (Urgent/CFU: 4h, High: 8h, Medium: 24h, Low: 48h)
   - Real-time SLA breach & escalation status evaluation.
3. Automated CFU Verification Workflow:
   - Step 1: Customer submits CFU request (source phone, carrier, target virtual number).
   - Step 2: System generates carrier dialing instructions & dial code.
   - Step 3: Test call verification dispatch and status tracking.
   - Step 4: Verification sign-off and ticket resolution.
4. Admin Triage Queue:
   - Real-time triage sorted by SLA urgency.
   - Admin operator assignment.
5. Multi-Tenant Security:
   - Strict organization isolation across all ticket queries and mutations.
"""

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from database import supabase_admin

logger = logging.getLogger("SupportTicketService")

# Allowed ticket categories
ALLOWED_CATEGORIES = (
    "cfu_forwarding",
    "number_porting",
    "agent_issue",
    "billing",
    "feature_request",
    "bug_report",
    "general",
    "account",
    "onboarding",
)

# Allowed ticket priorities
ALLOWED_PRIORITIES = ("low", "medium", "high", "urgent")

# SLA Windows in hours
SLA_HOURS = {
    "urgent": 4,
    "high": 8,
    "medium": 24,
    "low": 48,
}

# Carrier CFU Dial Code Templates
# Format keys are lowercase normalized strings
CFU_CARRIER_PROFILES: Dict[str, Dict[str, str]] = {
    "jio": {
        "carrier_name": "Reliance Jio",
        "activate_code": "*401*{target}",
        "deactivate_code": "*402",
        "instructions": "Dial *401*{target} from your Jio phone and wait for the confirmation prompt.",
        "region": "IN",
    },
    "airtel": {
        "carrier_name": "Bharti Airtel",
        "activate_code": "*21*{target}#",
        "deactivate_code": "##21#",
        "instructions": "Dial *21*{target}# from your Airtel phone and press Call. You will see an MMI confirmation screen.",
        "region": "IN",
    },
    "vi": {
        "carrier_name": "Vodafone Idea (Vi)",
        "activate_code": "*21*{target}#",
        "deactivate_code": "##21#",
        "instructions": "Dial *21*{target}# from your Vi phone and press Call. Wait for the Call Forwarding Registration Successful prompt.",
        "region": "IN",
    },
    "bsnl": {
        "carrier_name": "BSNL",
        "activate_code": "*21*{target}#",
        "deactivate_code": "##21#",
        "instructions": "Dial *21*{target}# from your BSNL phone and press Call.",
        "region": "IN",
    },
    "verizon": {
        "carrier_name": "Verizon Wireless",
        "activate_code": "*72{target}",
        "deactivate_code": "*73",
        "instructions": "Dial *72 followed immediately by {target}, press Send, and wait for confirmation tones or message.",
        "region": "US",
    },
    "att": {
        "carrier_name": "AT&T Wireless",
        "activate_code": "*21*{target}#",
        "deactivate_code": "#21#",
        "instructions": "Dial *21*{target}# and press Call to activate unconditional forwarding.",
        "region": "US",
    },
    "tmobile": {
        "carrier_name": "T-Mobile",
        "activate_code": "**21*{target}#",
        "deactivate_code": "##21#",
        "instructions": "Dial **21*{target}# and press Send. You will receive an on-screen confirmation message.",
        "region": "US",
    },
    "generic_gsm": {
        "carrier_name": "Standard GSM Carrier",
        "activate_code": "*21*{target}#",
        "deactivate_code": "##21#",
        "instructions": "Dial *21*{target}# from your mobile handset and press Send.",
        "region": "GLOBAL",
    },
    "generic_cdma": {
        "carrier_name": "Standard CDMA / Landline",
        "activate_code": "*72{target}",
        "deactivate_code": "*73",
        "instructions": "Dial *72 followed by {target} and listen for confirmation tones.",
        "region": "GLOBAL",
    },
}


class SupportTicketService:
    """Service managing customer support tickets, CFU forwarding setups, and admin triage."""

    def __init__(self, supabase_client=None):
        self.supabase = supabase_client or supabase_admin

    # -------------------------------------------------------------------------
    # 1. Carrier Dial Code Generator
    # -------------------------------------------------------------------------
    @staticmethod
    def resolve_cfu_instructions(carrier: str, target_number: str) -> Dict[str, str]:
        """
        Resolves standardized carrier-specific MMI/USSD codes for CFU (Call Forwarding Unconditional).
        """
        cleaned_target = re.sub(r"[^\d+]", "", target_number.strip())
        norm_carrier = carrier.strip().lower().replace(" ", "").replace("-", "").replace("&", "")

        aliases = {
            "jio": "jio",
            "reliance": "jio",
            "airtel": "airtel",
            "bharti": "airtel",
            "vodafone": "vi",
            "idea": "vi",
            "vi": "vi",
            "bsnl": "bsnl",
            "verizon": "verizon",
            "att": "att",
            "tmobile": "tmobile",
        }

        profile = None
        for alias, profile_key in aliases.items():
            if alias in norm_carrier:
                profile = CFU_CARRIER_PROFILES[profile_key]
                break

        if not profile:
            # Fallback to standard GSM or US style
            if cleaned_target.startswith("+1"):
                profile = CFU_CARRIER_PROFILES["generic_cdma"]
            else:
                profile = CFU_CARRIER_PROFILES["generic_gsm"]

        activate_code = profile["activate_code"].format(target=cleaned_target)
        deactivate_code = profile["deactivate_code"]
        instructions = profile["instructions"].format(target=cleaned_target)

        return {
            "carrier_name": profile["carrier_name"],
            "target_number": cleaned_target,
            "activate_code": activate_code,
            "deactivate_code": deactivate_code,
            "instructions": instructions,
        }

    # -------------------------------------------------------------------------
    # 2. SLA Management Helpers
    # -------------------------------------------------------------------------
    @staticmethod
    def calculate_sla_due_at(priority: str) -> str:
        """Calculates SLA deadline based on ticket priority."""
        norm_priority = priority.lower()
        hours = SLA_HOURS.get(norm_priority, 24)
        due_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        return due_at.isoformat()

    @staticmethod
    def evaluate_sla_status(sla_due_at_str: Optional[str], ticket_status: str) -> str:
        """
        Evaluates SLA health: 'within_sla', 'escalated' (<= 2 hours remaining), or 'breached'.
        """
        if ticket_status in ("resolved", "closed") or not sla_due_at_str:
            return "within_sla"

        try:
            due_at = datetime.fromisoformat(sla_due_at_str.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            remaining_seconds = (due_at - now).total_seconds()

            if remaining_seconds < 0:
                return "breached"
            elif remaining_seconds <= 7200:  # <= 2 hours
                return "escalated"
            else:
                return "within_sla"
        except Exception:
            return "within_sla"

    # -------------------------------------------------------------------------
    # 3. CFU Specialized Ticket Creation
    # -------------------------------------------------------------------------
    def create_cfu_ticket(
        self,
        organization_id: str,
        submitted_by: Optional[str],
        source_number: str,
        carrier: str,
        forward_to_number: str,
        notes: Optional[str] = None,
        priority: str = "urgent",
    ) -> Dict[str, Any]:
        """
        Creates a specialized Call Forwarding Unconditional (CFU) support ticket
        with carrier-tailored dial code instructions and automated SLA deadline.
        """
        if not source_number or not carrier or not forward_to_number:
            raise ValueError("source_number, carrier, and forward_to_number are required for CFU tickets.")
        if not organization_id:
            raise ValueError("organization_id is required.")

        cfu_info = self.resolve_cfu_instructions(carrier, forward_to_number)
        now_iso = datetime.now(timezone.utc).isoformat()
        sla_due_at = self.calculate_sla_due_at(priority)
        ticket_number = f"CFU-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

        initial_system_message = {
            "sender": "system",
            "sender_name": "Vaakriti Telephony Automation",
            "message": (
                f"Call Forwarding Unconditional (CFU) Request Generated.\n\n"
                f"Carrier: {cfu_info['carrier_name']}\n"
                f"Source Business Number: {source_number}\n"
                f"Forward-To AI Number: {cfu_info['target_number']}\n\n"
                f"Action Required:\n"
                f"1. Dial the activation code on your phone: {cfu_info['activate_code']}\n"
                f"2. {cfu_info['instructions']}\n"
                f"3. Once dialed, click 'Verify Forwarding' to initiate an automated test call.\n\n"
                f"To cancel forwarding in the future, dial: {cfu_info['deactivate_code']}"
            ),
            "timestamp": now_iso,
        }

        messages = [initial_system_message]
        if notes and notes.strip():
            messages.append({
                "sender": "client",
                "sender_name": "Customer Note",
                "message": notes.strip(),
                "timestamp": now_iso,
            })

        ticket_record = {
            "ticket_number": ticket_number,
            "organization_id": organization_id,
            "submitted_by": submitted_by,
            "subject": f"CFU Setup: {source_number} -> {forward_to_number} ({cfu_info['carrier_name']})",
            "category": "cfu_forwarding",
            "priority": priority,
            "status": "open",
            "cfu_source_number": source_number.strip(),
            "cfu_carrier": carrier.strip(),
            "cfu_forward_to_number": forward_to_number.strip(),
            "cfu_dial_code": cfu_info["activate_code"],
            "cfu_verification_status": "dial_code_shared",
            "sla_due_at": sla_due_at,
            "sla_status": "within_sla",
            "messages": messages,
            "archived": False,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        res = self.supabase.table("support_tickets").insert(ticket_record).execute()
        created = res.data[0] if res.data else ticket_record
        created["cfu_instructions"] = cfu_info
        return created

    # -------------------------------------------------------------------------
    # 4. Standard Ticket Creation
    # -------------------------------------------------------------------------
    def create_ticket(
        self,
        organization_id: str,
        submitted_by: Optional[str],
        subject: str,
        category: str,
        priority: str,
        message: str,
        sender_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a standard support ticket with SLA tracking."""
        if not subject or not category or not message:
            raise ValueError("subject, category, and message are required.")
        if not organization_id:
            raise ValueError("organization_id is required.")

        norm_category = category.lower().replace(" ", "_")
        norm_priority = priority.lower()

        if norm_category not in ALLOWED_CATEGORIES:
            raise ValueError(f"Invalid category '{norm_category}'. Allowed: {ALLOWED_CATEGORIES}")
        if norm_priority not in ALLOWED_PRIORITIES:
            raise ValueError(f"Invalid priority '{norm_priority}'. Allowed: {ALLOWED_PRIORITIES}")

        now_iso = datetime.now(timezone.utc).isoformat()
        sla_due_at = self.calculate_sla_due_at(norm_priority)
        ticket_number = f"TCK-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

        first_message = {
            "sender": "client",
            "sender_name": sender_name or "Client Member",
            "message": message.strip(),
            "timestamp": now_iso,
        }

        ticket_record = {
            "ticket_number": ticket_number,
            "organization_id": organization_id,
            "submitted_by": submitted_by,
            "subject": subject.strip(),
            "category": norm_category,
            "priority": norm_priority,
            "status": "open",
            "sla_due_at": sla_due_at,
            "sla_status": "within_sla",
            "messages": [first_message],
            "archived": False,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        res = self.supabase.table("support_tickets").insert(ticket_record).execute()
        return res.data[0] if res.data else ticket_record

    # -------------------------------------------------------------------------
    # 5. CFU Test Call Verification Workflow
    # -------------------------------------------------------------------------
    def trigger_cfu_test_call(
        self,
        ticket_id: str,
        organization_id: str,
    ) -> Dict[str, Any]:
        """
        Dispatches test call verification for a CFU ticket.
        Transitions cfu_verification_status to 'test_call_pending'.
        """
        ticket = self.get_ticket(ticket_id, organization_id)
        if ticket.get("category") != "cfu_forwarding":
            raise ValueError("Test call verification is only applicable to CFU forwarding tickets.")

        now_iso = datetime.now(timezone.utc).isoformat()
        test_call_msg = {
            "sender": "system",
            "sender_name": "Vaakriti Telephony Verification Bot",
            "message": (
                f"Automated CFU test call initiated to {ticket.get('cfu_source_number')}.\n"
                f"We are validating whether calls route properly to {ticket.get('cfu_forward_to_number')}."
            ),
            "timestamp": now_iso,
        }

        messages = ticket.get("messages") or []
        messages.append(test_call_msg)

        update_payload = {
            "cfu_verification_status": "test_call_pending",
            "status": "in_progress",
            "messages": messages,
            "updated_at": now_iso,
        }

        self.supabase.table("support_tickets").update(update_payload).eq("id", ticket_id).execute()
        ticket.update(update_payload)
        return {
            "ticket_id": ticket_id,
            "cfu_verification_status": "test_call_pending",
            "message": f"Test call dispatched to {ticket.get('cfu_source_number')}.",
        }

    def confirm_cfu_verification(
        self,
        ticket_id: str,
        organization_id: str,
        verified: bool,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Marks CFU verification as verified (success) or failed.
        If verified, marks ticket status as 'resolved'.
        """
        ticket = self.get_ticket(ticket_id, organization_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        cfu_status = "verified" if verified else "failed"
        ticket_status = "resolved" if verified else "waiting_on_client"

        resolution_msg = {
            "sender": "system",
            "sender_name": "Vaakriti Verification Bot",
            "message": (
                f"CFU Verification Result: {'SUCCESS - Call forwarding confirmed!' if verified else 'FAILED - Test call did not reach target virtual number.'}\n"
                f"{notes or ''}"
            ),
            "timestamp": now_iso,
        }

        messages = ticket.get("messages") or []
        messages.append(resolution_msg)

        update_payload = {
            "cfu_verification_status": cfu_status,
            "status": ticket_status,
            "resolved_at": now_iso if verified else None,
            "messages": messages,
            "updated_at": now_iso,
        }

        self.supabase.table("support_tickets").update(update_payload).eq("id", ticket_id).execute()
        ticket.update(update_payload)
        return {
            "ticket_id": ticket_id,
            "cfu_verification_status": cfu_status,
            "status": ticket_status,
            "resolved_at": update_payload["resolved_at"],
        }

    # -------------------------------------------------------------------------
    # 6. Ticket Conversation & Reply
    # -------------------------------------------------------------------------
    def add_reply(
        self,
        ticket_id: str,
        organization_id: str,
        sender_role: str,
        sender_name: str,
        message: str,
    ) -> Dict[str, Any]:
        """Appends a new reply to the ticket message thread."""
        ticket = self.get_ticket(ticket_id, organization_id)
        if not message or not message.strip():
            raise ValueError("Reply message cannot be empty.")

        now_iso = datetime.now(timezone.utc).isoformat()
        reply_entry = {
            "sender": sender_role,
            "sender_name": sender_name,
            "message": message.strip(),
            "timestamp": now_iso,
        }

        messages = ticket.get("messages") or []
        messages.append(reply_entry)

        # Status transition logic
        new_status = ticket.get("status")
        if sender_role in ("admin", "super_admin"):
            new_status = "waiting_on_client"
        elif sender_role == "client" and new_status == "waiting_on_client":
            new_status = "in_progress"

        update_payload = {
            "messages": messages,
            "status": new_status,
            "updated_at": now_iso,
        }

        self.supabase.table("support_tickets").update(update_payload).eq("id", ticket_id).execute()
        return {
            "ticket_id": ticket_id,
            "reply": reply_entry,
            "status": new_status,
        }

    # -------------------------------------------------------------------------
    # 7. Ticket Queries & Multi-Tenant Boundaries
    # -------------------------------------------------------------------------
    def get_ticket(self, ticket_id: str, organization_id: str) -> Dict[str, Any]:
        """Retrieves ticket details with strict organization boundary validation."""
        res = (
            self.supabase.table("support_tickets")
            .select("*")
            .eq("id", ticket_id)
            .eq("organization_id", organization_id)
            .execute()
        )
        if not res.data or len(res.data) == 0:
            raise PermissionError(f"Support ticket {ticket_id} not found or tenant boundary violation.")

        ticket = res.data[0]
        # Dynamically attach live SLA health
        ticket["sla_status"] = self.evaluate_sla_status(ticket.get("sla_due_at"), ticket.get("status"))
        return ticket

    def list_organization_tickets(
        self,
        organization_id: str,
        status: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Lists support tickets for a specific tenant organization."""
        query = self.supabase.table("support_tickets").select("*").eq("organization_id", organization_id)

        if status and status != "all":
            query = query.eq("status", status)
        if category and category != "all":
            query = query.eq("category", category)

        res = query.execute()
        items = res.data or []
        for t in items:
            t["sla_status"] = self.evaluate_sla_status(t.get("sla_due_at"), t.get("status"))
        return items

    # -------------------------------------------------------------------------
    # 8. Admin Triage Queue & Assignment
    # -------------------------------------------------------------------------
    def get_admin_triage_queue(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        category: Optional[str] = None,
        only_sla_breached: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Global admin triage queue providing SLA health, priority ordering, and queue filters.
        Accessible only by admin / super_admin roles.
        """
        query = self.supabase.table("support_tickets").select("*")

        if status and status != "all":
            query = query.eq("status", status)
        if priority and priority != "all":
            query = query.eq("priority", priority)
        if category and category != "all":
            query = query.eq("category", category)

        res = query.execute()
        tickets = res.data or []

        # Decorate each ticket with live evaluated SLA status
        evaluated = []
        for t in tickets:
            t["sla_status"] = self.evaluate_sla_status(t.get("sla_due_at"), t.get("status"))
            if only_sla_breached and t["sla_status"] != "breached":
                continue
            evaluated.append(t)

        # Sort by SLA urgency: breached first, then escalated, then within_sla
        priority_rank = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        sla_rank = {"breached": 0, "escalated": 1, "within_sla": 2}

        evaluated.sort(
            key=lambda x: (
                sla_rank.get(x.get("sla_status", "within_sla"), 2),
                priority_rank.get(x.get("priority", "medium"), 2),
                x.get("sla_due_at") or "",
            )
        )
        return evaluated

    def assign_ticket_admin(
        self,
        ticket_id: str,
        admin_id: Optional[str],
    ) -> Dict[str, Any]:
        """Assigns an admin operator to a support ticket."""
        now_iso = datetime.now(timezone.utc).isoformat()
        res = (
            self.supabase.table("support_tickets")
            .update({
                "assigned_admin_id": admin_id,
                "updated_at": now_iso,
            })
            .eq("id", ticket_id)
            .execute()
        )
        return res.data[0] if res.data else {"id": ticket_id, "assigned_admin_id": admin_id}
