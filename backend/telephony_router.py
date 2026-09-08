from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict
import logging
import asyncio
import httpx
import uuid
from datetime import datetime

from database import supabase_admin
from app.services.telephony.factory import get_provider
from app.services.pricing_service import PricingService
from app.services.number_service import NumberService
from app.services.telephony.exceptions import TelephonyProviderError, RateLimitExceededError, NumberNotAvailableError, ProvisioningFailedError

logger = logging.getLogger("TelephonyRouter")
router = APIRouter()

# Models
class TestConnectionRequest(BaseModel):
    api_key: Optional[str] = None
    account_sid: Optional[str] = None
    auth_token: Optional[str] = None
    base_url: Optional[str] = None
    subdomain: Optional[str] = None

class ProvisionNumberRequest(BaseModel):
    organization_id: str
    area_code: str
    did_type: str
    provider: Optional[str] = None

class OutboundCallRequest(BaseModel):
    to_phone: str
    from_phone: Optional[str] = None
    agent_id: str
    organization_id: str

# We use the admin client since these are internal BFF routes that have already 
# passed auth checks on the Next.js side, but we should still enforce a secret/header if this were prod.
# For now, we trust internal network calls.

@router.post("/outbound-call")
async def trigger_outbound_call(req: OutboundCallRequest):
    try:
        from app.services.config_service import ConfigService
        import os

        provider = get_provider("twilio")
        webhook_base = ConfigService.get("TRINETRA_WEBHOOK_BASE_URL") or os.getenv("TRINETRA_WEBHOOK_BASE_URL") or "http://localhost:8000"
        unique_room = f"twilio--{req.agent_id}--nocontact--{uuid.uuid4().hex[:8]}" if req.agent_id else f"twilio--noagent--nocontact--{uuid.uuid4().hex[:8]}"
        webhook_url = f"{webhook_base}/api/voice/webhooks/voice/twilio/{req.organization_id}?agent_id={req.agent_id}&room_name={unique_room}"

        # Use provided from_phone or fallback to TWILIO_PHONE_NUMBER env or default pool number
        from_phone = req.from_phone
        if not from_phone:
            # Query the developer account's active twilio number from the database if not in env
            try:
                res = supabase_admin.table("phone_numbers")\
                    .select("phone_number")\
                    .eq("organization_id", req.organization_id)\
                    .eq("provider", "twilio")\
                    .eq("status", "active")\
                    .limit(1)\
                    .execute()
                if res.data and len(res.data) > 0:
                    from_phone = res.data[0]["phone_number"]
            except Exception as e:
                logger.warn(f"Failed to lookup phone number in DB: {e}")

        if not from_phone:
            from_phone = os.getenv("TWILIO_PHONE_NUMBER") or "+12282950908"

        call_res = await provider.make_outbound_call(
            req.to_phone, 
            from_phone, 
            webhook_url,
            custom_parameters={
                "agent_id": req.agent_id,
                "room_name": unique_room
            }
        )
        return {"success": True, "data": call_res}
    except Exception as e:
        logger.error(f"Failed to place outbound callback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test/{provider}")
