"""
tests/test_whatsapp_guard_integration.py

Item 2: WhatsApp guard:
- Opt-in, approved-template, and DND checks ONLY for messages to end customers.
- Owner notifications (lead_captured, callback_scheduled, campaign_completed)
  and in-call 'send details to the owner' MUST keep working.
- Regression tests.
"""
import pytest
import unittest
from unittest.mock import MagicMock, AsyncMock, patch
from app.services.integration_executor import IntegrationExecutor


class TestWhatsAppGuardIntegration(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.executor = IntegrationExecutor()

    @patch("app.services.outbound_safety_guardrails.check_internal_dnd", new_callable=AsyncMock)
    async def test_customer_message_blocked_if_on_dnd(self, mock_dnd):
        """Messages to end-customers are strictly blocked if customer is registered on DND."""
        mock_dnd.return_value = True  # Customer is on DND
        config = {
            "twilio_sid": "AC12345",
            "auth_token": "token123",
            "phone_number": "+14155550100"
        }
        data = {
            "contact_phone": "+919876543210",
            "recipient_type": "customer",
            "is_proactive": False
        }

        sent = await self.executor._send_whatsapp(config, "Hello customer", data)
        self.assertFalse(sent)
        mock_dnd.assert_called_once()

    @patch("app.services.outbound_safety_guardrails.check_internal_dnd", new_callable=AsyncMock)
    async def test_customer_proactive_message_blocked_without_opt_in(self, mock_dnd):
        """Proactive customer message is blocked if affirmative opt-in is missing."""
        mock_dnd.return_value = False  # Not on DND
        config = {
            "twilio_sid": "AC12345",
            "auth_token": "token123",
            "phone_number": "+14155550100"
        }
        data = {
            "contact_phone": "+919876543210",
            "recipient_type": "customer",
            "is_proactive": True,
            "whatsapp_opt_in": False,
            "template_name": "service_appointment_reminder"
        }

        sent = await self.executor._send_whatsapp(config, "Your appointment is confirmed", data)
        self.assertFalse(sent)

    @patch("app.services.outbound_safety_guardrails.check_internal_dnd", new_callable=AsyncMock)
    async def test_customer_proactive_message_blocked_with_unregistered_template(self, mock_dnd):
        """Proactive customer message is blocked if using an arbitrary unapproved template."""
        mock_dnd.return_value = False
        config = {
            "twilio_sid": "AC12345",
            "auth_token": "token123",
            "phone_number": "+14155550100"
        }
        data = {
            "contact_phone": "+919876543210",
            "recipient_type": "customer",
            "is_proactive": True,
            "whatsapp_opt_in": True,
            "template_name": "random_unregistered_blast"
        }

        sent = await self.executor._send_whatsapp(config, "Special discount 50%", data)
        self.assertFalse(sent)

    @patch("httpx.AsyncClient.post", new_callable=AsyncMock)
    @patch("app.services.outbound_safety_guardrails.check_internal_dnd", new_callable=AsyncMock)
    async def test_customer_message_succeeds_with_opt_in_and_approved_template(self, mock_dnd, mock_post):
        """Valid customer message with opt-in, approved template, and not on DND is sent."""
        mock_dnd.return_value = False
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = {"sid": "SM12345", "status": "queued"}
        mock_post.return_value = mock_resp

        config = {
            "twilio_sid": "AC12345",
            "auth_token": "token123",
            "phone_number": "+14155550100"
        }
        data = {
            "contact_phone": "+919876543210",
            "recipient_type": "customer",
            "is_proactive": True,
            "whatsapp_opt_in": True,
            "template_name": "service_appointment_reminder"
        }

        sent = await self.executor._send_whatsapp(config, "Your appointment is confirmed", data)
        self.assertTrue(sent)
        mock_dnd.assert_called_once()
        mock_post.assert_called_once()

    @patch("httpx.AsyncClient.post", new_callable=AsyncMock)
    @patch("app.services.outbound_safety_guardrails.check_internal_dnd", new_callable=AsyncMock)
    async def test_owner_lead_alert_bypasses_customer_dnd_and_opt_in(self, mock_dnd, mock_post):
        """Lead alert to business owner must keep working without customer DND or opt-in checks."""
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = {"sid": "SM_OWNER_123", "status": "queued"}
        mock_post.return_value = mock_resp

        config = {
            "twilio_sid": "AC12345",
            "auth_token": "token123",
            "phone_number": "+14155550100",
            "target_phone": "+919988776655"  # Business owner's phone
        }
        data = {
            "event_type": "lead_captured",
            "contact_name": "Rahul Sharma",
            "contact_phone": "+919876543210",  # Lead's phone
            "recipient_type": "owner",
            "interest_level": "hot",
            "budget_range": "Flexible",
            "call_summary": "Prospect interested in annual subscription"
        }

        sent = await self.executor._send_whatsapp(config, "Qualified Lead Alert", data)
        self.assertTrue(sent)
        # Crucial check: check_internal_dnd must NOT be called for owner alerts
        mock_dnd.assert_not_called()
        mock_post.assert_called_once()

    @patch("httpx.AsyncClient.post", new_callable=AsyncMock)
    @patch("app.services.outbound_safety_guardrails.check_internal_dnd", new_callable=AsyncMock)
    async def test_owner_callback_alert_bypasses_customer_guards(self, mock_dnd, mock_post):
        """Callback scheduled alert to business owner must keep working."""
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = {"sid": "SM_OWNER_456"}
        mock_post.return_value = mock_resp

        config = {
            "twilio_sid": "AC12345",
            "auth_token": "token123",
            "phone_number": "+14155550100",
            "target_phone": "+919988776655"
        }
        data = {
            "event_type": "callback_scheduled",
            "recipient_type": "owner",
            "contact_name": "Anita Verma",
            "scheduled_at": "2026-10-02 11:00 AM"
        }

        sent = await self.executor._send_whatsapp(config, "Callback Scheduled", data)
        self.assertTrue(sent)
        mock_dnd.assert_not_called()

    @patch("httpx.AsyncClient.post", new_callable=AsyncMock)
    @patch("app.services.outbound_safety_guardrails.check_internal_dnd", new_callable=AsyncMock)
    async def test_in_call_send_details_to_owner_keeps_working(self, mock_dnd, mock_post):
        """In-call 'send details to the owner' dispatches successfully bypassing consumer guards."""
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = {"sid": "SM_OWNER_789"}
        mock_post.return_value = mock_resp

        # Mock agent integration lookup returning WhatsApp for owner
        mock_integration = [{
            "integration_types": {"slug": "whatsapp"},
            "config": {
                "twilio_sid": "AC12345",
                "auth_token": "token123",
                "phone_number": "+14155550100",
                "target_phone": "+919988776655"
            }
        }]

        with patch.object(self.executor, "_get_agent_integrations", new_callable=AsyncMock) as mock_get_itg:
            mock_get_itg.return_value = mock_integration

            details = {
                "contact_name": "Sunil Gupta",
                "contact_phone": "+919123456789",
                "notes": "Caller requested urgent pricing quote for 50 agents"
            }

            result = await self.executor.send_details_to_owner(
                agent_id="agent-abc",
                details=details
            )

            self.assertTrue(result)
            mock_dnd.assert_not_called()
            mock_post.assert_called_once()
