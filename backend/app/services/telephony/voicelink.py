import os
import json
import time
import logging
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Optional

from app.services.telephony.base import AbstractTelephonyProvider, DIDType, NumberStatus, AvailableNumber, ProvisionedNumber
from app.services.telephony.exceptions import (
    TelephonyProviderError, 
    NumberNotAvailableError, 
    ProvisioningFailedError, 
    ProviderAuthError,
    RateLimitExceededError
)
from app.services.config_service import ConfigService

BASE_URL = "https://app.voicelink.co.in/api/v1"
CONFIG_API_KEY = "VOICELINK_API_KEY"
CONFIG_BASE_URL = "VOICELINK_API_BASE_URL"

class VoiceLinkProvider(AbstractTelephonyProvider):
    def __init__(self):
        self.provider_name = "voicelink"
        
        # Fetch API key from config (with env fallback)
        self.api_key = ConfigService.get(CONFIG_API_KEY) or os.getenv("VOICELINK_API_KEY")
        if not self.api_key:
            raise ProviderAuthError("voicelink", "VOICELINK_API_KEY not configured")
        
        # Allow base URL override from config
        configured_base = ConfigService.get(CONFIG_BASE_URL)
        self.base_url = configured_base or BASE_URL
        
        # Webhook base URL for call routing
        self.webhook_base = ConfigService.get("TRINETRA_WEBHOOK_BASE_URL") or os.getenv("TRINETRA_WEBHOOK_BASE_URL")
        if not self.webhook_base:
            raise ProviderAuthError("voicelink", "TRINETRA_WEBHOOK_BASE_URL not configured")
        
        # HTTP client (created on demand, not in init — httpx.AsyncClient)
        self._client = None
        
        # Auth token management
        self._auth_token = None
        self._token_expires_at = None
        
        # Logger
        self.logger = logging.getLogger("VoiceLinkProvider")

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with auth headers"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _ensure_auth(self) -> str:
        """Ensure we have a valid auth token, refreshing if needed"""
        # VoiceLink uses Sanctum tokens — they may expire
        # For now, assume token from API key doesn't expire (Bearer token from dashboard)
        # If they require login flow, implement POST /v1/auth/login here
        return self.api_key

    def _get_headers(self) -> dict:
        """Get request headers with auth"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        """Make an API request with error handling and logging"""
        url = f"{self.base_url}{path}"
        headers = self._get_headers()
        
        start_time = time.time()
        masked_key = f"{self.api_key[:4]}...{self.api_key[-4:]}" if len(self.api_key) > 8 else "****"
        self.logger.info(f"[VoiceLink] {method} {path} (key: {masked_key})")
        
        try:
            client = await self._get_client()
            response = await client.request(method, url, headers=headers, **kwargs)
            elapsed = time.time() - start_time
            
            self.logger.info(f"[VoiceLink] {method} {path} → {response.status_code} ({elapsed:.2f}s)")
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After", "60")
                raise RateLimitExceededError("voicelink", f"Rate limited. Retry after {retry_after}s")
            
            # Handle auth errors
            if response.status_code in (401, 403):
                raise ProviderAuthError("voicelink", "Invalid or expired API key")
            
            # Handle server errors
            if response.status_code >= 500:
                raise TelephonyProviderError("voicelink", f"VoiceLink server error: {response.status_code}")
            
            # Parse response
            data = response.json()
            
            # Check for API-level errors (some APIs wrap errors in 200 responses)
            if isinstance(data, dict) and data.get("error"):
                raise TelephonyProviderError("voicelink", data.get("error"))
            
            return data
            
        except httpx.TimeoutException:
            elapsed = time.time() - start_time
            self.logger.error(f"[VoiceLink] {method} {path} → TIMEOUT after {elapsed:.2f}s")
            raise TelephonyProviderError("voicelink", "Request timed out")
        except httpx.ConnectError:
            raise TelephonyProviderError("voicelink", "Cannot connect to VoiceLink API")
        except (ProviderAuthError, RateLimitExceededError, TelephonyProviderError):
            raise  # Re-raise our custom exceptions
        except Exception as e:
            self.logger.error(f"[VoiceLink] Unexpected error: {str(e)}")
            raise TelephonyProviderError("voicelink", f"Unexpected error: {str(e)}")

    async def list_available_numbers(self, city: Optional[str] = None, did_type: Optional[DIDType] = None) -> List[AvailableNumber]:
        """
        GET /v1/reseller/purchase/dids
        Query params: city (optional), type (optional)
        """
        params = {}
        if city:
            params["city"] = city
        if did_type:
            params["type"] = did_type.value
        
        data = await self._request("GET", "/reseller/purchase/dids", params=params)
        
        # Expected response: { "data": [{ "id": "...", "number": "+91...", "city": "...", "type": "...", ... }] }
        dids = data.get("data", []) if isinstance(data, dict) else data
        
        numbers = []
        for did in dids:
            numbers.append(AvailableNumber(
                did_id=str(did.get("id")),
                phone_number=did.get("number") or did.get("phone_number"),
                city=did.get("city", ""),
                area_code=did.get("area_code", ""),
                did_type=DIDType(did.get("type", "mobile")),
                provider="voicelink",
                metadata={"raw": did}
            ))
        
        return numbers

    async def provision_number(self, area_code: str, did_type: DIDType, organization_id: str, phone_number: Optional[str] = None) -> ProvisionedNumber:
        """
        Multi-step provisioning flow:
        Step 1: GET /v1/reseller/purchase/dids (find available DID)
        Step 2: POST /v1/reseller/purchase/lock-did (lock the DID)
        Step 3: POST /v1/reseller/purchase/confirm (confirm purchase)
        Step 4: POST /v1/reseller/client/map-did (assign to client/org)
        Step 5: POST /v1/call-routing/create (set up webhook)
        """
        if isinstance(did_type, str):
            did_type = DIDType(did_type)
            
        self.logger.info(f"[VoiceLink] Provisioning number: area_code={area_code}, type={did_type.value}, org={organization_id}")
        
        # Step 1: Find available DID
        if phone_number:
            available = await self.list_available_numbers(city=None, did_type=did_type)
            matching = [n for n in available if n.phone_number == phone_number]
            if not matching:
                selected_did = AvailableNumber(
                    did_id=phone_number,
                    phone_number=phone_number,
                    city="Unknown",
                    area_code=area_code,
                    did_type=did_type,
                    provider="voicelink",
                    metadata={}
                )
            else:
                selected_did = matching[0]
        else:
            available = await self.list_available_numbers(city=None, did_type=did_type)
            matching = [n for n in available if n.area_code == area_code or area_code in n.phone_number]
            
            if not matching:
                raise NumberNotAvailableError("voicelink", f"No {did_type.value} numbers available for area {area_code}")
            
            selected_did = matching[0]
            
        self.logger.info(f"[VoiceLink] Selected DID: {selected_did.did_id} → {selected_did.phone_number}")
        
        # Step 2: Lock the DID
        lock_data = await self._request("POST", "/reseller/purchase/lock-did", json={
            "did_id": selected_did.did_id
        })
        order_id = lock_data.get("order_id") or lock_data.get("id")
        
        # Step 3: Confirm purchase
        confirm_data = await self._request("POST", "/reseller/purchase/confirm", json={
            "order_id": order_id
        })
        
        # Step 4: Map DID to client (organization)
        map_data = await self._request("POST", "/reseller/client/map-did", json={
            "client_id": organization_id,
            "did_id": selected_did.did_id
        })
        
        # Step 5: Create call routing
        webhook_url = f"{self.webhook_base}/webhooks/voice/voicelink/{organization_id}"
        self.logger.info(f"[VoiceLink] Using webhook base URL: {self.webhook_base}")
        self.logger.info(f"[VoiceLink] Full webhook_url: {webhook_url}")
        routing_data = await self._request("POST", "/call-routing/create", json={
            "did_id": selected_did.did_id,
            "webhook_url": webhook_url,
            "method": "POST"
        })
        
        # Return provisioned number
        return ProvisionedNumber(
            trinetra_id="",  # Will be set by NumberService
            provider_number_id=selected_did.did_id,
            phone_number=selected_did.phone_number,
            city=selected_did.city,
            area_code=selected_did.area_code,
            did_type=selected_did.did_type,
            status=NumberStatus.ACTIVE,
            provider="voicelink",
            provisioned_at=datetime.utcnow().isoformat(),
            metadata={
                "order_id": order_id,
                "routing_id": routing_data.get("id"),
                "webhook_url": webhook_url
            }
        )

    async def release_number(self, provider_number_id: str) -> bool:
        """
        POST /v1/reseller/did/release
        """
        await self._request("POST", "/reseller/did/release", json={
            "did_id": provider_number_id
        })
        self.logger.info(f"[VoiceLink] Released DID: {provider_number_id}")
        return True

    async def get_number_status(self, provider_number_id: str) -> NumberStatus:
        """
        GET /v1/reseller/did/purchased (filter by DID ID)
        """
        data = await self._request("GET", "/reseller/did/purchased")
        dids = data.get("data", []) if isinstance(data, dict) else data
        
        for did in dids:
            if str(did.get("id")) == provider_number_id:
                status_str = did.get("status", "").lower()
                if status_str in ("active", "allocated"):
                    return NumberStatus.ACTIVE
                elif status_str in ("released", "deleted"):
                    return NumberStatus.RELEASED
                elif status_str in ("suspended",):
                    return NumberStatus.SUSPENDED
        
        return NumberStatus.RELEASED  # Not found = released

    async def create_call_routing(self, phone_number: str, organization_id: str) -> Dict:
        """
        POST /v1/call-routing/create
        """
        webhook_url = f"{self.webhook_base}/webhooks/voice/voicelink/{organization_id}"
        
        data = await self._request("POST", "/call-routing/create", json={
            "phone_number": phone_number,
            "webhook_url": webhook_url,
            "method": "POST"
        })
        
        return {
            "routing_id": data.get("id"),
            "webhook_url": webhook_url,
            "status": "active"
        }

    async def create_outbound_session(self, agent_config: Dict) -> Dict:
        """
        POST /v1/websocket-bot/create
        
        Creates a WebSocket bot for outbound calling.
        Returns bot_id and websocket_url for LiveKit connection.
        """
        data = await self._request("POST", "/websocket-bot/create", json={
            "name": agent_config.get("name", "Trinetra Agent"),
            "agent_config": agent_config,
            "websocket_url": agent_config.get("websocket_url", "")
        })
        
        return {
            "session_id": data.get("id"),
            "bot_id": data.get("bot_id") or data.get("id"),
            "websocket_url": data.get("websocket_url"),
            "status": "created"
        }

    async def add_outbound_lead(self, bot_id: str, phone_number: str, metadata: Dict = None) -> Dict:
        """
        POST /v1/add_lead
        
        Add a number to the outbound dialing queue for a bot.
        """
        body = {
            "bot_id": bot_id,
            "phone_number": phone_number
        }
        if metadata:
            body["metadata"] = metadata
        
        data = await self._request("POST", "/add_lead", json=body)
        
        return {
            "lead_id": data.get("id"),
            "status": data.get("status", "queued")
        }

    async def validate_webhook_request(self, request_data: Dict, signature: str = None) -> bool:
        """
        Validate incoming webhook from VoiceLink.
        
        VoiceLink webhook verification method not yet confirmed.
        PLACEHOLDER: Checks for basic request integrity.
        UPDATE THIS when VoiceLink provides their signing method.
        """
        # Check required fields exist
        required_fields = ["event", "callId", "fromNumber", "toNumber"]
        for field in required_fields:
            if field not in request_data:
                self.logger.warning(f"[VoiceLink] Webhook missing required field: {field}")
                return False
        
        # Validate event type
        valid_events = ["call.initiated", "call.answered", "call.ended", "call.completed"]
        if request_data.get("event") not in valid_events:
            self.logger.warning(f"[VoiceLink] Unknown webhook event: {request_data.get('event')}")
            return False
        
        # TODO: Add HMAC signature verification when VoiceLink provides details
        # If signature is provided, verify against webhook secret
        webhook_secret = ConfigService.get("VOICELINK_WEBHOOK_SECRET")
        if webhook_secret and signature:
            import hmac, hashlib
            expected = hmac.new(
                webhook_secret.encode(),
                json.dumps(request_data, sort_keys=True).encode(),
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected, signature)
        
        # If no secret configured, accept the webhook (log warning)
        if not webhook_secret:
            self.logger.warning("[VoiceLink] No webhook secret configured — accepting all webhooks")
        
        return True

    async def list_provisioned_numbers(self) -> list:
        return []