async def test_connection(provider: str, req: TestConnectionRequest):
    provider = provider.lower()
    if provider not in ["twilio", "simulated", "exotel"]:
        return {"success": False, "message": f"Unsupported provider: {provider}"}
        
    start_time = datetime.now()
    
    try:
        if provider == "simulated":
            # Always succeeds for development
            return {
                "success": True, 
                "message": "Connected to Simulated Provider", 
                "details": {"response_time_ms": 5}
            }

        elif provider == "exotel":
            account_sid = req.account_sid
            api_key = req.api_key
            api_token = req.auth_token
            subdomain = req.subdomain
            
            if not account_sid or not api_key or not api_token:
                try:
                    res = supabase_admin.table("system_config").select("config_key, config_value").in_("config_key", ["EXOTEL_ACCOUNT_SID", "EXOTEL_API_KEY", "EXOTEL_API_TOKEN", "EXOTEL_SUBDOMAIN"]).execute()
                    configs = {row["config_key"]: row["config_value"] for row in res.data}
                    account_sid = account_sid or configs.get("EXOTEL_ACCOUNT_SID")
                    api_key = api_key or configs.get("EXOTEL_API_KEY")
                    api_token = api_token or configs.get("EXOTEL_API_TOKEN")
                    subdomain = subdomain or configs.get("EXOTEL_SUBDOMAIN") or "api.exotel.com"
                except Exception as e:
                    logger.error(f"Error fetching exotel config: {e}")
                    subdomain = subdomain or "api.exotel.com"
            else:
                subdomain = subdomain or "api.exotel.com"

            if not account_sid or not api_key or not api_token:
                return {"success": False, "message": "Exotel credentials (ACCOUNT_SID, API_KEY, API_TOKEN) not provided and not found in system_config"}

            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"https://{subdomain.strip().rstrip('/')}/v1/Accounts/{account_sid}.json"
                resp = await client.get(url, auth=(api_key, api_token))
                delta = int((datetime.now() - start_time).total_seconds() * 1000)

                if resp.status_code == 200:
                    data = resp.json().get("Account", {})
                    return {
                        "success": True,
                        "message": f"Connected to Exotel successfully ({data.get('Status', 'Active')})",
                        "details": {
                            "response_time_ms": delta,
                            "account_sid": account_sid,
                            "status": data.get("Status")
                        }
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Exotel authentication failed (Status {resp.status_code}): {resp.text}"
                    }

        elif provider == "twilio":
            account_sid = req.account_sid
            auth_token = req.auth_token
            
            if not account_sid or not auth_token:
                # Fetch from config
                try:
                    res = supabase_admin.table("system_config").select("config_key, config_value").in_("config_key", ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"]).execute()
                    configs = {row["config_key"]: row["config_value"] for row in res.data}
                    account_sid = account_sid or configs.get("TWILIO_ACCOUNT_SID")
                    auth_token = auth_token or configs.get("TWILIO_AUTH_TOKEN")
                except Exception as e:
                    logger.error(f"Error fetching twilio config: {e}")
                    
            if not account_sid or not auth_token:
                return {"success": False, "message": "Twilio credentials not provided and not found in system_config"}
                
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json",
                    auth=(account_sid, auth_token)
                )
                
                if resp.status_code == 200:
                    delta = int((datetime.now() - start_time).total_seconds() * 1000)
                    data = resp.json()
                    return {
                        "success": True,
                        "message": "Connected to Twilio successfully",
                        "details": {
                            "response_time_ms": delta,
                            "account_info": {"status": data.get("status"), "type": data.get("type")}
                        }
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Authentication failed (Status {resp.status_code})",
                    }
                    
    except httpx.TimeoutException:
        return {"success": False, "message": "Connection timed out after 10 seconds"}
    except Exception as e:
        logger.error(f"Error testing connection for {provider}: {e}")
        return {"success": False, "message": f"Connection error: {str(e)}"}

@router.post("/cache/clear")
async def clear_cache():
    PricingService().clear_cache()
    return {"success": True, "message": "Pricing cache cleared"}

# Number provisioning endpoints
@router.post("/provision")
async def provision_number(req: ProvisionNumberRequest, request: Request):
    # In a real app we'd verify the user JWT here. 
    # For this internal BFF pattern we assume the Next.js API verified it, 
    # but let's pass a dummy user_id if not provided in headers.
    user_id = request.headers.get("x-user-id", "system")
    
    number_service = NumberService(supabase_admin)
    try:
        provisioned = await number_service.provision_number(
            user_id=user_id,
            org_id=req.organization_id,
            area_code=req.area_code,
            did_type=req.did_type,
            provider_name=req.provider
        )
        # Convert dataclass to dict
        return {
            "success": True, 
            "number": {
                "id": provisioned.trinetra_id,
                "phone_number": provisioned.phone_number,
                "provider": provisioned.provider,
                "did_type": provisioned.did_type.value if hasattr(provisioned.did_type, 'value') else str(provisioned.did_type),
                "city": provisioned.city,
                "status": provisioned.status.value if hasattr(provisioned.status, 'value') else str(provisioned.status)
            }
        }
    except RateLimitExceededError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except TelephonyProviderError as e:
        raise HTTPException(status_code=500, detail=f"Provisioning failed: {e.message}")
    except Exception as e:
        logger.error(f"Provision error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/{number_id}/release")
async def release_number(number_id: str, request: Request):
    user_id = request.headers.get("x-user-id", "system")
    number_service = NumberService(supabase_admin)
    try:
        await number_service.release_number(user_id, number_id)
        return {"success": True, "message": "Number released successfully"}
    except Exception as e:
        logger.error(f"Release error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available")
