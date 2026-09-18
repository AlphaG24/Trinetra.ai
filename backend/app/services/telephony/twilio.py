import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional

from twilio.rest import Client  # type: ignore
from twilio.base.exceptions import TwilioRestException  # type: ignore
from twilio.request_validator import RequestValidator  # type: ignore

from app.services.telephony.base import AbstractTelephonyProvider, DIDType, NumberStatus, AvailableNumber, ProvisionedNumber
from app.services.telephony.exceptions import (
    TelephonyProviderError, 
    NumberNotAvailableError, 
    ProvisioningFailedError, 
    ProviderAuthError,
    RateLimitExceededError
)
from app.services.config_service import ConfigService

logger = logging.getLogger("TwilioProvider")

class TwilioProvider(AbstractTelephonyProvider):
    def __init__(self):
        self.provider_name = "twilio"
        self.account_sid = ConfigService.get("TWILIO_ACCOUNT_SID")
        self.auth_token = ConfigService.get("TWILIO_AUTH_TOKEN")
        
        if not self.account_sid or not self.auth_token:
            raise ProviderAuthError(self.provider_name, "Twilio credentials are not set in environment or config")
            
        self.webhook_base = ConfigService.get("TRINETRA_WEBHOOK_BASE_URL") or os.getenv("TRINETRA_WEBHOOK_BASE_URL")
        if not self.webhook_base:
            raise ProviderAuthError(self.provider_name, "TRINETRA_WEBHOOK_BASE_URL not configured")
        
        try:
            self.client = Client(self.account_sid, self.auth_token)
            # Test auth
            self.client.api.accounts(self.account_sid).fetch()
        except TwilioRestException as e:
            raise ProviderAuthError(self.provider_name, f"Twilio authentication failed: {str(e)}")
            
        self.validator = RequestValidator(self.auth_token)

    def _mask_token(self) -> str:
        if len(self.auth_token) <= 8:
            return "***"
        return f"{self.auth_token[:4]}...{self.auth_token[-4:]}"

    def _handle_twilio_exception(self, e: TwilioRestException, action: str):
        if e.status == 401 or e.status == 403:
            raise ProviderAuthError(self.provider_name, f"Authentication failed during {action}")
        elif e.status == 404:
            raise NumberNotAvailableError(self.provider_name, f"Resource not found during {action}")
        elif e.status == 429:
            raise RateLimitExceededError(self.provider_name)
        else:
            raise TelephonyProviderError(self.provider_name, f"Twilio error during {action}: {e.msg}")

    async def list_available_numbers(self, city: Optional[str] = None, did_type: Optional[DIDType] = None) -> List[AvailableNumber]:
        """Search Twilio for available US numbers"""
        try:
            available = self.client.available_phone_numbers('US').local.list(
                voice_enabled=True,
                limit=20
            )
            
            numbers = []
            for num in available:
                # Extract area code from phone number
                parts = num.phone_number.replace('+1', '').strip().split()
                area = parts[0] if parts else ""
                
                numbers.append(AvailableNumber(
                    did_id=num.phone_number,  # Use phone number as ID
                    phone_number=num.phone_number,
                    city=f"{num.locality}, {num.region}" if num.locality else num.region,
                    area_code=area,
                    did_type=DIDType.LOCAL,
                    provider="twilio",
                    metadata={
                        "locality": num.locality,
                        "region": num.region,
                        "postal_code": getattr(num, 'postal_code', None),
                    }
                ))
            
            return numbers
        except Exception as e:
            logger.error(f"[Twilio] Error listing numbers: {str(e)}")
            return []

    async def provision_number(self, area_code: str, did_type: DIDType, organization_id: str, phone_number: Optional[str] = None) -> ProvisionedNumber:
        if isinstance(did_type, str):
            did_type = DIDType(did_type)
            
        logger.info(f"[Twilio] Provisioning number: area_code={area_code}, type={did_type.value}, org={organization_id}")
        
        # Check if webhook base URL is localhost
        localhost = 'localhost' in self.webhook_base or '127.0.0.1' in self.webhook_base
        
        # Build webhook URLs
        voice_url = None
        status_callback = None
        if not localhost:
            voice_url = f"{self.webhook_base}/api/voice/webhooks/voice/twilio/{organization_id}"
            status_callback = f"{self.webhook_base}/api/voice/webhooks/voice/twilio/status/{organization_id}"
            logger.info(f"[Twilio] Using webhook URL: {voice_url}")
        else:
            logger.warning("[Twilio] Localhost detected — skipping voice_url configuration")
        
        try:
            selected_number = phone_number
            locality = "US"
            region = "US"
            
            if not selected_number:
                # Search for available US numbers with voice capability
                # Don't restrict by area_code — trial accounts have limited inventory
                logger.info(f"[Twilio] Searching available US numbers...")
                
                available = self.client.available_phone_numbers('US').local.list(
                    voice_enabled=True,
                    limit=10
                )
                numbers_list = list(available)
                
                if not numbers_list:
                    raise NumberNotAvailableError("twilio", "No US phone numbers available. Check your Twilio trial balance.")
                
                # Pick the first available number
                selected = numbers_list[0]
                selected_number = selected.phone_number
                locality = selected.locality or "US"
                region = selected.region or "US"
                logger.info(f"[Twilio] Found number: {selected_number} ({locality}, {region})")
            else:
                logger.info(f"[Twilio] Provisioning specific number: {selected_number}")
                
            # Provision the number
            create_params = {
                'phone_number': selected_number,
            }
            
            if not localhost:
                create_params['voice_url'] = voice_url
                create_params['voice_method'] = 'POST'
                create_params['status_callback'] = status_callback
                create_params['status_callback_method'] = 'POST'
            
            number = self.client.incoming_phone_numbers.create(**create_params)
            
            logger.info(f"[Twilio] Provisioned: {number.phone_number} (SID: {number.sid})")
            
            # Extract area code from the purchased number
            # e.g., +1 734 382 4916 → area code is "734"
            phone_parts = selected_number.replace('+1', '').strip().split()
            extracted_area_code = phone_parts[0] if phone_parts else area_code
            
            import uuid
            return ProvisionedNumber(
                trinetra_id=str(uuid.uuid4()),
                provider_number_id=number.sid,
                phone_number=number.phone_number,
                city=locality,
                area_code=extracted_area_code,
                did_type=did_type,
                status=NumberStatus.ACTIVE,
                provider="twilio",
                provisioned_at=datetime.now(timezone.utc),
                metadata={
                    "twilio_sid": number.sid,
                    "region": region,
                    "locality": locality,
                    "voice_url": voice_url
                }
            )
            
        except TwilioRestException as e:
            logger.error(f"[Twilio] Twilio error: {e.msg} (code: {e.code})")
            if e.code == 21404:
                raise NumberNotAvailableError(
                    "twilio", 
                    "Trial accounts are limited to one phone number. Please release your existing number in the Phone Numbers page before buying a new one, or upgrade your Twilio account."
                )
            elif e.code == 21452:
                raise NumberNotAvailableError("twilio", "No phone numbers available in this area. Please try a different area code.")
            else:
                raise ProvisioningFailedError("twilio", f"Twilio error: {e.msg}")
        except Exception as e:
            logger.error(f"[Twilio] Unexpected error: {str(e)}")
            if isinstance(e, NumberNotAvailableError):
                raise
            raise ProvisioningFailedError("twilio", str(e))

    async def release_number(self, provider_number_id: str) -> bool:
        logger.info(f"[{self.provider_name}] Releasing number {provider_number_id}")
        try:
            self.client.incoming_phone_numbers(provider_number_id).delete()
            return True
        except TwilioRestException as e:
            if e.status == 404:
                return True
            self._handle_twilio_exception(e, "release_number")

    async def get_number_status(self, provider_number_id: str) -> NumberStatus:
        logger.info(f"[{self.provider_name}] Checking status for {provider_number_id}")
        try:
            number = self.client.incoming_phone_numbers(provider_number_id).fetch()
            # Twilio doesn't have an exact equivalent of provisioning/active for purchased numbers, 
            # if it fetches successfully, it's active
            return NumberStatus.ACTIVE
        except TwilioRestException as e:
            if e.status == 404:
                return NumberStatus.RELEASED
            self._handle_twilio_exception(e, "get_number_status")

    async def create_call_routing(self, phone_number: str, organization_id: str) -> Dict:
        voice_url = f"{self.webhook_base}/api/voice/webhooks/voice/twilio/{organization_id}"
        logger.info(f"[{self.provider_name}] Updating routing for *** -> {voice_url}")
        
        try:
            # Find the number by phone_number
            numbers = self.client.incoming_phone_numbers.list(phone_number=phone_number, limit=1)
            if not numbers:
                raise TelephonyProviderError(self.provider_name, f"Number {phone_number} not found in Twilio account")
                
            number = numbers[0]
            number.update(
                voice_url=voice_url,
                voice_method="POST"
            )
            
            return {
                "routing_id": number.sid,
                "webhook_url": voice_url,
                "status": "active"
            }
        except TwilioRestException as e:
            self._handle_twilio_exception(e, "create_call_routing")

    async def create_outbound_session(self, agent_config: Dict) -> Dict:
        logger.info(f"[{self.provider_name}] Creating TwiML App for outbound session")
        # Step 1: Create a TwiML App
        # In a real app we might reuse one TwiML app, but per instructions we create one here
        # or we might extract org_id from agent_config
        org_id = agent_config.get("organization_id", "default")
        voice_url = f"{self.webhook_base}/twiml/outbound/{org_id}"
        
        try:
            app = self.client.applications.create(
                friendly_name=f"Trinetra Outbound {org_id}",
                voice_url=voice_url,
                voice_method="POST"
            )
            
            return {
                "session_id": app.sid,
                "twiml_app_sid": app.sid,
                "websocket_url": None,
                "status": "configured"
            }
        except TwilioRestException as e:
            self._handle_twilio_exception(e, "create_outbound_session")

    async def make_outbound_call(self, to_number: str, from_number: str, webhook_url: str, custom_parameters: Optional[dict] = None) -> dict:
        logger.info(f"[{self.provider_name}] Placing outbound call to {to_number} from {from_number} (webhook: {webhook_url})")
        if custom_parameters:
            import urllib.parse
            url_parts = list(urllib.parse.urlparse(webhook_url))
            query = dict(urllib.parse.parse_qsl(url_parts[4]))
            query.update({k: str(v) for k, v in custom_parameters.items() if v is not None})
            url_parts[4] = urllib.parse.urlencode(query)
            webhook_url = urllib.parse.urlunparse(url_parts)
            logger.info(f"[{self.provider_name}] Appended custom parameters to webhook URL: {webhook_url}")
            
        ws_base = self.webhook_base.replace("https://", "wss://").replace("http://", "ws://")
        room_name = (custom_parameters.get("room_name") if custom_parameters else None) or f"twilio-{uuid.uuid4().hex[:12]}"
        
        stream_url = f"{ws_base}/api/voice/webhooks/voice/twilio/stream/{room_name}"
        if "ngrok" in ws_base:
            stream_url += "?ngrok-skip-browser-warning=true"

        media_stream_twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{stream_url}">
            <Parameter name="room_name" value="{room_name}" />
        </Stream>
    </Connect>
    <Pause length="3600" />
