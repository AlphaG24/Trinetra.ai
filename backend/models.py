from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class PlatformServiceBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    type: str
    icon_url: Optional[str] = None
    subdomain_url: Optional[str] = None
    ui_config: Dict[str, Any] = Field(default_factory=dict)

class PlatformServiceCreate(PlatformServiceBase):
    id: Optional[UUID] = None

class PlatformService(PlatformServiceBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceEventBase(BaseModel):
    user_id: UUID
    service_id: UUID
    status: str
    event_data: Dict[str, Any] = Field(default_factory=dict)

class ServiceEventCreate(ServiceEventBase):
    id: Optional[UUID] = None

class ServiceEvent(ServiceEventBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