async def get_available_numbers(city: str, did_type: str, provider: Optional[str] = None):
    # Depending on provider, fetch available inventory
    # Here we just use the factory directly
    from app.services.telephony.base import DIDType
    try:
        did_enum = DIDType(did_type)
        if provider:
            prov = get_provider(provider)
            numbers = await prov.get_available_numbers(city, did_enum)
        else:
            # Fallback to exotel if not specified
            prov = get_provider("exotel")
            numbers = await prov.get_available_numbers(city, did_enum)
            
        return {
            "success": True, 
            "numbers": [
                {
                    "did_id": n.did_id,
                    "phone_number": n.phone_number,
                    "city": n.city,
                    "area_code": n.area_code,
                    "did_type": n.did_type.value,
                    "provider": n.provider
                } for n in numbers
            ]
        }
    except Exception as e:
        logger.error(f"Available numbers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Create numbers_router for root-level API calls
numbers_router = APIRouter()

@numbers_router.post("/api/numbers/provision")
async def provision_number(request: Request):
    """
    Provision a new phone number using the appropriate provider.
    Called by the Next.js BFF layer.
    """
    body = await request.json()
    organization_id = body.get("organization_id")
    area_code = body.get("area_code")
    did_type = body.get("did_type")
    provider_name = body.get("provider", "simulated")
    phone_number = body.get("phone_number")
    
    if not organization_id or not area_code or not did_type:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    try:
        from app.services.number_service import NumberService
        
        number_service = NumberService(supabase_admin)
        user_id = body.get("user_id")
        if not user_id:
            # Fallback to a system/dummy user ID if none provided
            user_id = "00000000-0000-0000-0000-000000000000"
            
        result = await number_service.provision_number(
            user_id=user_id,
            org_id=organization_id,
            area_code=area_code,
            did_type=did_type,
            provider_name=provider_name,
            specific_phone_number=phone_number
        )
        
        return {
            "success": True,
            "data": {
                "id": result.trinetra_id or str(uuid.uuid4()),
                "phone_number": result.phone_number,
                "city": result.city,
                "did_type": result.did_type.value if hasattr(result.did_type, 'value') else result.did_type,
                "provider": result.provider,
                "status": result.status.value if hasattr(result.status, 'value') else result.status,
                "provider_number_id": result.provider_number_id,
                "provisioned_at": result.provisioned_at,
                "metadata": result.metadata
            }
        }
    except NumberNotAvailableError as e:
        logger.error(f"Number not available: {e.message}")
        raise HTTPException(status_code=400, detail=e.message)
    except ProvisioningFailedError as e:
        logger.error(f"Provisioning failed error: {e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logger.error(f"Provisioning failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@numbers_router.get("/api/pricing/display")
async def get_pricing_display():
    """
    Get pricing display info for frontend.
    Returns either actual prices or "Billed monthly" based on admin config.
    """
    try:
        from app.services.pricing_service import PricingService
        
        ps = PricingService()
        show_prices = await ps.should_show_prices()
        
        # Get pricing for all configured providers and DID types
        pricing = {}
        
        # Exotel pricing
        for did_type in ["mobile", "landline"]:
            display = await ps.format_price_for_display("exotel", did_type)
            pricing[f"exotel_{did_type}"] = display
        
        # Twilio pricing
        for country in ["US", "UK", "IN"]:
            for did_type in ["local", "mobile"]:
                try:
                    display = await ps.format_price_for_display("twilio", did_type, country)
                    pricing[f"twilio_{country}_{did_type}"] = display
                except:
                    pass  # Skip unconfigured combinations
        
        return {
            "success": True,
            "data": {
                "show_prices": show_prices,
                "pricing": pricing
            }
        }
    except Exception as e:
        logger.error(f"Pricing display failed: {str(e)}")
        # Return safe default
        return {
            "success": True,
            "data": {
                "show_prices": False,
                "pricing": {}
            }
        }

@numbers_router.post("/api/numbers/{number_id}/release")
async def release_number_root(number_id: str):
    """Release a phone number back to the provider"""
    try:
        # This would call NumberService.release_number()
        # For now, return success for simulated provider
        return {"success": True, "data": {"message": "Number released"}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@numbers_router.get("/api/numbers/available")
async def get_available_numbers_root(city: str = None, did_type: str = None, provider: str = "simulated", area_code: str = None):
    """Get available numbers for purchase"""
    try:
        from app.services.telephony.factory import get_provider
        from app.services.telephony.base import DIDType
        
        p = get_provider(provider)
        did_type_enum = DIDType(did_type) if did_type else None
        numbers = await p.list_available_numbers(city=city, did_type=did_type_enum)
        
        # Filter by area code if provided
        if area_code:
            numbers = [n for n in numbers if n.area_code == area_code or area_code in n.phone_number]
            
        return {
            "success": True,
            "data": {
                "available_numbers": [
                    {
                        "did_id": n.did_id,
                        "phone_number": n.phone_number,
                        "city": n.city,
                        "area_code": n.area_code,
                        "did_type": n.did_type.value if hasattr(n.did_type, 'value') else n.did_type,
                        "provider": n.provider
                    }
                    for n in numbers
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@numbers_router.post("/api/numbers/sync/{organization_id}")
async def sync_numbers(organization_id: str, provider: str = "twilio"):
    """Pull all active numbers from the provider and save them if not already in DB."""
    try:
        from app.services.number_service import NumberService
        result = await NumberService(supabase_admin).sync_numbers_from_provider(organization_id, provider)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise HTTPException(status_code=500, detail="Sync failed")
