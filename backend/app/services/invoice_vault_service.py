"""
backend/app/services/invoice_vault_service.py

GST Invoicing Vault & CA-Reviewed Workflow Engine.
Implements Master Plan Sections 18.10, 18.11, and B6.

Core Capabilities:
1. Automated GST Invoice Generation for Prepaid Wallet Top-ups.
2. Sequential Fiscal-Year Invoice Numbering (e.g. TRI/26-27/00001).
3. Intra-state vs Inter-state Tax Split (CGST+SGST vs IGST).
4. Tamper-evident SHA-256 Integrity Hashing.
5. In-Memory and Storage Vault PDF Generation (Rule 46 CGST Rules).
6. CA Review Audit Trail with Immutable Checksum Logging.
7. GSTR-1 / GSTR-3B Tax Aggregate Summaries for Chartered Accountants.
"""

import os
import time
import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from database import supabase_admin
from app.services.gst_calculator import (
    GSTCalculator,
    DEFAULT_SAC_CODE,
    STANDARD_GST_RATE,
)
from app.services.pdf_invoice_generator import PDFInvoiceGenerator

logger = logging.getLogger("InvoiceVaultService")


class InvoiceVaultService:
    """Enterprise GST invoice generation, vaulting, and CA review service."""

    def __init__(self, supabase_client=None):
        self.supabase = supabase_client or supabase_admin

    # -------------------------------------------------------------------------
    # 1. Fiscal Year & Sequential Numbering
    # -------------------------------------------------------------------------
    @staticmethod
    def get_current_fiscal_year(dt: Optional[datetime] = None) -> str:
        """
        Returns Indian Financial Year string (e.g., '2026-2027', code '26-27').
        Indian FY begins April 1 and ends March 31.
        """
        target = dt or datetime.now(timezone.utc)
        year = target.year
        month = target.month

        if month >= 4:
            start_year = year
            end_year = year + 1
        else:
            start_year = year - 1
            end_year = year

        fy_short = f"{str(start_year)[-2:]}-{str(end_year)[-2:]}"
        return f"{start_year}-{end_year}", fy_short

    def get_next_invoice_number(self, fy_short: str) -> str:
        """
        Generates sequential, gapless invoice number formatted as TRI/{fy_short}/{seq:05d}.
        """
        prefix = f"TRI/{fy_short}/"
        try:
            res = (
                self.supabase.table("invoices")
                .select("invoice_number")
                .like("invoice_number", f"{prefix}%")
                .order("invoice_number", desc=True)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                last_no = res.data[0]["invoice_number"]
                seq_str = last_no.split("/")[-1]
                next_seq = int(seq_str) + 1
            else:
                next_seq = 1
        except Exception as e:
            logger.warning(f"Error querying last invoice number: {e}. Defaulting to 1.")
            next_seq = 1

        return f"{prefix}{next_seq:05d}"

    # -------------------------------------------------------------------------
    # 2. Cryptographic Integrity Hashing
    # -------------------------------------------------------------------------
    @staticmethod
    def compute_integrity_hash(invoice_dict: Dict[str, Any]) -> str:
        """
        Computes SHA-256 hash over canonical invoice fields to ensure tamper-evidence.
        """
        canonical = (
            f"INV:{invoice_dict.get('invoice_number')}:"
            f"ORG:{invoice_dict.get('organization_id')}:"
            f"DATE:{invoice_dict.get('invoice_date')}:"
            f"SUBTOTAL:{invoice_dict.get('subtotal_paisa')}:"
            f"TAX:{invoice_dict.get('total_tax_paisa')}:"
            f"TOTAL:{invoice_dict.get('grand_total_paisa')}:"
            f"POS:{invoice_dict.get('place_of_supply')}:"
            f"REF:{invoice_dict.get('payment_reference_id')}"
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    # -------------------------------------------------------------------------
    # 3. Create Automated GST Invoice on Wallet Top-Up
    # -------------------------------------------------------------------------
    def create_invoice_for_wallet_topup(
        self,
        organization_id: str,
        amount_paisa: int,
        payment_reference_id: str,
        customer_legal_name: Optional[str] = None,
        customer_gstin: Optional[str] = None,
        customer_state: Optional[str] = None,
        customer_state_code: Optional[str] = None,
        customer_billing_address: Optional[Dict[str, Any]] = None,
        transaction_type: str = "wallet_topup",
    ) -> Dict[str, Any]:
        """
        Generates and vaults a statutory GST invoice for a top-up or service credit.
        """
        if amount_paisa <= 0:
            raise ValueError("Invoice amount must be strictly positive.")

        # Determine Customer Tax Jurisdiction
        c_gstin = (customer_gstin or "").strip().upper() if customer_gstin else None
        valid_gstin, gstin_state_code = GSTCalculator.validate_gstin(c_gstin)

        if valid_gstin and gstin_state_code:
            c_code = gstin_state_code
            c_state = GSTCalculator.get_state_name_from_code(c_code)
        else:
            c_code = str(customer_state_code or "07").zfill(2)
            c_state = customer_state or GSTCalculator.get_state_name_from_code(c_code)
            if not valid_gstin:
                c_gstin = None  # Treat as unregistered consumer

        c_name = customer_legal_name or f"Organization {organization_id[:8]}"
        c_address = customer_billing_address or {
            "street": "Commercial Office",
            "city": c_state,
            "state": c_state,
            "state_code": c_code,
            "country": "IN",
        }

        # Calculate GST Breakdown (inclusive top-up pricing)
        supplier_code = "07"  # Delhi
        gst_breakdown = GSTCalculator.calculate_gst_breakdown(
            amount_paisa=amount_paisa,
            supplier_state_code=supplier_code,
            customer_state_code=c_code,
            is_inclusive=True,
            hsn_sac=DEFAULT_SAC_CODE,
        )

        fy_full, fy_short = self.get_current_fiscal_year()
        invoice_number = self.get_next_invoice_number(fy_short)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Temporary dict to compute integrity hash
        temp_dict = {
            "invoice_number": invoice_number,
            "organization_id": organization_id,
            "invoice_date": now_iso,
            "subtotal_paisa": gst_breakdown["subtotal_paisa"],
            "total_tax_paisa": gst_breakdown["total_tax_paisa"],
            "grand_total_paisa": gst_breakdown["grand_total_paisa"],
            "place_of_supply": gst_breakdown["place_of_supply"],
            "payment_reference_id": payment_reference_id,
        }
        integrity_hash = self.compute_integrity_hash(temp_dict)

        invoice_record = {
            "id": str(uuid.uuid4()),
            "organization_id": organization_id,
            "invoice_number": invoice_number,
            "fiscal_year": fy_full,
            "invoice_date": now_iso,
            "due_date": now_iso,
            "payment_reference_id": payment_reference_id,
            "transaction_type": transaction_type,
            "currency": "INR",
            "supplier_name": "Trinetra Technologies Private Limited",
            "supplier_gstin": "07AAAAA0000A1Z5",
            "supplier_state": "Delhi",
            "supplier_state_code": supplier_code,
            "supplier_address": {
                "street": "Trinetra Tower, Tech Park",
                "city": "New Delhi",
                "state": "Delhi",
                "pincode": "110001",
                "country": "IN",
            },
            "customer_legal_name": c_name,
            "customer_gstin": c_gstin,
            "customer_state": c_state,
            "customer_state_code": c_code,
            "customer_billing_address": c_address,
            "place_of_supply": gst_breakdown["place_of_supply"],
            "is_reverse_charge": False,
            "subtotal_paisa": gst_breakdown["subtotal_paisa"],
            "cgst_rate_pct": gst_breakdown["cgst_rate_pct"],
            "cgst_amount_paisa": gst_breakdown["cgst_amount_paisa"],
            "sgst_rate_pct": gst_breakdown["sgst_rate_pct"],
            "sgst_amount_paisa": gst_breakdown["sgst_amount_paisa"],
            "igst_rate_pct": gst_breakdown["igst_rate_pct"],
            "igst_amount_paisa": gst_breakdown["igst_amount_paisa"],
            "total_tax_paisa": gst_breakdown["total_tax_paisa"],
            "grand_total_paisa": gst_breakdown["grand_total_paisa"],
            "status": "paid",
            "ca_review_status": "pending",
            "pdf_storage_path": f"invoices/{fy_full}/{invoice_number.replace('/', '_')}.pdf",
            "integrity_hash": integrity_hash,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        # Insert Invoice Record
        res_inv = self.supabase.table("invoices").insert(invoice_record).execute()
        created_invoice = res_inv.data[0] if res_inv.data else invoice_record
        invoice_id = created_invoice.get("id") or str(invoice_record.get("invoice_number"))

        # Create Itemized Line Item
        line_item_record = {
            "invoice_id": invoice_id,
            "description": "Trinetra AI Voice Telephony & Cloud Infrastructure Credits",
            "hsn_sac_code": DEFAULT_SAC_CODE,
            "quantity": 1.0,
            "unit_price_paisa": gst_breakdown["subtotal_paisa"],
            "taxable_amount_paisa": gst_breakdown["subtotal_paisa"],
            "cgst_rate_pct": gst_breakdown["cgst_rate_pct"],
            "cgst_amount_paisa": gst_breakdown["cgst_amount_paisa"],
            "sgst_rate_pct": gst_breakdown["sgst_rate_pct"],
            "sgst_amount_paisa": gst_breakdown["sgst_amount_paisa"],
            "igst_rate_pct": gst_breakdown["igst_rate_pct"],
            "igst_amount_paisa": gst_breakdown["igst_amount_paisa"],
            "total_amount_paisa": gst_breakdown["grand_total_paisa"],
            "created_at": now_iso,
        }
        self.supabase.table("invoice_line_items").insert(line_item_record).execute()

        created_invoice["line_items"] = [line_item_record]
        return created_invoice

    # -------------------------------------------------------------------------
    # 4. Invoicing Queries & Vault PDF Download
    # -------------------------------------------------------------------------
    def list_invoices(
        self,
        organization_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Lists invoices scoped by organization_id (or all for admin)."""
        query = self.supabase.table("invoices").select("*")
        if organization_id:
            query = query.eq("organization_id", organization_id)
        res = query.order("invoice_date", desc=True).range(offset, offset + limit - 1).execute()
        return res.data or []

    def get_invoice(self, invoice_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Retrieves invoice by ID with line items and CA review audit history."""
        query = self.supabase.table("invoices").select("*").eq("id", invoice_id)
        if organization_id:
            query = query.eq("organization_id", organization_id)
        res = query.execute()
        if not res.data or len(res.data) == 0:
            return None

        invoice = res.data[0]
        # Fetch line items
        lines_res = self.supabase.table("invoice_line_items").select("*").eq("invoice_id", invoice_id).execute()
        invoice["line_items"] = lines_res.data or []

        # Fetch CA reviews
        reviews_res = (
            self.supabase.table("invoice_ca_reviews")
            .select("*")
            .eq("invoice_id", invoice_id)
            .order("created_at", desc=True)
            .execute()
        )
        invoice["ca_reviews"] = reviews_res.data or []
        return invoice

    def generate_invoice_pdf(self, invoice_id: str, organization_id: Optional[str] = None) -> bytes:
        """Renders statutory PDF bytes for the invoice."""
        invoice = self.get_invoice(invoice_id, organization_id=organization_id)
        if not invoice:
            raise ValueError(f"Invoice not found: {invoice_id}")
        return PDFInvoiceGenerator.generate_invoice_pdf(invoice)

    # -------------------------------------------------------------------------
    # 5. CA Review Sign-Off Workflow
    # -------------------------------------------------------------------------
    def submit_ca_review(
        self,
        invoice_id: str,
        reviewer_id: str,
        ca_membership_no: str,
        ca_name: str,
        action: str,
        notes: str,
    ) -> Dict[str, Any]:
        """
        Executes Chartered Accountant review sign-off with append-only audit trail.
        Action must be one of: 'approved', 'flagged', 'waived', 'amended'.
        """
        valid_actions = ("approved", "flagged", "waived", "amended")
        if action not in valid_actions:
            raise ValueError(f"Invalid CA action: '{action}'. Must be one of {valid_actions}")

        if not ca_membership_no or not ca_name:
            raise ValueError("CA Membership Number and CA Name are mandatory for review sign-off.")

        now_iso = datetime.now(timezone.utc).isoformat()
        raw_checksum = f"{invoice_id}:{reviewer_id}:{ca_membership_no}:{action}:{now_iso}"
        checksum = hashlib.sha256(raw_checksum.encode("utf-8")).hexdigest()

        review_entry = {
            "invoice_id": invoice_id,
            "reviewer_id": reviewer_id,
            "ca_membership_no": ca_membership_no,
            "ca_name": ca_name,
            "action": action,
            "notes": notes or "",
            "checksum": checksum,
            "created_at": now_iso,
        }

        # 1. Insert immutable review audit trail
        self.supabase.table("invoice_ca_reviews").insert(review_entry).execute()

        # 2. Update invoice ca_review_status
        new_status = "approved" if action == "approved" else "flagged"
        if action == "waived":
            new_status = "waived"

        self.supabase.table("invoices").update({
            "ca_review_status": new_status,
            "updated_at": now_iso,
        }).eq("id", invoice_id).execute()

        return {
            "invoice_id": invoice_id,
            "ca_review_status": new_status,
            "review": review_entry,
        }

    # -------------------------------------------------------------------------
    # 6. CA Tax Aggregate Summaries (GSTR-1 & GSTR-3B)
    # -------------------------------------------------------------------------
    def generate_ca_tax_summary(self, fiscal_year: str) -> Dict[str, Any]:
        """
        Computes statutory summary for periodic GSTR-1 and GSTR-3B CA filing.
        """
        res = (
            self.supabase.table("invoices")
            .select("subtotal_paisa, cgst_amount_paisa, sgst_amount_paisa, igst_amount_paisa, grand_total_paisa, customer_gstin, place_of_supply, status, ca_review_status")
            .eq("fiscal_year", fiscal_year)
            .execute()
        )
        invoices = res.data or []

        total_taxable_paisa = 0
        total_cgst_paisa = 0
        total_sgst_paisa = 0
        total_igst_paisa = 0
        grand_total_paisa = 0
        b2b_count = 0
        b2c_count = 0
        approved_count = 0
        pending_count = 0
        flagged_count = 0
        pos_breakup: Dict[str, Dict[str, int]] = {}

        for inv in invoices:
            taxable = inv.get("subtotal_paisa", 0)
            cgst = inv.get("cgst_amount_paisa", 0)
            sgst = inv.get("sgst_amount_paisa", 0)
            igst = inv.get("igst_amount_paisa", 0)
            total = inv.get("grand_total_paisa", 0)
            pos = inv.get("place_of_supply", "Unknown")

            total_taxable_paisa += taxable
            total_cgst_paisa += cgst
            total_sgst_paisa += sgst
            total_igst_paisa += igst
            grand_total_paisa += total

            if inv.get("customer_gstin"):
                b2b_count += 1
            else:
                b2c_count += 1

            ca_stat = inv.get("ca_review_status", "pending")
            if ca_stat == "approved":
                approved_count += 1
            elif ca_stat == "flagged":
                flagged_count += 1
            else:
                pending_count += 1

            if pos not in pos_breakup:
                pos_breakup[pos] = {"taxable_paisa": 0, "tax_paisa": 0, "count": 0}
            pos_breakup[pos]["taxable_paisa"] += taxable
            pos_breakup[pos]["tax_paisa"] += (cgst + sgst + igst)
            pos_breakup[pos]["count"] += 1

        return {
            "fiscal_year": fiscal_year,
            "total_invoices_count": len(invoices),
            "b2b_invoices_count": b2b_count,
            "b2c_invoices_count": b2c_count,
            "review_status": {
                "approved": approved_count,
                "pending": pending_count,
                "flagged": flagged_count,
            },
            "subtotal_taxable_inr": round(total_taxable_paisa / 100.0, 2),
            "cgst_total_inr": round(total_cgst_paisa / 100.0, 2),
            "sgst_total_inr": round(total_sgst_paisa / 100.0, 2),
            "igst_total_inr": round(total_igst_paisa / 100.0, 2),
            "total_tax_inr": round((total_cgst_paisa + total_sgst_paisa + total_igst_paisa) / 100.0, 2),
            "grand_total_inr": round(grand_total_paisa / 100.0, 2),
            "place_of_supply_breakup": pos_breakup,
            "statutory_note": "Governed by CGST Act 2017 & Section 44AA of Income Tax Act 1961 (CONFIRM WITH CA).",
        }
