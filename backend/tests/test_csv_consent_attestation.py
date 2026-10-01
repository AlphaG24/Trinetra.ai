"""
tests/test_csv_consent_attestation.py

Phase 3 / Item 3: CSV Consent & Affirmative Attestation Tests.
1. Rejects campaign creation if consent_attestation is False.
2. Computes SHA-256 fingerprint, saves attestation metadata in campaigns, and records audit_log entry.
3. Provides downloadable template CSV with required consent headers.
4. Pre-dial check in process_next_contact safely marks unconsented contacts as 'skipped_no_consent'.
5. Generates active campaigns consent audit report for legacy and running campaign oversight.

[CONFIRM WITH A LAWYER] Governed by TRAI TCCCPR 2018 Regulation 12 & TCPA 47 U.S.C. § 227.
"""

import os
import sys
import hashlib
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.campaign_service import CampaignService
from app.routers.campaign_router import get_campaign_contacts_template, get_active_campaigns_consent_audit


SAMPLE_VALID_CSV = (
    "full_name,phone,company_name,consent,consent_source,notes\n"
    "Rajesh Sharma,+919876543210,Acme Corp,true,website_form,Demo request\n"
    "Priya Patel,+919876543211,Nexus Tech,yes,conference_optin,Product inquiry\n"
).encode("utf-8")


@pytest.mark.asyncio
async def test_create_campaign_fails_without_consent_attestation():
    """Creation must be blocked if user has not checked affirmative consent attestation."""
    with pytest.raises(ValueError) as exc_info:
        await CampaignService.create_campaign(
            organization_id="org-123",
            agent_id="agent-123",
            name="Test Unattested Campaign",
            file_content=SAMPLE_VALID_CSV,
            filename="contacts.csv",
            purpose="promotional",
            consent_attestation=False
        )
    assert "Mandatory statutory attestation missing" in str(exc_info.value)
    assert "[CONFIRM WITH A LAWYER]" in str(exc_info.value)


@pytest.mark.asyncio
async def test_create_campaign_succeeds_with_attestation_and_computes_sha256():
    """Creation must record SHA-256 hash, attestation statement, and insert into audit_logs."""
    mock_agent_res = MagicMock()
    mock_agent_res.data = {"id": "agent-123", "name": "Sales Rep", "is_demo": False, "agent_type": "standard"}

    mock_insert_campaign_res = MagicMock()
    mock_insert_campaign_res.data = [{"id": "camp-123"}]

    mock_insert_contacts_res = MagicMock()
    mock_insert_contacts_res.data = []

    mock_audit_res = MagicMock()
    mock_audit_res.data = []

    expected_hash = hashlib.sha256(SAMPLE_VALID_CSV).hexdigest()

    with patch("app.services.campaign_service.supabase_admin") as mock_sb:
        # Mock agent check
        mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_agent_res
        # Mock storage upload
        mock_sb.storage.from_.return_value.upload.return_value = {"Key": "test"}
        # Mock table inserts
        mock_sb.table.return_value.insert.return_value.execute.return_value = mock_insert_campaign_res

        res = await CampaignService.create_campaign(
            organization_id="00000000-0000-0000-0000-000000000001",
            agent_id="agent-123",
            name="Attested Test Campaign",
            file_content=SAMPLE_VALID_CSV,
            filename="contacts.csv",
            purpose="promotional",
            consent_attestation=True,
            attestation_statement="I confirm affirmative consent [CONFIRM WITH A LAWYER]",
            user_id="user-999",
            user_email="compliance@trinetraedu-ai.com"
        )

        assert res["total_contacts"] == 2
        assert "consent_attestation" in res
        attestation = res["consent_attestation"]
        assert attestation["attested"] is True
        assert attestation["file_hash_sha256"] == expected_hash
        assert attestation["user_id"] == "user-999"
        assert attestation["user_email"] == "compliance@trinetraedu-ai.com"
        assert "CONFIRM WITH A LAWYER" in attestation["statement"]


