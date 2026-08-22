from abc import ABC, abstractmethod

class TelephonyProvider(ABC):
    @abstractmethod
    async def provision_number(self, area_code: str) -> dict:
        """Provision a new phone number"""
        pass
    
    @abstractmethod
    async def make_call(self, to_number: str, from_number: str, agent_config: dict) -> dict:
        """Initiate outbound call"""
        pass
    
    @abstractmethod
    async def handle_inbound(self, call_sid: str, from_number: str) -> dict:
        """Handle incoming call"""
        pass
    
    @abstractmethod
    async def end_call(self, call_sid: str) -> dict:
        """End active call"""
        pass
    
    @abstractmethod
    async def get_recording(self, call_sid: str) -> str:
        """Get call recording URL"""
        pass

from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Optional, Any
from datetime import datetime

class DIDType(str, Enum):
    MOBILE = "mobile"
    LANDLINE = "landline"
    TOLLFREE = "tollfree"
    NINETY_TWO_SERIES = "92series"
    LOCAL = "local"

class NumberStatus(str, Enum):
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    RELEASED = "released"
    SUSPENDED = "suspended"
    FAILED = "failed"

@dataclass
class AvailableNumber:
    did_id: str
    phone_number: str
    city: str
    area_code: str
    did_type: DIDType
    provider: str
    metadata: Dict[str, Any]

@dataclass
class ProvisionedNumber:
    trinetra_id: str
    provider_number_id: str
    phone_number: str
    city: str
    area_code: str
    did_type: DIDType
    status: NumberStatus
    provider: str
    provisioned_at: datetime
    metadata: Dict[str, Any]

class AbstractTelephonyProvider(ABC):
    @abstractmethod
    async def list_available_numbers(self, city: Optional[str] = None, did_type: Optional[DIDType] = None) -> List[AvailableNumber]:
        pass

    @abstractmethod
    async def provision_number(self, area_code: str, did_type: DIDType, organization_id: str, phone_number: Optional[str] = None) -> ProvisionedNumber:
        pass

    @abstractmethod
    async def release_number(self, provider_number_id: str) -> bool:
        pass

    @abstractmethod
    async def get_number_status(self, provider_number_id: str) -> NumberStatus:
        pass

    @abstractmethod
    async def create_call_routing(self, phone_number: str, organization_id: str) -> Dict:
        pass

    @abstractmethod
    async def create_outbound_session(self, agent_config: Dict) -> Dict:
        pass

    @abstractmethod
    async def validate_webhook_request(self, request_data: Dict, signature: str) -> bool:
        pass

    @abstractmethod
    async def list_provisioned_numbers(self) -> list:
        pass