</Response>"""

        status_cb = f"{self.webhook_base}/api/voice/webhooks/voice/twilio/status/default"
        if "ngrok" in status_cb:
            status_cb += "?ngrok-skip-browser-warning=true"
        for attempt in range(2):
            try:
                # Pass direct Media Stream TwiML instructions!
                # By passing twiml directly, Twilio executes from memory without any HTTP webhook roundtrip,
                # completely eliminating HTTP 404, 503, and "An application error has occurred" failures!
                recording_cb = f"{self.webhook_base}/api/voice/webhooks/voice/twilio/recording/default"
                if "ngrok" in recording_cb:
                    recording_cb += "?ngrok-skip-browser-warning=true"
                call = self.client.calls.create(
                    to=to_number,
                    from_=from_number,
                    twiml=media_stream_twiml,
                    status_callback=status_cb,
                    status_callback_event=['answered', 'completed'],
                    status_callback_method='POST',
                    record=True,
                    recording_status_callback=recording_cb,
                    recording_status_callback_method='POST'
                )
                return {"call_sid": call.sid, "status": call.status, "room_name": room_name}
            except TwilioRestException as e:
                self._handle_twilio_exception(e, "make_outbound_call")
            except Exception as e:
                err_str = str(e)
                if ("RemoteDisconnected" in err_str or "Connection aborted" in err_str) and attempt == 0:
                    logger.warning(f"[{self.provider_name}] Stale connection drop in Twilio client. Re-initializing client and retrying...")
                    self.client = Client(self.account_sid, self.auth_token)
                    continue
                logger.error(f"[{self.provider_name}] Unexpected error placing outbound call: {e}")
                raise TelephonyProviderError(self.provider_name, str(e))

    async def validate_webhook_request(self, request_data: Dict, signature: str) -> bool:
        url = request_data.get("_url", "")
        params = request_data.get("_params", {})
        return self.validator.validate(url, params, signature)

    async def list_provisioned_numbers(self) -> list:
        """Return all active numbers purchased from Twilio."""
        numbers = self.client.incoming_phone_numbers.list(limit=100)
        result = []
        for num in numbers:
            phone_clean = num.phone_number.replace('+1', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '').strip()
            area_code = phone_clean[:3] if len(phone_clean) >= 3 else ""
            result.append({
                "provider_number_id": num.sid,
                "phone_number": num.phone_number,
                "area_code": area_code,
                "city": num.friendly_name if num.friendly_name else "US",
                "did_type": "local",
                "monthly_cost_paisa": 115,
                "metadata": {"twilio_sid": num.sid, "voice_url": num.voice_url},
                "provisioned_at": num.date_created.isoformat() if num.date_created else None
            })
        return result
