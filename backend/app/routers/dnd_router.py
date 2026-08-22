from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging
from database import supabase_admin
from app.services.dnd_service import DNDService

logger = logging.getLogger("DNDRouter")
router = APIRouter(prefix="/api/dnd", tags=["dnd"])

@router.post("/check")
async def check_dnd(phone_numbers: List[str]):
    """Check if numbers are in DND registry"""
    try:
        dnd_service = DNDService(supabase_admin)
        results = await dnd_service.check_numbers_batch(phone_numbers)
        return {"success": True, "data": results}
    except Exception as e:
        logger.error(f"Error checking DND: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/add")
async def add_dnd(phone_numbers: List[str], source: str = "manual"):
    """Add numbers to DND registry"""
    try:
        dnd_service = DNDService(supabase_admin)
        await dnd_service.bulk_upload(phone_numbers, source)
        return {"success": True, "message": f"Added {len(phone_numbers)} numbers to DND"}
    except Exception as e:
        logger.error(f"Error adding DND: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/bulk-delete")
async def bulk_delete_dnd(source: Optional[str] = Query(None), before_date: Optional[str] = Query(None)):
    """Bulk delete DND entries by source or date threshold"""
    try:
        dnd_service = DNDService(supabase_admin)
        await dnd_service.bulk_delete_by_source_or_date(source, before_date)
        return {"success": True, "message": "Bulk deletion completed successfully"}
    except Exception as e:
        logger.error(f"Error bulk deleting DND: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{phone_number}")
async def remove_dnd(phone_number: str):
    """Remove a number from DND registry"""
    try:
        dnd_service = DNDService(supabase_admin)
        await dnd_service.remove_from_dnd(phone_number)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error removing DND number: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
