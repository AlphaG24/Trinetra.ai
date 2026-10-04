"""
backend/app/services/caller_rights_service.py

Statutory Caller Rights Engine (DPDP Act 2023 Sec 11/12 & EU GDPR Art 15, 17, 20).
Enforces:
1. Multi-tenant caller data search across:
   - customer_contacts
   - voice_calls
   - leads
   - appointments
   - campaign_contacts
2. Machine-readable export (JSON / CSV).
3. Right to erasure / anonymization with mandatory DRY_RUN=true default.
4. Immutable audit logging of all erasure actions.
5. Strict tenant boundary isolation (organization_id scoping).
"""

import io
import csv
import json
import re
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("caller-rights-service")


def normalize_phone_variations(phone: str) -> List[str]:
    """
    Return all standard database variations for a given phone number.
    Handles 10-digit mobile, +91 prefix, 91 prefix, and 0 prefix.
    """
    if not phone or not str(phone).strip():
        return []
    raw = str(phone).strip()
    digits = re.sub(r"\D", "", raw)
    variations = set()
    variations.add(raw)

    if len(digits) == 10:
        variations.add(digits)
        variations.add(f"+91{digits}")
        variations.add(f"91{digits}")
        variations.add(f"0{digits}")
    elif len(digits) == 12 and digits.startswith("91"):
        d10 = digits[2:]
        variations.add(d10)
        variations.add(f"+{digits}")
        variations.add(digits)
        variations.add(f"0{d10}")
    elif len(digits) == 11 and digits.startswith("0"):
        d10 = digits[1:]
        variations.add(d10)
        variations.add(f"+91{d10}")
        variations.add(f"91{d10}")
        variations.add(digits)
    else:
        variations.add(digits)
        if not raw.startswith("+") and len(digits) > 7:
            variations.add(f"+{digits}")

    return sorted(list(variations))