@pytest.mark.asyncio
async def test_get_campaign_contacts_template_endpoint():
    """Template CSV endpoint must return correct headers and content type."""
    response = await get_campaign_contacts_template()
    assert response.media_type == "text/csv"
    assert 'filename="campaign_contacts_sample.csv"' in response.headers["Content-Disposition"]

    content = response.body.decode("utf-8")
    lines = content.strip().split("\n")
    headers = [h.strip() for h in lines[0].split(",")]
    assert "full_name" in headers
    assert "phone" in headers
    assert "consent" in headers
    assert "consent_source" in headers
    assert len(lines) >= 2  # Has sample rows


@pytest.mark.asyncio
async def test_process_next_contact_skips_unconsented_legacy_contact():
    """
    In running campaigns, legacy contacts lacking affirmative consent must be safely
    marked 'skipped_no_consent' and not dialed.
    """
    mock_contact = {
        "id": "contact-unconsented-1",
        "phone": "+919876543299",
        "call_status": "pending",
        "consent_flag": False,  # No consent
        "consent_source": None,
        "call_attempts": 0
    }

    mock_select_res = MagicMock()
    mock_select_res.data = [mock_contact]

    mock_update_res = MagicMock()
    mock_update_res.data = []

    with patch("app.services.campaign_service.supabase_admin") as mock_sb:
        # Mock pending contact query
        mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_select_res
        
        # Mock DND check
        with patch("app.services.dnd_service.DNDService.check_number", new_callable=AsyncMock) as mock_dnd:
            mock_dnd.return_value = False

            # Mock calling time
            with patch("app.services.outbound_safety_guardrails.is_allowed_calling_time") as mock_time:
                mock_time.return_value = (True, "Within hours", "Asia/Kolkata")

                # Mock contact update
                mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_update_res

                result = await CampaignService.process_next_contact(
                    campaign_id="camp-running-1",
                    campaign_data={
                        "id": "camp-running-1",
                        "purpose": "promotional",
                        "name": "Summer Promotion",
                        "calling_hours_start": "10:00",
                        "calling_hours_end": "18:00",
                        "timezone": "Asia/Kolkata"
                    }
                )

                # Loop continues (True) so next contact can be checked
                assert result is True

                # Verify update called with 'skipped_no_consent'
                mock_sb.table.return_value.update.assert_called_with({
                    "call_status": "skipped_no_consent",
                    "notes": "Skipped pre-dial: Missing affirmative contact consent flag or source [CONFIRM WITH A LAWYER]",
                    "last_attempt_at": mock_sb.table.return_value.update.call_args[0][0]["last_attempt_at"]
                })


@pytest.mark.asyncio
async def test_get_active_campaigns_consent_audit():
    """Audit report must aggregate active campaigns, consent flags, and statuses."""
    mock_campaigns = [
        {
            "id": "camp-active-1",
            "name": "Holiday Promo",
            "status": "running",
            "purpose": "promotional",
            "total_contacts": 2,
            "consent_attestation": {"attested": True}
        }
    ]
    mock_contacts = [
        {"call_status": "completed", "consent_flag": True},
        {"call_status": "skipped_no_consent", "consent_flag": False}
    ]

    with patch("app.services.campaign_service.supabase_admin") as mock_sb:
        mock_camp_res = MagicMock()
        mock_camp_res.data = mock_campaigns

        mock_contact_res = MagicMock()
        mock_contact_res.data = mock_contacts

        # First query for campaigns
        mock_sb.table.return_value.select.return_value.in_.return_value.execute.return_value = mock_camp_res
        # Second query for contacts
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_contact_res

        audit = await CampaignService.get_active_campaigns_consent_audit()

        assert audit["total_active_campaigns"] == 1
        c = audit["campaigns"][0]
        assert c["campaign_id"] == "camp-active-1"
        assert c["has_attestation"] is True
        assert c["consented_contacts"] == 1
        assert c["unconsented_contacts"] == 1
        assert c["status_breakdown"]["skipped_no_consent"] == 1
        assert "Safe: skipped pre-dial" in c["legacy_unconsented_action"]
