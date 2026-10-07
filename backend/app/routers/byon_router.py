"""
backend/app/routers/byon_router.py

FastAPI Router for Bring-Your-Own Numbers (BYON - Twilio & Exotel).
Implements Master Plan Section 18.8 (Authoritative Overrides).
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, Field

from app.services.byon_vault_service import BYONVaultService

byon_router = APIRouter(prefix="/api/telephony/byon", tags=["byon"])


class StoreCredentialRequest(BaseModel):
    organization_id: str
    carrier: str = Field(description="'twilio' or 'exotel'")
    account_sid: str = Field(min_length=5, description="Twilio Account SID or Exotel Account SID")
    auth_token: str = Field(min_length=8, description="Carrier Auth Token or API Secret")
    api_key_or_sid: Optional[str] = Field(default=None, description="Optional Subaccount or API Key SID")
    webhook_url: Optional[str] = None


class SyncNumbersRequest(BaseModel):
    organization_id: str
    mock_numbers: Optional[List[Dict[str, Any]]] = None  # For testing/sandbox syncing


class AssignAgentRequest(BaseModel):
    organization_id: str
    agent_id: Optional[str] = None  # None unassigns number


class RevokeCredentialRequest(BaseModel):
    organization_id: str
    reason: Optional[str] = "User revoked credentials"


@byon_router.post("/credentials")
async def store_carrier_credential(req: StoreCredentialRequest):
    """
    Encrypts and vaults third-party carrier credentials (AES-256-GCM).
    Plaintext tokens are NEVER stored in logs or returned in response.
    """
    service = BYONVaultService()
    try:
        cred = service.store_carrier_credential(
            organization_id=req.organization_id,
            carrier=req.carrier,
            account_sid=req.account_sid,
            auth_token=req.auth_token,
            api_key_or_sid=req.api_key_or_sid,
            webhook_url=req.webhook_url,
        )
        return {
            "success": True,
            "message": f"Carrier {req.carrier} credentials vaulted securely with AES-256-GCM.",
            "credential": cred,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store credential: {e}")


@byon_router.get("/credentials")
async def list_carrier_credentials(organization_id: str = Query(...)):
    """
    Lists sanitized carrier credentials for the organization.
    """
    service = BYONVaultService()
    creds = service.list_carrier_credentials(organization_id=organization_id)
    return {
        "success": True,
        "count": len(creds),
        "credentials": creds,
    }


@byon_router.post("/credentials/{credential_id}/sync")
async def sync_carrier_numbers(credential_id: str, req: SyncNumbersRequest):
    """
    Synchronizes customer-owned phone numbers from carrier account.
    """
    service = BYONVaultService()
    try:
        result = service.sync_carrier_numbers(
            credential_id=credential_id,
            organization_id=req.organization_id,
            mock_carrier_numbers=req.mock_numbers,
        )
        return {
            "success": True,
            "message": f"Successfully synchronized {result['synced_count']} numbers.",
            "data": result,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync numbers: {e}")


@byon_router.post("/credentials/{credential_id}/revoke")
async def revoke_carrier_credential(credential_id: str, req: RevokeCredentialRequest):
    """
    Revokes carrier credential and suspends associated BYON numbers gracefully.
    """
    service = BYONVaultService()
    try:
        result = service.revoke_credential(
            credential_id=credential_id,
            organization_id=req.organization_id,
            reason=req.reason or "User revoked credentials",
        )
        return {
            "success": True,
            "message": "Credential revoked and associated numbers suspended.",
            "data": result,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to revoke credential: {e}")


@byon_router.post("/numbers/{byon_number_id}/assign")
async def assign_byon_number(byon_number_id: str, req: AssignAgentRequest):
    """
    Assigns a customer-owned BYON number to an organization agent.
    """
    service = BYONVaultService()
    try:
        result = service.assign_number_to_agent(
            byon_number_id=byon_number_id,
            organization_id=req.organization_id,
            agent_id=req.agent_id,
        )
        return {
            "success": True,
            "message": "Number assignment updated.",
            "data": result,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign number: {e}")
