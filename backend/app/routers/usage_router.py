from fastapi import APIRouter, HTTPException
from database import supabase_admin
from app.services.usage_service import UsageService

router = APIRouter(tags=["usage"])

@router.get("/api/usage/organization/{organization_id}")
async def get_organization_usage(organization_id: str):
    """Get current usage and limits for an organization"""
    try:
        service = UsageService(supabase_admin)
        result = await service.check_organization_limits(organization_id)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/usage/agent/{agent_id}")
async def get_agent_usage(agent_id: str):
    """Get current usage for a specific agent"""
    try:
        service = UsageService(supabase_admin)
        result = await service.check_agent_minutes(agent_id)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/usage/reset/{agent_id}")
async def reset_agent_usage(agent_id: str):
    """Reset minutes used for an agent (admin or on plan upgrade)"""
    try:
        import asyncio
        await asyncio.to_thread(
            supabase_admin.table("agents").update({
                "minutes_used": 0,
                "status": "online"
            }).eq("id", agent_id).execute
        )
        return {"success": True, "message": "Usage reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
