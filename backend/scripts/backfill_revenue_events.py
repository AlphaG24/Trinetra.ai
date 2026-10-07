"""
Idempotent Backfill Script for Revenue Events.

Scans existing leads and voice calls in batches, extracts structured quotes,
and populates revenue_events. Supports --dry-run mode and prints an audit report.

Usage:
    python backend/scripts/backfill_revenue_events.py --dry-run
    python backend/scripts/backfill_revenue_events.py --batch-size 50
"""

import os
import sys
import argparse
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from database import supabase_admin
from app.services.ai.revenue_extractor import RevenueExtractor
from app.services.revenue_service import DEFAULT_ATTRIBUTION_WINDOW_DAYS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("RevenueBackfill")


async def run_backfill(batch_size: int = 50, dry_run: bool = False, max_records: int = 500):
    logger.info(f"--- Starting Revenue Events Backfill (dry_run={dry_run}, batch_size={batch_size}) ---")

    # 1. Fetch leads that have call summaries or budget ranges
    offset = 0
    total_scanned = 0
    total_filled = 0
    total_null = 0
    total_skipped = 0
    total_errors = 0
    total_estimated_value = 0.0

    now_utc = datetime.now(timezone.utc)
    attribution_end = now_utc + timedelta(days=DEFAULT_ATTRIBUTION_WINDOW_DAYS)

    while total_scanned < max_records:
        limit = min(batch_size, max_records - total_scanned)
        try:
            res = await asyncio.to_thread(
                supabase_admin.table("leads")
                .select("id, user_id, call_id, phone, full_name, call_summary, budget_range, source, created_at")
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute
            )
            leads = res.data or []
        except Exception as e:
            logger.error(f"Failed to query leads batch at offset {offset}: {e}")
            break

        if not leads:
            break

        logger.info(f"Processing batch of {len(leads)} leads (offset {offset})...")

        for lead in leads:
            total_scanned += 1
            lead_id = lead["id"]
            user_id = lead.get("user_id")
            call_id = lead.get("call_id")
            summary = lead.get("call_summary") or ""
            budget_range = lead.get("budget_range") or ""
            source = lead.get("source") or "inbound"

            if not user_id:
                total_null += 1
                continue

            # Idempotency check: see if revenue_events already exists for this lead or call
            try:
                chk = await asyncio.to_thread(
                    supabase_admin.table("revenue_events")
                    .select("id")
                    .eq("lead_id", lead_id)
                    .maybe_single()
                    .execute
                )
                if chk and chk.data:
                    total_skipped += 1
                    continue
            except Exception:
                pass

            # Combine summary and budget_range text
            text_to_analyze = f"{summary} {budget_range}".strip()
            if not text_to_analyze:
                # Fallback: check voice_calls transcript if call_id exists
                if call_id:
                    try:
                        v_res = await asyncio.to_thread(
                            supabase_admin.table("voice_calls").select("transcript, call_summary").eq("id", call_id).maybe_single().execute
                        )
                        if v_res and v_res.data:
                            text_to_analyze = (v_res.data.get("call_summary") or "") + " " + (v_res.data.get("transcript") or "")
                    except Exception:
                        pass

            if not text_to_analyze.strip():
                total_null += 1
                continue

            try:
                extraction = await RevenueExtractor.extract_from_text(text_to_analyze[:3000], source="inbound")
                if extraction.quoted_amount is not None:
                    total_filled += 1
                    total_estimated_value += extraction.quoted_amount

                    logger.info(
                        f"[{'DRY-RUN' if dry_run else 'INSERT'}] Lead {lead_id}: "
                        f"Quoted={extraction.currency} {extraction.quoted_amount} ({extraction.price_type or 'one_time'}), "
                        f"Confidence={extraction.confidence}"
                    )

                    if not dry_run:
                        event_payload = {
                            "business_id": user_id,
                            "lead_id": lead_id,
                            "call_id": call_id,
                            "quoted_amount": extraction.quoted_amount,
                            "currency": extraction.currency,
                            "deal_status": "open",
                            "price_type": extraction.price_type,
                            "amount_min": extraction.amount_min,
                            "amount_max": extraction.amount_max,
                            "service": extraction.service,
                            "confidence": extraction.confidence,
                            "source": extraction.source,
                            "attribution_window_end": attribution_end.isoformat(),
                            "extracted_quote_text": extraction.extracted_quote_text,
                            "metadata": {
                                "backfilled": True,
                                "lead_phone": lead.get("phone")
                            }
                        }
                        ins = await asyncio.to_thread(
                            supabase_admin.table("revenue_events").insert(event_payload).execute
                        )
                        if ins.data:
                            ev_id = ins.data[0]["id"]
                            # Audit log
                            await asyncio.to_thread(
                                supabase_admin.table("revenue_audit_logs").insert({
                                    "revenue_event_id": ev_id,
                                    "business_id": user_id,
                                    "action": "backfill_extraction",
                                    "new_status": "open",
                                    "changed_by": "backfill_script"
                                }).execute
                            )
                else:
                    total_null += 1
            except Exception as ex:
                total_errors += 1
                logger.warning(f"Error extracting for lead {lead_id}: {ex}")

        offset += len(leads)

    # Summary Report
    print("\n" + "=" * 65)
    print(f"REVENUE BACKFILL REPORT ({'DRY-RUN - NO CHANGES WRITTEN' if dry_run else 'EXECUTED'})")
    print("=" * 65)
    print(f"Total Leads Examined:     {total_scanned}")
    print(f"Quotes Extracted:         {total_filled}")
    print(f"Left Null (No Price):     {total_null}")
    print(f"Skipped (Already Exists): {total_skipped}")
    print(f"Total Estimated Pipeline: ₹{total_estimated_value:,.2f}")
    print(f"Errors Encountered:       {total_errors}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill revenue events from historical leads.")
    parser.add_argument("--batch-size", type=int, default=50, help="Batch size for processing")
    parser.add_argument("--dry-run", action="store_true", help="Perform extraction without writing to database")
    parser.add_argument("--limit", type=int, default=500, help="Maximum records to process")

    args = parser.parse_args()
    asyncio.run(run_backfill(batch_size=args.batch_size, dry_run=args.dry_run, max_records=args.limit))
