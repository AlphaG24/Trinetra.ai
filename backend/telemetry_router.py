import urllib.parse
import json
from uuid import UUID
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request, Security, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from database import supabase_admin

router = APIRouter(prefix="/v1/telemetry", tags=["Telemetry"])

security = HTTPBearer(auto_error=False)

class TelemetryPayload(BaseModel):
    service_id: UUID
    status: str
    event_data: Dict[str, Any] = Field(default_factory=dict)

async def get_current_user(request: Request, auth: HTTPAuthorizationCredentials = Security(security)):
    token = None
    # 1. Check Authorization Header
    if auth and auth.credentials:
        token = auth.credentials
    else:
        # 2. Check Cookies
        for key, value in request.cookies.items():
            if "auth-token" in key:
                try:
                    decoded_val = urllib.parse.unquote(value)
                    data = json.loads(decoded_val)
                    if isinstance(data, list) and len(data) > 0:
                        token = data[0]
                    elif isinstance(data, dict):
                        token = data.get("access_token")
                except Exception:
                    token = value
                if token:
                    break

    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")

    try:
        # Validate token with Supabase Auth
        user_res = supabase_admin.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid session token")
        return user_res.user
    except Exception as e:
        print(f"[Telemetry Auth Error] {str(e)}", flush=True)
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.post("")
async def log_telemetry(payload: TelemetryPayload, user: Any = Depends(get_current_user)):
    try:
        # Insert the telemetry event into the service_events table
        res = supabase_admin.table("service_events").insert({
            "user_id": str(user.id),
            "service_id": str(payload.service_id),
            "status": payload.status,
            "event_data": payload.event_data
        }).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to log telemetry event")
            
        event_id = res.data[0].get("id")
        return JSONResponse(
            status_code=201,
            content={"status": "logged", "event_id": event_id}
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[Telemetry Log Error] Database insertion failed: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail="Database insertion failed")
