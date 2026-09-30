"""
50-Call Revenue Extraction Accuracy Sampling Script.

Samples historical calls and summaries from the database (or realistic multilingual call scenarios
if database has fewer than 50), executes the revenue extraction pipeline on each,
and outputs a side-by-side comparison table for human accuracy review.

Usage:
    python backend/scripts/sample_revenue_extractions.py
"""

import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from database import supabase_admin
from app.services.ai.revenue_extractor import RevenueExtractor

logging.basicConfig(level=logging.WARNING)

BENCHMARK_SCENARIOS = [
    # Hindi/Hinglish ranges
    "Customer asked about pricing for automated voice agent. Agent quoted 5 to 7 thousand per month. Customer agreed to discuss with manager.",
    "Prospect bola ki budget 10 se 15 hazaar tak ka ho sakta hai quarterly plan ke liye.",
    "Unhone bola 5000 se 8000 ke beech me agar ho jaye toh hum final kar sakte hain.",
    "Discussed setup fees between 20k to 25k for custom CRM webhook integration.",
    "Budget range mentioned was 50k to 1 lakh for annual enterprise deployment.",

    # Fixed single amounts in Hindi / Hinglish
    "Customer requested voice bot for clinic. Pricing finalized at paanch hazaar one-time setup fee.",
    "Customer agreed for basic package at pandrah hazaar per year.",
    "Fee discussed was dus hazaar for WhatsApp and voice bot bundle.",
    "Customer confirmed budget of pachas hazaar for call center automation.",
    "Enterprise client looking for custom LLM fine-tuning, quoted dedh lakh.",
    "Agreed on 2.5 lakh for 10 inbound AI receptionists.",
    "Quoted ₹ 12,000 for 500 outbound calling minutes.",
    "Discussed standard fee of Rs 8500/- with support SLA.",
    "Package cost is 15k with 18% GST.",
    "Said their monthly budget is 25000 per month.",

    # Monthly / recurring indicators
    "Pricing is 7500 har mahine for dental clinic receptionist.",
    "Customer asked for 10000 per month unlimited WhatsApp + AI calls.",
    "Quoted 4000 mahina for coaching center enquiry agent.",
    "Agreed on 18000/month for 2 agents with Hindi and English fluency.",
    "Charge is 6000 p/m starting next week.",

    # Discounts and negotiations
    "Agent quoted 20,000 with a 10% first-month promotional discount.",
    "Standard price 15000, agreed on discounted rate of 12000 for early signup.",
    "Client requested discount from 30k to 25k, agent agreed pending manager signoff.",

    # No price discussed / exploratory (Strict Null-Safety)
    "Customer called to check appointment status for tomorrow at 11 AM. Confirmed booking.",
    "User inquired whether Trinetra supports Bengali language. Agent confirmed coming soon.",
    "Caller asked for technical documentation regarding SIP trunking and Twilio latency.",
    "Prospect wants a live demo on Wednesday morning. No commercial terms or budget mentioned.",
    "Customer complained about audio echo on yesterday's call. Support ticket logged.",
    "Caller requested a callback in 2 hours as they are driving right now.",
    "Wrong number dial. Caller hung up after 5 seconds.",
    "Customer greeted agent and asked who is speaking. Agent explained Trinetra AI and user hung up.",
    "Inquired about hiring options and company headquarters location. No pricing discussed.",
    "Asked if Trinetra is open source. Agent explained SaaS pricing tiers exist but did not quote numbers."
]


async def run_sampling(fast: bool = False):
    print(f"\n🔍 Sampling 50 Calls & Summaries for Revenue Extraction Accuracy Check (fast_heuristic={fast})...\n")

    # 1. Fetch real calls / leads from database
    samples = []
    try:
        res = await asyncio.to_thread(
            supabase_admin.table("leads")
            .select("id, call_summary, budget_range")
            .order("created_at", desc=True)
            .limit(30)
            .execute
        )
        if res.data:
            for row in res.data:
                txt = f"{row.get('call_summary') or ''} {row.get('budget_range') or ''}".strip()
                if txt:
                    samples.append(txt)
    except Exception as e:
        print(f"Notice: Database query skipped ({e}), relying on benchmark callset.")

    # Top up with benchmark scenarios to reach at least 50
    idx = 0
    while len(samples) < 50:
        samples.append(BENCHMARK_SCENARIOS[idx % len(BENCHMARK_SCENARIOS)])
        idx += 1

    samples = samples[:50]

    rows = []
    for i, text in enumerate(samples, start=1):
        extraction = await RevenueExtractor.extract_from_text(text, source="inbound", use_llm=not fast)
        rows.append({
            "idx": i,
            "original_text": (text[:75] + "...") if len(text) > 75 else text,
            "quoted_amount": f"₹{extraction.quoted_amount:,.2f}" if extraction.quoted_amount is not None else "NULL",
            "price_type": extraction.price_type or "NULL",
            "confidence": f"{extraction.confidence:.2f}",
            "range": f"[{extraction.amount_min}, {extraction.amount_max}]" if extraction.price_type == "range" else "-"
        })

    # Generate Markdown Table
    md_lines = [
        "# Trinetra AI - 50-Call Revenue Extraction Accuracy Audit",
        f"Mode: {'Fast Heuristic Rules' if fast else 'LLM + Fallback Parser'}",
        "",
        "| # | Original Call / Summary Text | Extracted Quote | Price Type | Range Min/Max | Confidence |",
        "|---|---|---|---|---|---|"
    ]

    for r in rows:
        md_lines.append(
            f"| {r['idx']} | {r['original_text']} | **{r['quoted_amount']}** | `{r['price_type']}` | {r['range']} | {r['confidence']} |"
        )

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_accuracy_check.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    # Print first 20 directly to console for instant visibility
    print("=" * 95)
    print(f"{'#':<3} | {'Original Text':<42} | {'Extracted Quote':<16} | {'Type':<10} | {'Conf':<6}")
    print("=" * 95)
    for r in rows[:20]:
        print(f"{r['idx']:<3} | {r['original_text']:<42} | {r['quoted_amount']:<16} | {r['price_type']:<10} | {r['confidence']:<6}")
    print("=" * 95)
    print(f"\n✅ Full 50-sample accuracy verification report saved to:\n   {out_path}\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--fast", action="store_true", help="Run with deterministic heuristic parser (avoids LLM rate limits)")
    args = parser.parse_args()
    asyncio.run(run_sampling(fast=args.fast))
