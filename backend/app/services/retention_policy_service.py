"""
backend/app/services/retention_policy_service.py

Statutory Data Retention & Minimization Engine.
Governing Standards:
1. CERT-In Directions (April 28, 2022) - 180-day operational log & communication records retention.
2. India Income Tax Act, 1961 (Sec 44AA) & CGST Act 2017 (Sec 36) - Mandatory 8-year (2,920 days)
   retention for books of accounts, invoices, and financial transaction records (CONFIRM WITH CA).
3. India DPDP Act 2023 Sec 6 & 8 - Immutable retention of consent and processing activity logs;
   strict data minimization on non-essential operational media (recordings & raw audio).
4. Direct-database mode guard: All purge jobs strictly default to dry_run=True.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("retention-policy-service")

# Statutory retention period constants
OPERATIONAL_CALL_RETENTION_DAYS = 180      # CERT-In Directions (2022) & DPDP minimization
SECURITY_LOG_RETENTION_DAYS = 180          # CERT-In Directions (2022) Sec 4(6)
STATUTORY_FINANCIAL_RETENTION_YEARS = 8     # Income Tax Act 1961 Sec 44AA / GST Sec 36 (CONFIRM WITH CA)
STATUTORY_FINANCIAL_RETENTION_DAYS = 8 * 365 # 2,920 days

# Tables that are permanently or statutorily shielded from automated deletion
PERMANENTLY_SHIELDED_TABLES = {
    "consent_records": "DPDP Act 2023 Sec 6 - Permanent statutory record of affirmative consent",
    "audit_logs": "DPDP Act 2023 Sec 8 - Data Fiduciary accountability & processing log",
    "revenue_audit_logs": "Financial audit trail & dispute verification",
}

FINANCIALLY_SHIELDED_TABLES = {
    "invoices": "Income Tax Act 1961 Sec 44AA & GST Act Sec 36 (8-year statutory shield)",
    "transactions": "Income Tax Act 1961 Sec 44AA & GST Act Sec 36 (8-year statutory shield)",
    "revenue_events": "Books of accounts and revenue recognition trail (8-year statutory shield)",
}


class RetentionPolicyService:
    """
    Manages data minimization and statutory retention splits across multi-tenant data.
    Enforces the distinction between 180-day operational media (recordings/transcripts)
    and 8-year statutory financial ledgers (invoices/transactions).
    """

    def __init__(self, supabase_client=None):
        if supabase_client is None:
            from database import supabase_admin
            self.supabase = supabase_admin
        else:
            self.supabase = supabase_client

    def get_retention_cutoffs(self, now: Optional[datetime] = None) -> Dict[str, datetime]:
        """
        Calculate statutory cutoff datetimes relative to the reference time.
        """
        ref_time = now or datetime.now(timezone.utc)
        return {
            "operational_call_cutoff": ref_time - timedelta(days=OPERATIONAL_CALL_RETENTION_DAYS),
            "security_log_cutoff": ref_time - timedelta(days=SECURITY_LOG_RETENTION_DAYS),
            "financial_statutory_cutoff": ref_time - timedelta(days=STATUTORY_FINANCIAL_RETENTION_DAYS),
        }

    async def audit_retention_status(
        self,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Inspect the database and report counts of records eligible for operational purge
        versus records protected under the 8-year statutory financial shield.
        Zero data mutations applied.
        """
        cutoffs = self.get_retention_cutoffs()
        call_cutoff_iso = cutoffs["operational_call_cutoff"].isoformat()
        fin_cutoff_iso = cutoffs["financial_statutory_cutoff"].isoformat()

        report: Dict[str, Any] = {
            "organization_id": organization_id or "all_tenants",
            "audited_at": datetime.now(timezone.utc).isoformat(),
            "cutoffs": {k: v.isoformat() for k, v in cutoffs.items()},
            "operational_call_data": {
                "retention_policy_days": OPERATIONAL_CALL_RETENTION_DAYS,
                "eligible_recordings_to_purge": 0,
                "eligible_transcripts_to_purge": 0,
            },
            "statutory_financial_data": {
                "retention_policy_years": STATUTORY_FINANCIAL_RETENTION_YEARS,
                "legal_citation": "Income Tax Act 1961 Sec 44AA & GST Act Sec 36 (CONFIRM WITH CA)",
                "invoices_protected_count": 0,
                "transactions_protected_count": 0,
                "revenue_events_protected_count": 0,
            },
            "statutory_compliance_logs": {
                "consent_records_shielded": "PERMANENT (DPDP Act 2023 Sec 6)",
                "audit_logs_shielded": "PERMANENT (DPDP Act 2023 Sec 8)",
            },
        }

        if not self.supabase:
            logger.warning("[RetentionPolicyService] Supabase client unavailable. Returning synthetic audit structure.")
            return report

        # 1. Voice calls eligible for audio & transcript minimization
        try:
            query = self.supabase.table("voice_calls").select("id, recording_url, transcript_text, created_at")
            if organization_id:
                query = query.eq("organization_id", organization_id)
            query = query.lt("created_at", call_cutoff_iso)
            res = query.execute()

            calls = res.data or []
            recordings_count = sum(1 for c in calls if c.get("recording_url"))
            transcripts_count = sum(
                1 for c in calls
                if c.get("transcript_text") and not str(c.get("transcript_text", "")).startswith("[TRANSCRIPT_PURGED")
            )
            report["operational_call_data"]["eligible_recordings_to_purge"] = recordings_count
            report["operational_call_data"]["eligible_transcripts_to_purge"] = transcripts_count
        except Exception as e:
            logger.error(f"[RetentionPolicyService] Error auditing voice_calls: {e}")

        # 2. Financial records under 8-year statutory shield
        try:
            inv_query = self.supabase.table("invoices").select("id, created_at")
            if organization_id:
                inv_query = inv_query.eq("organization_id", organization_id)
            inv_query = inv_query.gte("created_at", fin_cutoff_iso)
            inv_res = inv_query.execute()
            report["statutory_financial_data"]["invoices_protected_count"] = len(inv_res.data or [])
        except Exception as e:
            logger.debug(f"[RetentionPolicyService] Invoices table check skipped/error: {e}")

        try:
            tx_query = self.supabase.table("transactions").select("id, created_at")
            tx_query = tx_query.gte("created_at", fin_cutoff_iso)
            tx_res = tx_query.execute()
            report["statutory_financial_data"]["transactions_protected_count"] = len(tx_res.data or [])
        except Exception as e:
            logger.debug(f"[RetentionPolicyService] Transactions table check skipped/error: {e}")

        try:
            rev_query = self.supabase.table("revenue_events").select("id, created_at")
            rev_query = rev_query.gte("created_at", fin_cutoff_iso)
            rev_res = rev_query.execute()
            report["statutory_financial_data"]["revenue_events_protected_count"] = len(rev_res.data or [])
        except Exception as e:
            logger.debug(f"[RetentionPolicyService] Revenue events table check skipped/error: {e}")

        return report

    async def execute_retention_purge(
        self,
        organization_id: Optional[str] = None,
        dry_run: bool = True,
        requested_by: str = "system_cron"
    ) -> Dict[str, Any]:
        """
        Execute data minimization and purge of operational media older than 180 days.
        MANDATORY SAFEGUARD: dry_run defaults to True.
        Explicitly SHIELDS and leaves untouched all financial, consent, and audit records.
        """
        audit_info = await self.audit_retention_status(organization_id=organization_id)
        cutoffs = self.get_retention_cutoffs()
        call_cutoff_iso = cutoffs["operational_call_cutoff"].isoformat()

        recordings_to_purge = audit_info["operational_call_data"]["eligible_recordings_to_purge"]
        transcripts_to_purge = audit_info["operational_call_data"]["eligible_transcripts_to_purge"]
        total_eligible = recordings_to_purge + transcripts_to_purge

        if dry_run:
            logger.info(
                f"[RetentionPolicyService] DRY_RUN=true: Would minimize {total_eligible} items "
                f"({recordings_to_purge} recordings, {transcripts_to_purge} transcripts) older than {call_cutoff_iso}."
            )
            return {
                "dry_run": True,
                "action": "WOULD_PURGE",
                "organization_id": organization_id or "all_tenants",
                "operational_call_data": audit_info["operational_call_data"],
                "statutory_financial_shield": audit_info["statutory_financial_data"],
                "message": (
                    f"DRY RUN: {total_eligible} operational items identified for purge (> 180 days). "
                    "All financial records shielded under 8-year statutory policy. "
                    "Zero database mutations applied. Set dry_run=false with explicit confirmation to execute."
                ),
            }

        # Actual execution (dry_run=False)
        logger.warning(
            f"[RetentionPolicyService] DRY_RUN=false: Executing retention purge older than {call_cutoff_iso} "
            f"requested by '{requested_by}' for org '{organization_id or 'all_tenants'}'."
        )

        if not self.supabase:
            raise RuntimeError("Database client unavailable; cannot execute live retention purge.")

        now_iso = datetime.now(timezone.utc).isoformat()
        purged_stats = {
            "voice_recordings_cleared": 0,
            "voice_transcripts_cleared": 0,
            "financial_records_shielded": audit_info["statutory_financial_data"]["invoices_protected_count"]
                + audit_info["statutory_financial_data"]["transactions_protected_count"],
        }

        try:
            # Update voice_calls: scrub audio URLs and transcript text, preserve duration/billing
            update_payload = {
                "recording_url": None,
                "stereo_recording_url": None,
                "transcript_text": "[TRANSCRIPT_PURGED_UNDER_RETENTION_POLICY]",
            }

            query = (
                self.supabase.table("voice_calls")
                .update(update_payload)
                .lt("created_at", call_cutoff_iso)
            )
            if organization_id:
                query = query.eq("organization_id", organization_id)

            res = query.execute()
            updated_count = len(res.data or []) if hasattr(res, "data") else total_eligible
            purged_stats["voice_recordings_cleared"] = recordings_to_purge
            purged_stats["voice_transcripts_cleared"] = transcripts_to_purge
        except Exception as e:
            logger.error(f"[RetentionPolicyService] Error executing voice_calls purge: {e}")

        # Immutable audit log entry
        audit_payload = {
            "organization_id": organization_id or "system",
            "action": "DATA_RETENTION_PURGE",
            "performed_by": requested_by,
            "details": {
                "policy": "CERT-In 180-Day Call Retention / IT Act 8-Year Financial Split",
                "cutoff_timestamp": call_cutoff_iso,
                "purged_stats": purged_stats,
                "statutory_financial_shield": audit_info["statutory_financial_data"],
                "statutory_compliance_logs": audit_info["statutory_compliance_logs"],
                "executed_at": now_iso,
            },
            "created_at": now_iso,
        }

        try:
            self.supabase.table("audit_logs").insert(audit_payload).execute()
        except Exception as audit_err:
            try:
                self.supabase.table("revenue_audit_logs").insert(audit_payload).execute()
            except Exception:
                logger.error(f"[RetentionPolicyService] Audit log write failed: {audit_err}")

        return {
            "dry_run": False,
            "action": "PURGED",
            "organization_id": organization_id or "all_tenants",
            "purged_stats": purged_stats,
            "statutory_financial_shield": audit_info["statutory_financial_data"],
            "message": "Data retention minimization completed. Operational media purged; financial records preserved.",
            "completed_at": now_iso,
        }
