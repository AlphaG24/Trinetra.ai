import logging
import asyncio
from database import supabase_admin

logger = logging.getLogger("CampaignAnalyticsService")

class CampaignAnalyticsService:
    """Generate analytics data for campaigns"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    async def get_campaign_stats(self, campaign_id: str) -> dict:
        """Core stats for a single campaign"""
        # Get campaign base data
        campaign = await self.supabase.table("campaigns") \
            .select("*").eq("id", campaign_id).single().execute()
        
        if not campaign.data:
            return None
        
        c = campaign.data
        
        # Get call stats from voice_calls linked to this campaign's contacts
        call_ids = await self._get_campaign_call_ids(campaign_id)
        if not call_ids:
            calls_data = []
        else:
            calls = await self.supabase.table("voice_calls") \
                .select("status, duration_seconds, sentiment, started_at") \
                .in_("id", call_ids).execute()
            calls_data = calls.data or []
        
        # Get lead stats
        lead_ids = await self._get_campaign_lead_ids(campaign_id)
        if not lead_ids:
            leads_data = []
        else:
            leads = await self.supabase.table("leads") \
                .select("stage, interest_level, created_at") \
                .in_("id", lead_ids).execute()
            leads_data = leads.data or []
        
        return {
            "campaign_id": campaign_id,
            "name": c.get("name"),
            "status": c.get("status"),
            "contact_stats": {
                "total": c.get("total_contacts", 0),
                "called": c.get("contacts_called", 0),
                "connected": c.get("contacts_connected", 0),
                "dnd": c.get("contacts_dnd", 0),
                "pending": c.get("total_contacts", 0) - c.get("contacts_called", 0) - c.get("contacts_dnd", 0)
            },
            "call_stats": self._aggregate_call_stats(calls_data),
            "lead_stats": self._aggregate_lead_stats(leads_data),
            "conversion_rate": self._calc_conversion(c, leads_data),
            "answer_rate": self._calc_answer_rate(c),
        }
    
    async def get_campaigns_comparison(self, organization_id: str) -> dict:
        """Compare all campaigns for an organization"""
        campaigns = await self.supabase.table("campaigns") \
            .select("*").eq("organization_id", organization_id) \
            .order("created_at", desc=True).execute()
        
        comparison = []
        for c in campaigns.data:
            stats = await self.get_campaign_stats(c["id"])
            if stats:
                comparison.append({
                    "id": c["id"],
                    "name": c["name"],
                    "status": c["status"],
                    "total_contacts": c["total_contacts"],
                    "contacts_called": c["contacts_called"],
                    "answer_rate": stats["answer_rate"],
                    "conversion_rate": stats["conversion_rate"],
                    "leads_generated": c["leads_generated"],
                })
        
        return {"campaigns": comparison}
    
    async def get_call_volume_by_hour(self, campaign_id: str) -> dict:
        """Calls made per hour for heatmap/bar chart"""
        call_ids = await self._get_campaign_call_ids(campaign_id)
        if not call_ids:
            return {"hourly_volume": []}
            
        calls = await self.supabase.table("voice_calls") \
            .select("started_at, status") \
            .in_("id", call_ids).execute()
        
        hourly = {}
        for call in (calls.data or []):
            if call.get("started_at"):
                # Normalize ISO started_at to hour string: MM-DD HH:00
                dt_str = call["started_at"]
                try:
                    # '2026-08-04T12:34:56' -> '08-04 12:00'
                    date_part, time_part = dt_str.split('T')
                    hour_part = time_part.split(':')[0]
                    label = f"{date_part[-5:]} {hour_part}:00"
                    hourly[label] = hourly.get(label, 0) + 1
                except Exception:
                    hour = dt_str[:13]
                    hourly[hour] = hourly.get(hour, 0) + 1
        
        return {"hourly_volume": [{"hour": h, "calls": c} for h, c in sorted(hourly.items())]}
    
    async def get_sentiment_distribution(self, campaign_id: str) -> dict:
        """Sentiment breakdown for connected calls"""
        call_ids = await self._get_campaign_call_ids(campaign_id)
        if not call_ids:
            return {"sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0}}
            
        calls = await self.supabase.table("voice_calls") \
            .select("sentiment") \
            .in_("id", call_ids) \
            .not_.is_("sentiment", "null").execute()
        
        dist = {"positive": 0, "neutral": 0, "negative": 0}
        for call in (calls.data or []):
            sentiment = call.get("sentiment", "neutral")
            if sentiment in dist:
                dist[sentiment] += 1
        
        return {"sentiment_distribution": dist}
    
    def _aggregate_call_stats(self, calls: list) -> dict:
        if not calls:
            return {"total_calls": 0, "avg_duration_seconds": 0, "total_duration_seconds": 0, "answered": 0, "no_answer": 0, "busy": 0, "failed": 0}
        
        durations = [c.get("duration_seconds", 0) or 0 for c in calls]
        statuses = [c.get("status", "") for c in calls]
        
        return {
            "total_calls": len(calls),
            "avg_duration_seconds": sum(durations) / len(durations) if durations else 0,
            "total_duration_seconds": sum(durations),
            "answered": statuses.count("answered") + statuses.count("completed"),
            "no_answer": statuses.count("no_answer"),
            "busy": statuses.count("busy"),
            "failed": statuses.count("failed"),
        }
    
    def _aggregate_lead_stats(self, leads: list) -> dict:
        if not leads:
            return {"total_leads": 0, "hot": 0, "warm": 0, "cold": 0, "stages": {}}
        
        stages = {}
        interest = {"hot": 0, "warm": 0, "cold": 0}
        for lead in leads:
            stage = lead.get("stage", "new")
            stages[stage] = stages.get(stage, 0) + 1
            level = lead.get("interest_level", "cold")
            if level in interest:
                interest[level] += 1
        
        return {
            "total_leads": len(leads),
            "interest": interest,
            "stages": stages,
        }
    
    def _calc_conversion(self, campaign: dict, leads: list) -> float:
        if campaign.get("contacts_connected", 0) == 0:
            return 0.0
        return round((len(leads) / campaign["contacts_connected"]) * 100, 1)
    
    def _calc_answer_rate(self, campaign: dict) -> float:
        if campaign.get("contacts_called", 0) == 0:
            return 0.0
        return round((campaign.get("contacts_connected", 0) / campaign["contacts_called"]) * 100, 1)
    
    async def _get_campaign_call_ids(self, campaign_id: str) -> list:
        contacts = await self.supabase.table("campaign_contacts") \
            .select("call_id").eq("campaign_id", campaign_id) \
            .not_.is_("call_id", "null").execute()
        return [c["call_id"] for c in contacts.data if c.get("call_id")]
    
    async def _get_campaign_lead_ids(self, campaign_id: str) -> list:
        contacts = await self.supabase.table("campaign_contacts") \
            .select("lead_id").eq("campaign_id", campaign_id) \
            .not_.is_("lead_id", "null").execute()
        return [c["lead_id"] for c in contacts.data if c.get("lead_id")]
