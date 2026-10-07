"""
backend/app/services/gst_calculator.py

Indian Goods and Services Tax (GST) Calculation & Validation Engine.
Complies with CGST Act 2017 & IGST Act 2017 (CONFIRM WITH CA).

Rules & Mandates:
1. SAC 998311: Information Technology Software Services (18% GST standard rate).
2. Intra-State Supply (Supplier State Code == Recipient State Code):
   - 9% Central GST (CGST)
   - 9% State GST (SGST) / UTGST
   - 0% Integrated GST (IGST)
3. Inter-State Supply (Supplier State Code != Recipient State Code):
   - 0% CGST
   - 0% SGST
   - 18% IGST
4. Exact Paisa Math:
   - All arithmetic in integer paisa to prevent floating-point rounding errors.
   - Grand Total = Subtotal + CGST + SGST + IGST.
5. GSTIN Validation:
   - 15-character alphanumeric format with state-code prefix validation.
"""

import re
from typing import Dict, Any, Optional, Tuple

# Indian GST State Codes (2-digit prefix)
INDIAN_STATE_CODES: Dict[str, str] = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra & Nagar Haveli and Daman & Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
}

# 15-character statutory GSTIN regex
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")

# Default Software SAC Code & Rates
DEFAULT_SAC_CODE = "998311"
STANDARD_GST_RATE = 18.00  # 18% standard for IT SaaS (CONFIRM WITH CA)
INTRA_CGST_RATE = 9.00
INTRA_SGST_RATE = 9.00
INTER_IGST_RATE = 18.00


class GSTCalculator:
    """Statutory Indian GST calculation and validation utilities."""

    @staticmethod
    def validate_gstin(gstin: Optional[str]) -> Tuple[bool, Optional[str]]:
        """
        Validates an Indian 15-character GSTIN.
        Returns (is_valid, state_code).
        """
        if not gstin:
            return False, None
        cleaned = gstin.strip().upper()
        if not GSTIN_REGEX.match(cleaned):
            return False, None

        state_code = cleaned[:2]
        if state_code not in INDIAN_STATE_CODES:
            return False, None

        return True, state_code

    @staticmethod
    def get_state_name_from_code(state_code: str) -> str:
        """Returns the canonical state name for a 2-digit code."""
        code_str = str(state_code).zfill(2)
        return INDIAN_STATE_CODES.get(code_str, "Unknown State")

    @classmethod
    def calculate_gst_breakdown(
        cls,
        amount_paisa: int,
        supplier_state_code: str = "07",
        customer_state_code: str = "07",
        is_inclusive: bool = True,
        hsn_sac: str = DEFAULT_SAC_CODE,
    ) -> Dict[str, Any]:
        """
        Calculates exact GST tax split for either inclusive or exclusive pricing.

        Args:
            amount_paisa: Amount in integer paisa (e.g. ₹1,000.00 = 100000 paisa)
            supplier_state_code: 2-digit state code of Trinetra (default "07" for Delhi)
            customer_state_code: 2-digit state code of customer
            is_inclusive: If True, amount_paisa is grand_total (inclusive of GST).
                          If False, amount_paisa is taxable base (exclusive of GST).
            hsn_sac: Statutory SAC code

        Returns dictionary with complete itemized GST tax breakdown.
        """
        if amount_paisa <= 0:
            raise ValueError("Amount in paisa must be strictly positive.")

        s_code = str(supplier_state_code).zfill(2)
        c_code = str(customer_state_code).zfill(2)
        is_intra_state = (s_code == c_code)

        if is_inclusive:
            # Inclusive: Base = Amount / (1 + Rate / 100)
            # E.g. For ₹1,180 with 18% GST -> Base = ₹1,000, Tax = ₹180
            grand_total_paisa = amount_paisa
            subtotal_paisa = int(round(grand_total_paisa / (1.0 + (STANDARD_GST_RATE / 100.0))))
            total_tax_paisa = grand_total_paisa - subtotal_paisa

            if is_intra_state:
                cgst_rate = INTRA_CGST_RATE
                sgst_rate = INTRA_SGST_RATE
                igst_rate = 0.00

                # Split tax equally, allocating any 1-paisa rounding difference to SGST
                cgst_amount_paisa = total_tax_paisa // 2
                sgst_amount_paisa = total_tax_paisa - cgst_amount_paisa
                igst_amount_paisa = 0
            else:
                cgst_rate = 0.00
                sgst_rate = 0.00
                igst_rate = INTER_IGST_RATE
                cgst_amount_paisa = 0
                sgst_amount_paisa = 0
                igst_amount_paisa = total_tax_paisa

        else:
            # Exclusive: Base = Amount, Tax = Base * Rate / 100
            subtotal_paisa = amount_paisa
            if is_intra_state:
                cgst_rate = INTRA_CGST_RATE
                sgst_rate = INTRA_SGST_RATE
                igst_rate = 0.00

                cgst_amount_paisa = int(round(subtotal_paisa * (cgst_rate / 100.0)))
                sgst_amount_paisa = int(round(subtotal_paisa * (sgst_rate / 100.0)))
                igst_amount_paisa = 0
                total_tax_paisa = cgst_amount_paisa + sgst_amount_paisa
            else:
                cgst_rate = 0.00
                sgst_rate = 0.00
                igst_rate = INTER_IGST_RATE

                cgst_amount_paisa = 0
                sgst_amount_paisa = 0
                igst_amount_paisa = int(round(subtotal_paisa * (igst_rate / 100.0)))
                total_tax_paisa = igst_amount_paisa

            grand_total_paisa = subtotal_paisa + total_tax_paisa

        # Integrity sanity check: subtotal + taxes == grand_total
        assert subtotal_paisa + cgst_amount_paisa + sgst_amount_paisa + igst_amount_paisa == grand_total_paisa

        return {
            "is_intra_state": is_intra_state,
            "supply_type": "INTRA_STATE" if is_intra_state else "INTER_STATE",
            "supplier_state_code": s_code,
            "supplier_state_name": cls.get_state_name_from_code(s_code),
            "customer_state_code": c_code,
            "customer_state_name": cls.get_state_name_from_code(c_code),
            "place_of_supply": f"{c_code}-{cls.get_state_name_from_code(c_code)}",
            "hsn_sac_code": hsn_sac,
            "subtotal_paisa": subtotal_paisa,
            "subtotal_inr": round(subtotal_paisa / 100.0, 2),
            "cgst_rate_pct": cgst_rate,
            "cgst_amount_paisa": cgst_amount_paisa,
            "cgst_amount_inr": round(cgst_amount_paisa / 100.0, 2),
            "sgst_rate_pct": sgst_rate,
            "sgst_amount_paisa": sgst_amount_paisa,
            "sgst_amount_inr": round(sgst_amount_paisa / 100.0, 2),
            "igst_rate_pct": igst_rate,
            "igst_amount_paisa": igst_amount_paisa,
            "igst_amount_inr": round(igst_amount_paisa / 100.0, 2),
            "total_tax_paisa": total_tax_paisa,
            "total_tax_inr": round(total_tax_paisa / 100.0, 2),
            "grand_total_paisa": grand_total_paisa,
            "grand_total_inr": round(grand_total_paisa / 100.0, 2),
        }
