from fastapi import APIRouter, HTTPException, Query
import logging
from database import supabase_admin
from app.services.analytics_service import CampaignAnalyticsService

logger = logging.getLogger("CampaignAnalyticsRouter")
router = APIRouter(prefix="/api/campaigns/analytics", tags=["campaign_analytics"])

@router.get("/compare")
async def compare_campaigns(organization_id: str = Query(...)):
    """Compare all campaigns for an organization"""
    try:
        service = CampaignAnalyticsService(supabase_admin)
        data = await service.get_campaigns_comparison(organization_id)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error comparing campaigns: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{campaign_id}")
async def get_campaign_analytics(campaign_id: str):
    """Full analytics metrics for a single campaign"""
    try:
        service = CampaignAnalyticsService(supabase_admin)
        stats = await service.get_campaign_stats(campaign_id)
        if not stats:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        volume = await service.get_call_volume_by_hour(campaign_id)
        sentiment = await service.get_sentiment_distribution(campaign_id)
        
        return {
            "success": True,
            "data": {
                **stats,
                **volume,
                **sentiment
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
