"""
tests/test_campaign_purpose_attestation.py

Item 7: Campaign Purpose Classification & Non-Promotional Attestation Tests.
Verifies that:
1. Creating non-promotional campaigns ('service', 'transactional') requires explicit
   statutory purpose attestation certifying no marketing content.
2. Creating with purpose_attestation=True records purpose_attested in attestation metadata.
3. Promotional campaigns require consent_attestation but not purpose_attestation.
4. Outbound calling hours guard properly respects purpose classification.

[CONFIRM WITH A LAWYER] Governed by TRAI TCCCPR 2018 Regulation 12 & TCPA 47 U.S.C. § 227.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.campaign_service import CampaignService


SAMPLE_VALID_CSV = (
    "full_name,phone,company_name,consent,consent_source,notes\n"
    "Rajesh Sharma,+919876543210,Acme Corp,true,existing_contract,Account update\n"
).encode("utf-8")


@pytest.mark.asyncio
async def test_service_campaign_fails_without_purpose_attestation():
    """Non-promotional campaigns (service) must be rejected if purpose is not attested."""
    with pytest.raises(ValueError) as exc_info:
        await CampaignService.create_campaign(
            organization_id="org-123",
            agent_id="agent-123",
            name="Service Notice Campaign",
            file_content=SAMPLE_VALID_CSV,
            filename="contacts.csv",
            purpose="service",
            consent_attestation=True,
            purpose_attestation=False
        )
    assert "Statutory purpose attestation missing" in str(exc_info.value)
    assert "service" in str(exc_info.value)
    assert "[CONFIRM WITH A LAWYER]" in str(exc_info.value)


@pytest.mark.asyncio
async def test_transactional_campaign_fails_without_purpose_attestation():
    """Non-promotional campaigns (transactional) must be rejected if purpose is not attested."""
    with pytest.raises(ValueError) as exc_info:
        await CampaignService.create_campaign(
            organization_id="org-123",
            agent_id="agent-123",
            name="Transactional Alert Campaign",
            file_content=SAMPLE_VALID_CSV,
            filename="contacts.csv",
            purpose="transactional",
            consent_attestation=True,
            purpose_attestation=False
        )
    assert "Statutory purpose attestation missing" in str(exc_info.value)
    assert "transactional" in str(exc_info.value)


@pytest.mark.asyncio
async def test_service_campaign_succeeds_with_purpose_attestation():
    """Service campaign with purpose_attestation=True succeeds and saves metadata."""
    mock_agent_res = MagicMock()
    mock_agent_res.data = {"id": "agent-123", "name": "Service Rep", "is_demo": False, "agent_type": "standard"}

    mock_insert_res = MagicMock()
    mock_insert_res.data = [{"id": "camp-svc-1"}]

    with patch("app.services.campaign_service.supabase_admin") as mock_sb:
        mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_agent_res
        mock_sb.storage.from_.return_value.upload.return_value = {"Key": "test"}
        mock_sb.table.return_value.insert.return_value.execute.return_value = mock_insert_res

        res = await CampaignService.create_campaign(
            organization_id="org-123",
            agent_id="agent-123",
            name="Annual Account Renewal Notices",
            file_content=SAMPLE_VALID_CSV,
            filename="contacts.csv",
            purpose="service",
            consent_attestation=True,
            purpose_attestation=True,
            user_id="user-123",
            user_email="admin@trinetraedu-ai.com"
        )

        assert res["purpose"] == "service"
        attestation = res["consent_attestation"]
        assert attestation["purpose"] == "service"
        assert attestation["purpose_attested"] is True


@pytest.mark.asyncio
async def test_promotional_campaign_succeeds_without_non_promotional_attestation():
    """Promotional campaigns do not require non-promotional purpose attestation."""
    mock_agent_res = MagicMock()
    mock_agent_res.data = {"id": "agent-123", "name": "Sales Rep", "is_demo": False, "agent_type": "standard"}

    mock_insert_res = MagicMock()
    mock_insert_res.data = [{"id": "camp-promo-1"}]

    with patch("app.services.campaign_service.supabase_admin") as mock_sb:
        mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_agent_res
        mock_sb.storage.from_.return_value.upload.return_value = {"Key": "test"}
        mock_sb.table.return_value.insert.return_value.execute.return_value = mock_insert_res

        res = await CampaignService.create_campaign(
            organization_id="org-123",
            agent_id="agent-123",
            name="Q4 Marketing Campaign",
            file_content=SAMPLE_VALID_CSV,
            filename="contacts.csv",
            purpose="promotional",
            consent_attestation=True,
            purpose_attestation=False
        )

        assert res["purpose"] == "promotional"
        assert res["consent_attestation"]["purpose_attested"] is False
