from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from typing import Optional, List, Dict
import logging

from database import supabase_admin
from app.services.campaign_service import CampaignService

logger = logging.getLogger("CampaignRouter")
router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

@router.post("")
async def create_campaign(
    name: str = Form(...),
    agent_id: str = Form(...),
    organization_id: str = Form(...),
    calling_hours_start: str = Form("10:00"),
    calling_hours_end: str = Form("18:00"),
    timezone: str = Form("Asia/Kolkata"),
    scheduled_start: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    try:
        file_content = await file.read()
        campaign = await CampaignService.create_campaign(
            organization_id=organization_id,
            agent_id=agent_id,
            name=name,
            file_content=file_content,
            filename=file.filename,
            calling_hours_start=calling_hours_start,
            calling_hours_end=calling_hours_end,
            timezone_str=timezone,
            scheduled_start=scheduled_start if scheduled_start else None
        )
        return {"success": True, "data": campaign}
    except ValueError as ve:
        logger.error(f"Validation error creating campaign: {ve}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creating campaign: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")

@router.get("")
async def list_campaigns(organization_id: str = Query(...)):
    try:
        import uuid
        try:
            uuid.UUID(organization_id)
        except ValueError:
            return {"success": True, "data": []}

        return await CampaignService.list_campaigns(organization_id)
    except Exception as e:
        logger.error(f"Error listing campaigns: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}")
async def get_campaign_detail(id: str):
    try:
        campaign_res = supabase_admin.table("campaigns")\
            .select("*, agents(name)")\
            .eq("id", id)\
            .single()\
            .execute()
            
        if not campaign_res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        dnd_count_res = supabase_admin.table("campaign_contacts")\
            .select("id", count="exact")\
            .eq("campaign_id", id)\
            .eq("call_status", "dnd")\
            .execute()
        
        campaign_data = campaign_res.data
        campaign_data["contacts_dnd"] = dnd_count_res.count or 0
        return {"success": True, "data": campaign_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting campaign detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}/contacts")
async def get_campaign_contacts(
    id: str, 
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    try:
        offset = (page - 1) * limit
        query = supabase_admin.table("campaign_contacts")\
            .select("*", count="exact")\
            .eq("campaign_id", id)\
            .order("created_at")
            
        if search:
            query = query.or_(f"full_name.ilike.%{search}%,phone.ilike.%{search}%,company_name.ilike.%{search}%")
            
        if status:
            query = query.eq("call_status", status)
            
        res = query.range(offset, offset + limit - 1).execute()
        
        return {
            "success": True,
            "data": res.data or [],
            "count": res.count or 0,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting campaign contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/start")
async def start_campaign(id: str):
    try:
        data = await CampaignService.start_campaign(id)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error starting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/pause")
async def pause_campaign(id: str):
    try:
        data = await CampaignService.pause_campaign(id)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error pausing campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/resume")
async def resume_campaign(id: str):
    try:
        data = await CampaignService.resume_campaign(id)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error resuming campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
async def cancel_campaign(id: str):
    try:
        res = supabase_admin.table("campaigns")\
            .update({"status": "cancelled"})\
            .eq("id", id)\
            .execute()
        return {"success": True, "data": res.data[0] if res.data else {}}
    except Exception as e:
        logger.error(f"Error cancelling campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/contacts/{contact_id}/retry")
async def retry_contact(id: str, contact_id: str):
    try:
        # Reset the contact status to pending
        res = supabase_admin.table("campaign_contacts")\
            .update({"call_status": "pending"})\
            .eq("id", contact_id)\
            .eq("campaign_id", id)\
            .execute()
            
        # Check campaign status and re-trigger calling loop if not already running
        campaign = supabase_admin.table("campaigns").select("status").eq("id", id).single().execute().data
        if campaign and campaign["status"] in ("completed", "ready", "paused"):
            # Set campaign to running and spawn the background dialer loop
            supabase_admin.table("campaigns").update({"status": "running"}).eq("id", id).execute()
            
            import asyncio
            from app.services.campaign_service import CampaignService, running_campaign_tasks
            task = asyncio.create_task(CampaignService.run_campaign_loop(id))
            running_campaign_tasks.add(task)
            task.add_done_callback(running_campaign_tasks.discard)
            logger.info(f"Retry triggered: re-started calling loop for campaign {id}")
            
        return {"success": True, "data": res.data[0] if res.data else {}}
    except Exception as e:
        logger.error(f"Error retrying contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))