class CallerRightsService:
    """
    Handles statutory DPDP / GDPR data subject rights for callers.
    Requires organization_id on all operations to ensure tenant isolation.
    """

    def __init__(self, supabase_client=None):
        if supabase_client is None:
            from database import supabase_admin
            self.supabase = supabase_admin
        else:
            self.supabase = supabase_client

    async def search_caller_data(self, organization_id: str, phone_number: str) -> Dict[str, Any]:
        """
        Search for all records associated with a caller phone number in an organization.
        Strictly scoped to organization_id.
        """
        if not organization_id or not str(organization_id).strip():
            raise ValueError("organization_id is mandatory for tenant isolation.")
        if not phone_number or not str(phone_number).strip():
            raise ValueError("phone_number is required.")

        org_id = str(organization_id).strip()
        phone_vars = normalize_phone_variations(phone_number)

        records: Dict[str, List[Dict[str, Any]]] = {
            "customer_contacts": [],
            "voice_calls": [],
            "leads": [],
            "appointments": [],
            "campaign_contacts": [],
        }

        if not self.supabase:
            logger.warning("[CallerRightsService] Supabase client is None. Returning empty synthetic structure.")
            return {
                "phone_number": phone_number,
                "organization_id": org_id,
                "phone_variations": phone_vars,
                "records": records,
                "summary": {k: 0 for k in records},
                "total_records": 0,
            }

        try:
            # 1. customer_contacts
            res_contacts = (
                self.supabase.table("customer_contacts")
                .select("id, full_name, phone_number, email, company, notes, total_calls, created_at, updated_at")
                .eq("organization_id", org_id)
                .in_("phone_number", phone_vars)
                .execute()
            )
            records["customer_contacts"] = res_contacts.data or []
        except Exception as e:
            logger.error(f"[CallerRightsService] Error querying customer_contacts: {e}")

        try:
            # 2. voice_calls
            res_calls = (
                self.supabase.table("voice_calls")
                .select("id, caller_phone, duration_seconds, call_status, transcript_text, started_at, created_at")
                .eq("organization_id", org_id)
                .in_("caller_phone", phone_vars)
                .execute()
            )
            records["voice_calls"] = res_calls.data or []
        except Exception as e:
            logger.error(f"[CallerRightsService] Error querying voice_calls: {e}")

        try:
            # 3. leads
            res_leads = (
                self.supabase.table("leads")
                .select("id, name, phone, email, notes, created_at")
                .eq("organization_id", org_id)
                .in_("phone", phone_vars)
                .execute()
            )
            records["leads"] = res_leads.data or []
        except Exception as e:
            logger.error(f"[CallerRightsService] Error querying leads: {e}")

        try:
            # 4. appointments
            res_appts = (
                self.supabase.table("appointments")
                .select("id, contact_name, contact_phone, scheduled_at, status, notes, created_at")
                .eq("organization_id", org_id)
                .in_("contact_phone", phone_vars)
                .execute()
            )
            records["appointments"] = res_appts.data or []
        except Exception as e:
            logger.error(f"[CallerRightsService] Error querying appointments: {e}")

        try:
            # 5. campaign_contacts (join via campaigns table organization_id)
            res_campaigns = (
                self.supabase.table("campaigns")
                .select("id")
                .eq("organization_id", org_id)
                .execute()
            )
            camp_ids = [c["id"] for c in (res_campaigns.data or []) if "id" in c]
            if camp_ids:
                res_camp_contacts = (
                    self.supabase.table("campaign_contacts")
                    .select("id, campaign_id, full_name, phone, call_status, notes, created_at")
                    .in_("campaign_id", camp_ids)
                    .in_("phone", phone_vars)
                    .execute()
                )
                records["campaign_contacts"] = res_camp_contacts.data or []
        except Exception as e:
            logger.error(f"[CallerRightsService] Error querying campaign_contacts: {e}")

        summary = {k: len(v) for k, v in records.items()}
        total_records = sum(summary.values())

        return {
            "phone_number": phone_number,
            "organization_id": org_id,
            "phone_variations": phone_vars,
            "records": records,
            "summary": summary,
            "total_records": total_records,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        }

    async def export_caller_data(self, organization_id: str, phone_number: str, export_format: str = "json") -> Dict[str, Any]:
        """
        Export data subject records in structured JSON or CSV format.
        """
        data = await self.search_caller_data(organization_id, phone_number)
        fmt = (export_format or "json").lower().strip()

        if fmt == "json":
            return {
                "format": "json",
                "phone_number": phone_number,
                "organization_id": organization_id,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "data": data,
            }

        # CSV format
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["# STATUTORY DATA SUBJECT ACCESS REQUEST (DSAR) EXPORT"])
        writer.writerow(["# Governing Law: India DPDP Act 2023 Sec 11 / EU GDPR Art 15"])
        writer.writerow(["# Organization ID", organization_id])
        writer.writerow(["# Phone Number", phone_number])
        writer.writerow(["# Export Timestamp", datetime.now(timezone.utc).isoformat()])
        writer.writerow([])

        for table_name, rows in data["records"].items():
            writer.writerow([f"=== TABLE: {table_name} (Total: {len(rows)}) ==="])
            if rows:
                headers = list(rows[0].keys())
                writer.writerow(headers)
                for r in rows:
                    writer.writerow([r.get(h, "") for h in headers])
            else:
                writer.writerow(["No records found."])
            writer.writerow([])

        csv_content = output.getvalue()
        return {
            "format": "csv",
            "phone_number": phone_number,
            "organization_id": organization_id,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "csv_content": csv_content,
        }

    async def erase_caller_data(
        self,
        organization_id: str,
        phone_number: str,
        dry_run: bool = True,
        reason: str = "caller_gdpr_dpdp_request",
        requested_by: str = "admin"
    ) -> Dict[str, Any]:
        """
        Erase or anonymize caller data across all 5 tables.
        CRITICAL RULE: Defaults to dry_run=True.
        When dry_run=True, reports exact records that would be affected without mutating data.
        When dry_run=False, deletes or anonymizes PII and creates immutable audit_log record.
        """
        data = await self.search_caller_data(organization_id, phone_number)
        summary = data["summary"]
        total_records = data["total_records"]
        phone_vars = data["phone_variations"]
        org_id = data["organization_id"]

        if dry_run:
            logger.info(
                f"[CallerRightsService] DRY_RUN=true: Would erase {total_records} records for "
                f"phone '{phone_number}' in org '{org_id}'."
            )
            return {
                "dry_run": True,
                "action": "WOULD_ERASE",
                "phone_number": phone_number,
                "organization_id": org_id,
                "records_to_affect": summary,
                "total_records": total_records,
                "message": (
                    f"DRY RUN: {total_records} records identified across 5 tables. "
                    "Zero mutations applied. Switch dry_run=false with explicit confirmation to execute."
                ),
            }

        # Actual execution (dry_run=False)
        logger.warning(
            f"[CallerRightsService] DRY_RUN=false: Executing permanent erasure for phone '{phone_number}' "
            f"in org '{org_id}' requested by '{requested_by}'."
        )

        affected = {k: 0 for k in summary}

        if not self.supabase:
            raise RuntimeError("Database client unavailable; cannot execute live erasure.")

        # 1. Delete customer_contacts
        try:
            res = (
                self.supabase.table("customer_contacts")
                .delete()
                .eq("organization_id", org_id)
                .in_("phone_number", phone_vars)
                .execute()
            )
            affected["customer_contacts"] = len(res.data or []) if hasattr(res, "data") else summary["customer_contacts"]
        except Exception as e:
            logger.error(f"[CallerRightsService] Error deleting customer_contacts: {e}")

        # 2. Anonymize voice_calls (preserve duration & cost for statutory billing records)
        try:
            res = (
                self.supabase.table("voice_calls")
                .update({
                    "caller_phone": "[ERASED_UNDER_DPDP]",
                    "transcript_text": "[TRANSCRIPT_ERASED_UNDER_DPDP]",
                    "recording_url": None,
                    "stereo_recording_url": None,
                })
                .eq("organization_id", org_id)
                .in_("caller_phone", phone_vars)
                .execute()
            )
            affected["voice_calls"] = len(res.data or []) if hasattr(res, "data") else summary["voice_calls"]
        except Exception as e:
            logger.error(f"[CallerRightsService] Error anonymizing voice_calls: {e}")

        # 3. Delete leads
        try:
            res = (
                self.supabase.table("leads")
                .delete()
                .eq("organization_id", org_id)
                .in_("phone", phone_vars)
                .execute()
            )
            affected["leads"] = len(res.data or []) if hasattr(res, "data") else summary["leads"]
        except Exception as e:
            logger.error(f"[CallerRightsService] Error deleting leads: {e}")

        # 4. Anonymize appointments
        try:
            res = (
                self.supabase.table("appointments")
                .update({
                    "contact_name": "[ERASED]",
                    "contact_phone": "[ERASED]",
                    "notes": "[NOTES_ERASED_UNDER_DPDP]",
                })
                .eq("organization_id", org_id)
                .in_("contact_phone", phone_vars)
                .execute()
            )
            affected["appointments"] = len(res.data or []) if hasattr(res, "data") else summary["appointments"]
        except Exception as e:
            logger.error(f"[CallerRightsService] Error anonymizing appointments: {e}")

        # 5. Delete campaign_contacts
        try:
            res_campaigns = (
                self.supabase.table("campaigns")
                .select("id")
                .eq("organization_id", org_id)
                .execute()
            )
            camp_ids = [c["id"] for c in (res_campaigns.data or []) if "id" in c]
            if camp_ids:
                res = (
                    self.supabase.table("campaign_contacts")
                    .delete()
                    .in_("campaign_id", camp_ids)
                    .in_("phone", phone_vars)
                    .execute()
                )
                affected["campaign_contacts"] = len(res.data or []) if hasattr(res, "data") else summary["campaign_contacts"]
        except Exception as e:
            logger.error(f"[CallerRightsService] Error deleting campaign_contacts: {e}")

        # 6. Immutable audit log entry
        phone_hash = hashlib.sha256(phone_number.encode("utf-8")).hexdigest()
        audit_payload = {
            "organization_id": org_id,
            "action": "CALLER_DATA_ERASURE",
            "performed_by": requested_by,
            "details": {
                "phone_hash": phone_hash,
                "records_affected": affected,
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            self.supabase.table("audit_logs").insert(audit_payload).execute()
        except Exception as audit_err:
            # Fallback to revenue_audit_logs if audit_logs table is not yet migrated
            try:
                self.supabase.table("revenue_audit_logs").insert(audit_payload).execute()
            except Exception:
                logger.error(f"[CallerRightsService] Audit logging failed: {audit_err}")

        return {
            "dry_run": False,
            "action": "ERASED",
            "phone_number": phone_number,
            "phone_hash": phone_hash,
            "organization_id": org_id,
            "records_affected": affected,
            "total_affected": sum(affected.values()),
            "message": "Data subject erasure completed. Personal identifiers deleted or anonymized.",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
