from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Response
from typing import Optional, List, Dict, Union
import logging
import asyncio

from database import supabase_admin
from app.services.campaign_service import CampaignService

logger = logging.getLogger("CampaignRouter")
router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

@router.get("/template.csv")
@router.get("/template")
async def get_campaign_contacts_template():
    """
    Returns a downloadable sample CSV template for campaign contact lists
    demonstrating required affirmative consent columns (consent, consent_source).
    [CONFIRM WITH A LAWYER]
    """
    sample_csv = (
        "full_name,phone,company_name,consent,consent_source,notes\n"
        "Rajesh Sharma,+919876543210,Acme Corp,true,website_inquiry_form_2026,Requested demo of voice agent\n"
        "Priya Patel,+919876543211,Nexus Tech,true,conference_booth_optin_delhi,Interested in customer support automation\n"
        "Amit Verma,+919876543212,Global Logistics,true,webinar_attendee_march2026,Inquired about outbound notifications\n"
    )
    return Response(
        content=sample_csv,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="campaign_contacts_sample.csv"'}
    )

@router.get("/active/consent-audit")
async def get_active_campaigns_consent_audit():
    """
    Returns an audit report on running/active campaigns and contact consent breakdown.
    Documents status of legacy contacts and statutory compliance before dialing. [CONFIRM WITH A LAWYER]
    """
    try:
        report = await CampaignService.get_active_campaigns_consent_audit()
        return {"success": True, "data": report}
    except Exception as e:
        logger.error(f"Error fetching active campaigns consent audit: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_campaign(
    name: str = Form(...),
    agent_id: str = Form(...),
    organization_id: str = Form(...),
    purpose: str = Form("promotional"),
    calling_hours_start: str = Form("10:00"),
    calling_hours_end: str = Form("18:00"),
    timezone: str = Form("Asia/Kolkata"),
    scheduled_start: Optional[str] = Form(None),
    consent_attestation: Union[bool, str] = Form(False),
    attestation_statement: Optional[str] = Form(None),
    purpose_attestation: Union[bool, str] = Form(False),
    user_id: Optional[str] = Form(None),
    user_email: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    try:
        # Validate affirmative consent attestation (TRAI TCCCPR 2018 / TCPA) [CONFIRM WITH A LAWYER]
        is_attested = False
        if isinstance(consent_attestation, bool):
            is_attested = consent_attestation
        elif isinstance(consent_attestation, str):
            is_attested = consent_attestation.strip().lower() in ("true", "1", "yes", "on")

        if not is_attested:
            raise HTTPException(
                status_code=400,
                detail="Mandatory statutory attestation missing: You must certify that you have verifiable affirmative consent for all contacts in this campaign before uploading. [CONFIRM WITH A LAWYER]"
            )

        # Validate purpose classification and purpose attestation [CONFIRM WITH A LAWYER]
        valid_purposes = ("promotional", "service", "transactional")
        norm_purpose = purpose.strip().lower()
        if norm_purpose not in valid_purposes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid campaign purpose '{purpose}'. Allowed values: {list(valid_purposes)}. [CONFIRM WITH A LAWYER]"
            )

        is_purpose_attested = False
        if isinstance(purpose_attestation, bool):
            is_purpose_attested = purpose_attestation
        elif isinstance(purpose_attestation, str):
            is_purpose_attested = purpose_attestation.strip().lower() in ("true", "1", "yes", "on")

        if norm_purpose != "promotional" and not is_purpose_attested:
            raise HTTPException(
                status_code=400,
                detail=f"Statutory purpose attestation missing: '{norm_purpose}' campaigns require explicit affirmative certification that calls contain no marketing or sales content under TRAI TCCCPR 2018 / TCPA. [CONFIRM WITH A LAWYER]"
            )

        file_content = await file.read()
        campaign = await CampaignService.create_campaign(
            organization_id=organization_id,
            agent_id=agent_id,
            name=name,
            file_content=file_content,
            filename=file.filename,
            purpose=norm_purpose,
            calling_hours_start=calling_hours_start,
            calling_hours_end=calling_hours_end,
            timezone_str=timezone,
            scheduled_start=scheduled_start if scheduled_start else None,
            consent_attestation=is_attested,
            attestation_statement=attestation_statement,
            purpose_attestation=is_purpose_attested,
            user_id=user_id,
            user_email=user_email
        )
        return {"success": True, "data": campaign}
    except HTTPException:
        raise
    except ValueError as ve:
        logger.error(f"Validation error creating campaign: {ve}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creating campaign: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")

@router.get("/{id}/pre-send-report")
async def get_pre_send_report(id: str):
    """
    Returns pre-send safety audit report showing how many contacts pass or fail
    statutory checks (consent, DND, 09:00-21:00 calling window, phone format).
    """
    try:
        report = await CampaignService.get_pre_send_report(id)
        return {"success": True, "data": report}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating pre-send report for campaign {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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
        campaign_res = await asyncio.to_thread(
            supabase_admin.table("campaigns")
            .select("*, agents(name, phone_number, telephony_provider)")
            .eq("id", id)
            .single()
            .execute
        )
            
        if not campaign_res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        dnd_count_res = await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .select("id", count="exact")
            .eq("campaign_id", id)
            .eq("call_status", "dnd")
            .execute
        )
        
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
            
        res = await asyncio.to_thread(query.range(offset, offset + limit - 1).execute)
        
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
async def delete_campaign(id: str):
    try:
        from app.services.campaign_service import active_campaign_ids
        active_campaign_ids.discard(id)

        # Delete contacts associated with this campaign
        supabase_admin.table("campaign_contacts")\
            .delete()\
            .eq("campaign_id", id)\
            .execute()

        # Delete the campaign
        res = supabase_admin.table("campaigns")\
            .delete()\
            .eq("id", id)\
            .execute()
        return {"success": True, "message": "Campaign deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting campaign: {e}")
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
            
        # Set campaign to running and spawn the background dialer loop
        supabase_admin.table("campaigns").update({"status": "running"}).eq("id", id).execute()
        
        import asyncio
        from app.services.campaign_service import CampaignService, running_campaign_tasks, active_campaign_ids
        active_campaign_ids.discard(id)
        task = asyncio.create_task(CampaignService.run_campaign_loop(id, bypass_hours=True))
        running_campaign_tasks.add(task)
        task.add_done_callback(running_campaign_tasks.discard)
        logger.info(f"Retry triggered: started calling loop for campaign {id} (bypassing hours for manual retry)")
            
        return {"success": True, "data": res.data[0] if res.data else {}}
    except Exception as e:
        logger.error(f"Error retrying contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/send-report")
async def trigger_campaign_report(id: str):
    """
    On-demand campaign report generation and dispatch to Telegram, WhatsApp, and in-app dashboard.
    """
    try:
        camp_res = await asyncio.to_thread(
            supabase_admin.table("campaigns").select("*").eq("id", id).limit(1).execute
        )
        if not camp_res or not camp_res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")

        res = await CampaignService.dispatch_campaign_report(id, camp_res.data[0])
        return {"success": True, "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error dispatching report for campaign {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

