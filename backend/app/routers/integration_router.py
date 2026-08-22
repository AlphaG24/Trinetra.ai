from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.integration_service import IntegrationService
from database import supabase_admin

router = APIRouter(tags=["integrations"])

class ConnectRequest(BaseModel):
    agent_id: str
    org_id: str
    integration_type_id: str
    config: dict

class TestRequest(BaseModel):
    slug: str
    config: dict

def get_integration_service():
    return IntegrationService(supabase_admin)

@router.get("/api/integrations/types")
async def list_integration_types(service: IntegrationService = Depends(get_integration_service)):
    """Get all available integration types"""
    try:
        types = await service.get_available_integrations()
        return {"success": True, "data": types}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/integrations/agent/{agent_id}")
async def get_agent_integrations(agent_id: str, service: IntegrationService = Depends(get_integration_service)):
    """Get integrations for an agent"""
    try:
        integrations = await service.get_agent_integrations(agent_id)
        return {"success": True, "data": integrations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/integrations/connect")
async def connect_integration(req: ConnectRequest, service: IntegrationService = Depends(get_integration_service)):
    """Connect an integration"""
    try:
        result = await service.connect_integration(
            agent_id=req.agent_id,
            org_id=req.org_id,
            integration_type_id=req.integration_type_id,
            config=req.config
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/integrations/{integration_id}/disconnect")
async def disconnect_integration(integration_id: str, service: IntegrationService = Depends(get_integration_service)):
    """Disconnect an integration"""
    try:
        await service.disconnect_integration(integration_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/integrations/test")
async def test_integration_connection(req: TestRequest, service: IntegrationService = Depends(get_integration_service)):
    """Test connection credentials"""
    try:
        res = await service.test_connection(slug=req.slug, config=req.config)
        return res
    except Exception as e:
        return {"success": False, "error": str(e)}
