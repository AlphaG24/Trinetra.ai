"""
tests/test_a2_sensitive_detail_withholding.py

A2: On ALL outbound calls, health/financial/appointment/order details must be
withheld from the opening greeting until identity is confirmed.
This applies whether or not the caller name is known.
"""
import pytest
from app.services.disclosure_service import compose_single_opening_greeting


class TestSensitiveDetailWithholding:
    """
    Sensitive details must never appear in the opening greeting of an outbound call.
    The opening must ask for identity confirmation instead.
    """

    # -----------------------------------------------------------------------
    # Health / medical
    # -----------------------------------------------------------------------
    def test_test_reports_ready_named_caller_outbound(self):
        """'test reports are ready' must not appear; identity confirmation must."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Your test reports are ready. Please confirm your visit.",
            agent_name="Anika",
            business_name="MediCare Clinic",
            caller_name="Rahul Sharma",
            direction="outbound",
            language="hinglish",
            gender_tag="female",
        )
        assert "test report" not in greeting.lower(), "Sensitive health detail leaked before identity confirmation"
        assert "visit" not in greeting.lower(), "Appointment detail leaked before identity confirmation"
        # Must ask identity
        assert any(w in greeting.lower() for w in ["rahul", "speaking", "baat", "confirm"]), \
            f"No identity confirmation prompt found in: {greeting}"

    def test_doctor_appointment_unnamed_caller_outbound_hinglish(self):
        """Unknown caller + 'doctor visit' purpose -> must NOT reveal purpose, must ask neutral identity."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Calling to confirm your doctor appointment tomorrow.",
            agent_name="Arjun",
            business_name="City Hospital",
            caller_name=None,
            direction="outbound",
            language="hinglish",
            gender_tag="male",
        )
        assert "doctor" not in greeting.lower(), f"Sensitive detail 'doctor' leaked: {greeting}"
        assert "appointment" not in greeting.lower(), f"Sensitive detail 'appointment' leaked: {greeting}"
        # Must have a neutral identity check
        assert any(w in greeting.lower() for w in ["right person", "sahi vyakti", "confirm"]), \
            f"No neutral identity confirmation: {greeting}"

    def test_doctor_appointment_named_caller_outbound_hindi(self):
        """Named caller + 'doctor appointment' -> identity confirmation using caller name in Hindi."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Aapka doctor appointment kal hai.",
            agent_name="Priya",
            business_name="Sahyog Hospital",
            caller_name="Meera Singh",
            direction="outbound",
            language="hi",
            gender_tag="female",
        )
        assert "appointment" not in greeting.lower() and "डॉक्टर" not in greeting, \
            f"Sensitive detail leaked: {greeting}"
        assert "meera" in greeting.lower() or "मीरा" in greeting, \
            f"Named identity confirmation missing: {greeting}"

    def test_prescription_outbound_english(self):
        """'prescription' in greeting -> must be suppressed."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Your prescription is ready for pickup.",
            agent_name="Aria",
            business_name="PharmaCare",
            caller_name="John Smith",
            direction="outbound",
            language="en",
            gender_tag="female",
        )
        assert "prescription" not in greeting.lower(), f"Prescription detail leaked: {greeting}"
        assert "john" in greeting.lower(), "Named identity confirmation missing"

    def test_medical_report_purpose_suppressed(self):
        """Sensitive purpose itself must not appear in the disclosure section."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="",
            agent_name="Dev",
            business_name="DiagnosticLab",
            caller_name=None,
            direction="outbound",
            language="en",
            gender_tag="male",
            purpose="your blood test report is ready",
        )
        assert "blood" not in greeting.lower(), f"Sensitive purpose leaked: {greeting}"
        assert "report" not in greeting.lower(), f"Sensitive purpose leaked: {greeting}"

    # -----------------------------------------------------------------------
    # Financial
    # -----------------------------------------------------------------------
    def test_emi_due_outbound_hinglish(self):
        """'EMI due' must not appear in opening."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Aapki EMI due hai. Please make payment.",
            agent_name="Riya",
            business_name="Bajaj Finance",
            caller_name="Suresh Kumar",
            direction="outbound",
            language="hinglish",
            gender_tag="female",
        )
        assert "emi" not in greeting.lower(), f"Financial detail 'EMI' leaked: {greeting}"
        assert "payment" not in greeting.lower(), f"Financial detail 'payment' leaked: {greeting}"
        assert "suresh" in greeting.lower(), "Named identity confirmation missing"

    def test_account_balance_outbound_english(self):
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Your account balance is low. Please add funds.",
            agent_name="Aria",
            business_name="Trinetra Bank",
            caller_name=None,
            direction="outbound",
            language="en",
            gender_tag="female",
        )
        assert "balance" not in greeting.lower(), f"Financial detail 'balance' leaked: {greeting}"
        assert "account" not in greeting.lower(), f"Financial detail 'account' leaked: {greeting}"

    def test_loan_outbound_hindi(self):
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Aapka loan approve ho gaya hai.",
            agent_name="Kabir",
            business_name="FinServ India",
            caller_name="Anita Verma",
            direction="outbound",
            language="hi",
            gender_tag="male",
        )
        assert "loan" not in greeting.lower(), f"Financial detail 'loan' leaked: {greeting}"
        # Hindi named confirmation: name may appear as Devanagari or transliteration in identity prompt
        assert any(w in greeting.lower() for w in ["anita", "baat kar"]), f"Named confirmation missing: {greeting}"

    def test_insurance_policy_outbound(self):
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Your insurance policy renewal is due.",
            agent_name="Neha",
            business_name="SafeLife Insurance",
            caller_name=None,
            direction="outbound",
            language="en",
            gender_tag="female",
        )
        # 'insurance' legitimately appears in the business name 'SafeLife Insurance' in the mandatory disclosure.
        # What must NOT appear is the sensitive content from the dashboard greeting (policy, renewal, due).
        assert "policy" not in greeting.lower(), f"Financial detail 'policy' leaked: {greeting}"
        assert "renewal" not in greeting.lower(), f"Financial detail 'renewal' leaked: {greeting}"
        assert "due" not in greeting.lower(), f"Financial detail 'due' leaked: {greeting}"

    # -----------------------------------------------------------------------
    # Orders / delivery
    # -----------------------------------------------------------------------
    def test_delivery_outbound_hinglish(self):
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Aapka order delivery ke liye ready hai.",
            agent_name="Dev",
            business_name="QuickShop",
            caller_name=None,
            direction="outbound",
            language="hinglish",
            gender_tag="male",
        )
        assert "order" not in greeting.lower(), f"Order detail 'order' leaked: {greeting}"
        assert "delivery" not in greeting.lower(), f"Order detail 'delivery' leaked: {greeting}"

    def test_booking_confirmation_outbound(self):
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Your hotel booking is confirmed for tomorrow.",
            agent_name="Priya",
            business_name="TravelEasy",
            caller_name="Rajan Mehta",
            direction="outbound",
            language="en",
            gender_tag="female",
        )
        assert "booking" not in greeting.lower(), f"Booking detail leaked: {greeting}"
        assert "rajan" in greeting.lower(), "Named identity confirmation missing"

    # -----------------------------------------------------------------------
    # Inbound calls are NOT affected (sensitive details allowed)
    # -----------------------------------------------------------------------
    def test_inbound_call_sensitive_detail_not_suppressed(self):
        """Inbound calls do not have this restriction — caller calls us; no pre-disclosure risk."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Welcome to our medical helpline.",
            agent_name="Arika",
            business_name="HealthHelp",
            caller_name=None,
            direction="inbound",
            language="en",
            gender_tag="female",
        )
        # Inbound: should NOT have outbound identity confirmation prompt
        assert "right person" not in greeting.lower(), \
            "Outbound identity confirmation should not appear on inbound calls"
        assert "could i confirm" not in greeting.lower(), \
            f"Outbound identity check should not appear on inbound: {greeting}"

    # -----------------------------------------------------------------------
    # Non-sensitive outbound — no unnecessary confirmation
    # -----------------------------------------------------------------------
    def test_non_sensitive_outbound_no_identity_check(self):
        """A non-sensitive outbound greeting (e.g., promotional) should NOT trigger identity check."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="We have an exciting new offer for you today!",
            agent_name="Sunny",
            business_name="PromoApp",
            caller_name=None,
            direction="outbound",
            language="en",
            gender_tag="male",
        )
        # Non-sensitive, no identity confirmation required
        assert "right person" not in greeting.lower(), \
            f"Unexpected identity check for non-sensitive outbound: {greeting}"

    # -----------------------------------------------------------------------
    # Verify confirmed-identity line uses correct gender
    # -----------------------------------------------------------------------
    def test_identity_confirmation_female_gender_verb(self):
        """Female agent identity confirmation must use feminine form."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Your test reports are ready.",
            agent_name="Priya",
            business_name="HealthLab",
            caller_name="Rahul Verma",
            direction="outbound",
            language="hinglish",
            gender_tag="female",
        )
        # The identity confirmation should contain feminine verb
        assert "rahi" in greeting.lower(), \
            f"Female agent should use 'rahi' in identity confirmation: {greeting}"

    def test_identity_confirmation_male_gender_verb(self):
        """Male agent identity confirmation must use masculine form."""
        greeting, _, _ = compose_single_opening_greeting(
            dashboard_greeting="Your appointment is scheduled.",
            agent_name="Rohan",
            business_name="ClinicX",
            caller_name="Priya Sharma",
            direction="outbound",
            language="hinglish",
            gender_tag="male",
        )
        assert "raha" in greeting.lower(), \
            f"Male agent should use 'raha' in identity confirmation: {greeting}"
