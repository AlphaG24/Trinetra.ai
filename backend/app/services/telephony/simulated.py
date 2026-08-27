import os
import uuid
import asyncio
import random
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any

from app.services.telephony.base import AbstractTelephonyProvider, DIDType, NumberStatus, AvailableNumber, ProvisionedNumber
from app.services.telephony.exceptions import TelephonyProviderError, NumberNotAvailableError, ProvisioningFailedError

logger = logging.getLogger("SimulatedProvider")

class SimulatedProvider(AbstractTelephonyProvider):
    def __init__(self):
        self.provider_name = "simulated"
        self.webhook_base = os.getenv("TRINETRA_WEBHOOK_BASE_URL", "https://brooklyn-equity-las-playback.trycloudflare.com")

    async def list_available_numbers(self, city: Optional[str] = None, did_type: Optional[DIDType] = None) -> List[AvailableNumber]:
        logger.info(f"[{self.provider_name}] Listing available numbers (city={city}, did_type={did_type})")
        await asyncio.sleep(0.2)
        
        all_numbers = [
            # Mumbai (022)
            {"city": "Mumbai", "area_code": "022", "did_type": DIDType.MOBILE, "num": "9812345678"},
            {"city": "Mumbai", "area_code": "022", "did_type": DIDType.MOBILE, "num": "9876543210"},
            {"city": "Mumbai", "area_code": "022", "did_type": DIDType.LANDLINE, "num": "22456789"},
            {"city": "Mumbai", "area_code": "022", "did_type": DIDType.TOLLFREE, "num": "1800224567"},
            # Delhi (011)
            {"city": "Delhi", "area_code": "011", "did_type": DIDType.MOBILE, "num": "9911223344"},
            {"city": "Delhi", "area_code": "011", "did_type": DIDType.MOBILE, "num": "9988776655"},
            {"city": "Delhi", "area_code": "011", "did_type": DIDType.LANDLINE, "num": "23456789"},
            {"city": "Delhi", "area_code": "011", "did_type": DIDType.TOLLFREE, "num": "1800112345"},
            # Bangalore (080)
            {"city": "Bangalore", "area_code": "080", "did_type": DIDType.MOBILE, "num": "9744556677"},
            {"city": "Bangalore", "area_code": "080", "did_type": DIDType.MOBILE, "num": "9633221100"},
            {"city": "Bangalore", "area_code": "080", "did_type": DIDType.LANDLINE, "num": "25678901"},
            {"city": "Bangalore", "area_code": "080", "did_type": DIDType.TOLLFREE, "num": "1800802567"},
        ]

        result = []
        for n in all_numbers:
            if city and n["city"].lower() != city.lower():
                continue
            if did_type and n["did_type"] != did_type:
                continue
            
            result.append(AvailableNumber(
                did_id=str(uuid.uuid4()),
                phone_number=f"+91 {n['area_code']} {n['num']}",
                city=n["city"],
                area_code=n["area_code"],
                did_type=n["did_type"],
                provider=self.provider_name,
                metadata={"simulated": True}
            ))

        return result

    async def provision_number(self, area_code: str, did_type: DIDType, organization_id: str, phone_number: Optional[str] = None) -> ProvisionedNumber:
        logger.info(f"[{self.provider_name}] Provisioning number (area_code={area_code}, did_type={did_type}, org_id=***)")
        valid_area_codes = {"022": "Mumbai", "011": "Delhi", "080": "Bangalore"}
        
        if area_code not in valid_area_codes:
            raise NumberNotAvailableError(
                self.provider_name, 
                f"Area code {area_code} not available in simulated provider.", 
                details={"available": list(valid_area_codes.keys())}
            )

        start_time = datetime.now()
        delay = random.uniform(1.0, 2.0)
        await asyncio.sleep(delay)
        
        if random.random() < 0.05:
            reason = random.choice(["network_error", "inventory_exhausted", "provider_timeout"])
            logger.error(f"[{self.provider_name}] Simulated provisioning failure: {reason}")
            raise ProvisioningFailedError(self.provider_name, step_failed="purchase", message=f"Simulated failure: {reason}")

        simulated_number = phone_number or f"+91 {area_code} {random.randint(100000, 999999)}"
        routing_id = f"RT-{uuid.uuid4().hex[:8]}"
        
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"[{self.provider_name}] Provisioning completed in {duration:.2f}s for {simulated_number}")

        return ProvisionedNumber(
            trinetra_id=str(uuid.uuid4()),
            provider_number_id=f"SIM-{uuid.uuid4().hex[:6].upper()}",
            phone_number=simulated_number,
            city=valid_area_codes[area_code],
            area_code=area_code,
            did_type=did_type,
            status=NumberStatus.ACTIVE,
            provider=self.provider_name,
            provisioned_at=datetime.now(timezone.utc),
            metadata={
                "webhook_url": f"{self.webhook_base}/webhooks/voice/simulated/{organization_id}",
                "routing_id": routing_id,
                "simulated": True
            }
        )

    async def release_number(self, provider_number_id: str) -> bool:
        logger.info(f"[{self.provider_name}] Releasing number {provider_number_id}")
        if not provider_number_id.startswith("SIM-"):
            raise TelephonyProviderError(self.provider_name, "Invalid simulated number ID")
            
        await asyncio.sleep(0.5)
        return True

    async def get_number_status(self, provider_number_id: str) -> NumberStatus:
        logger.info(f"[{self.provider_name}] Checking status for {provider_number_id}")
        if provider_number_id.startswith("SIM-"):
            return NumberStatus.ACTIVE
        return NumberStatus.RELEASED

    async def create_call_routing(self, phone_number: str, organization_id: str) -> Dict:
        routing_id = f"RT-{uuid.uuid4().hex[:8]}"
        webhook_url = f"{self.webhook_base}/webhooks/voice/simulated/{organization_id}"
        logger.info(f"[{self.provider_name}] Creating routing for *** -> {webhook_url}")
        
        return {
            "routing_id": routing_id,
            "webhook_url": webhook_url,
            "status": "active"
        }

    async def create_outbound_session(self, agent_config: Dict) -> Dict:
        session_id = str(uuid.uuid4())
        short_id = session_id[:8]
        logger.info(f"[{self.provider_name}] Creating outbound session with config: {agent_config}")
        
        # Simulate different outcomes based on the last digit of the phone number
        # for deterministic testing, or fallback to random
        to_number = str(agent_config.get("to_number") or agent_config.get("phone") or "")
        outcome = "connected"
        if to_number:
            last_digit = to_number[-1]
            if last_digit in ['0', '5']:
                outcome = "no_answer"
            elif last_digit in ['1', '6']:
                outcome = "busy"
            elif last_digit in ['2', '7']:
                outcome = "failed"
            elif last_digit in ['3', '8']:
                outcome = "dnd"
        else:
            outcome = random.choice(["connected", "connected", "connected", "no_answer", "busy", "failed"])

        return {
            "session_id": session_id,
            "websocket_url": f"ws://127.0.0.1:7880/ws?session={short_id}",
            "bot_id": f"BOT-{short_id}",
            "outcome": outcome,
            "duration_seconds": random.randint(15, 120) if outcome == "connected" else 0
        }

    async def make_outbound_call(self, to_number: str, from_number: str, webhook_url: str, custom_parameters: Optional[dict] = None) -> dict:
        logger.info(f"[{self.provider_name}] Simulated outbound call placed to {to_number} from {from_number}")
        return {"call_sid": f"sim-{uuid.uuid4()}", "status": "queued"}

    async def validate_webhook_request(self, request_data: Dict, signature: str) -> bool:
        return True

    async def list_provisioned_numbers(self) -> list:
        return []
