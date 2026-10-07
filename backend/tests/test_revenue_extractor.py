import pytest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai.revenue_extractor import (
    RevenueExtractionResult,
    parse_hindi_amount_phrase,
    extract_amounts_heuristic,
    RevenueExtractor
)

def test_parse_hindi_amounts():
    assert parse_hindi_amount_phrase("paanch hazaar") == 5000.0
    assert parse_hindi_amount_phrase("pandrah hazaar") == 15000.0
    assert parse_hindi_amount_phrase("pachas hazaar") == 50000.0
    assert parse_hindi_amount_phrase("ek lakh") == 100000.0
    assert parse_hindi_amount_phrase("dedh lakh") == 150000.0
    assert parse_hindi_amount_phrase("10k") == 10000.0
    assert parse_hindi_amount_phrase("2.5 lakh") == 250000.0
    assert parse_hindi_amount_phrase("₹ 25000") == 25000.0
    assert parse_hindi_amount_phrase("Rs 12000/-") == 12000.0

def test_extract_ranges():
    # 5 to 7 thousand
    amt, p_type, a_min, a_max, text = extract_amounts_heuristic(
        "Client agreed on a budget between 5 to 7 thousand for the voice agent setup."
    )
    assert p_type == "range"
    assert a_min == 5000.0
    assert a_max == 7000.0
    assert amt == 6000.0

    # 5 se 8 hazaar (Hindi range)
    amt2, p_type2, a_min2, a_max2, text2 = extract_amounts_heuristic(
        "Unhone bola ki 5 se 8 hazaar tak ka budget ho sakta hai."
    )
    assert p_type2 == "range"
    assert a_min2 == 5000.0
    assert a_max2 == 8000.0
    assert amt2 == 6500.0

def test_extract_monthly_recurring():
    amt, p_type, a_min, a_max, text = extract_amounts_heuristic(
        "Pricing discussed was 15000 per month for unlimited incoming calls."
    )
    assert amt == 15000.0
    assert p_type == "monthly"

    amt_hi, p_type_hi, _, _, _ = extract_amounts_heuristic(
        "Hamara package 10 hazaar har mahine ka hai."
    )
    assert amt_hi == 10000.0
    assert p_type_hi == "monthly"

def test_missing_prices_strict_null():
    amt, p_type, a_min, a_max, text = extract_amounts_heuristic(
        "Customer asked for a demo on Monday at 3 PM and wanted to see features."
    )
    assert amt is None
    assert p_type is None
    assert a_min is None
    assert a_max is None

def test_pydantic_schema_sanitization():
    res = RevenueExtractionResult(
        quoted_amount="12500",
        currency="INR",
        service="Voice Receptionist",
        price_type="one_time",
        lead_status="hot",
        source="inbound",
        confidence=0.9
    )
    assert res.quoted_amount == 12500.0
    assert res.currency == "INR"
    assert res.price_type == "one_time"

    # Null amount verification
    res_null = RevenueExtractionResult(
        quoted_amount=None,
        currency="INR",
        source="inbound",
        confidence=0.1
    )
    assert res_null.quoted_amount is None
    assert res_null.price_type is None
