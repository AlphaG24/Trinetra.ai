import logging
import asyncio
from datetime import datetime
from database import supabase_admin

logger = logging.getLogger("UsageService")

class UsageService:
    """Enforces plan limits and tracks usage across organizations"""
    
    def __init__(self, supabase_client=None):
        self.supabase = supabase_admin if supabase_client is None else supabase_client
    
    async def check_agent_minutes(self, agent_id: str) -> dict:
        """Check if an agent has exceeded its minutes limit"""
        res = await asyncio.to_thread(
            self.supabase.table("agents")
            .select("id, name, organization_id, minutes_limit, minutes_used, status, config")
            .eq("id", agent_id).single().execute
        )
        
        if not res.data:
            return {"error": "Agent not found"}
        
        a = res.data
        db_limit = a.get("minutes_limit", 0) or 0
        org_id = a.get("organization_id")
        config = a.get("config", {}) or {}
        
        # Calculate dynamic minutes used by this agent this month from voice_calls
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0).isoformat()
        try:
            calls_res = await asyncio.to_thread(
                self.supabase.table("voice_calls")
                .select("duration_seconds")
                .eq("agent_id", agent_id)
                .gte("created_at", start_of_month).execute
            )
            import math
            used = sum(max(1, math.ceil((c.get("duration_seconds", 0) or 0) / 60)) for c in (calls_res.data or []) if (c.get("duration_seconds", 0) or 0) > 0)
            
            # Sync back to agents table so the cached value in the DB matches
            await asyncio.to_thread(
                self.supabase.table("agents").update({"minutes_used": used}).eq("id", agent_id).execute
            )
        except Exception as e:
            logger.error(f"Failed to fetch dynamic minutes for agent {agent_id}: {e}")
            used = a.get("minutes_used", 0) or 0
        
        # 1. Resolve from agent config
        config_limit = config.get("minutes_limit")
        config_tier = config.get("plan_tier")
        
        resolved_limit = db_limit
        if config_limit is not None:
            resolved_limit = max(resolved_limit, int(config_limit))
            
        if config_tier:
            tier_lower = str(config_tier).lower()
            if tier_lower in ('pro', 'professional'):
                resolved_limit = max(resolved_limit, 2000)
            elif tier_lower == 'starter':
                resolved_limit = max(resolved_limit, 500)
            elif tier_lower == 'trial':
                resolved_limit = max(resolved_limit, 100)
            elif tier_lower == 'enterprise':
                resolved_limit = max(resolved_limit, 10000)
                
        # 2. Fallback to profiles table if organization_id is present
        if org_id and resolved_limit <= 100: # Only fallback if we haven't resolved a higher tier limit yet
            try:
                prof_res = await asyncio.to_thread(
                    self.supabase.table("profiles")
                    .select("plan_tier")
                    .eq("organization_id", org_id).execute
                )
                if prof_res.data:
                    plan_tier = (prof_res.data[0].get("plan_tier") or "free").lower()
                    if plan_tier in ('pro', 'professional'):
                        tier_limit = 2000
                    elif plan_tier == 'starter':
                        tier_limit = 500
                    elif plan_tier == 'trial':
                        tier_limit = 100
                    elif plan_tier == 'enterprise':
                        tier_limit = 10000
                    else:
                        tier_limit = 10
                    resolved_limit = max(resolved_limit, tier_limit)
            except Exception as e:
                logger.error(f"Failed to fetch profile plan tier in check_agent_minutes: {e}")

        if resolved_limit == 0:
            return {"status": "unlimited", "used": used, "limit": resolved_limit, "percent": 0}
        
        percent = round((used / resolved_limit) * 100, 1)
        
        # Determine status
        if used >= resolved_limit:
            status = "exceeded"
            await self._pause_agent(agent_id)
        elif percent >= 80:
            status = "warning"
            await self._send_usage_warning(org_id, agent_id, a.get("name"), percent)
        else:
            status = "normal"
        
        return {
            "status": status,
            "used": used,
            "limit": resolved_limit,
            "percent": percent,
            "agent_name": a.get("name")
        }
    
    async def check_organization_limits(self, organization_id: str) -> dict:
        """Check all limits for an organization"""
        # Get profiles plan, additional slots
        prof_res = await asyncio.to_thread(
            self.supabase.table("profiles")
            .select("plan_tier, additional_agents, additional_phone_numbers")
            .eq("organization_id", organization_id).execute
        )
        
        plan_tier = "free"
        additional_agents = 0
        additional_phone_numbers = 0
        
        if prof_res.data:
            # Determine highest tier among profiles in organization
            tiers = [p.get("plan_tier", "free") or "free" for p in prof_res.data]
            normalized_tiers = []
            for t in tiers:
                t_low = t.lower()
                if t_low in ('pro', 'professional'):
                    normalized_tiers.append('professional')
                elif t_low == 'starter':
                    normalized_tiers.append('starter')
                elif t_low == 'trial':
                    normalized_tiers.append('trial')
                else:
                    normalized_tiers.append('free')
            
            if 'professional' in normalized_tiers:
                plan_tier = 'professional'
            elif 'starter' in normalized_tiers:
                plan_tier = 'starter'
            elif 'trial' in normalized_tiers:
                plan_tier = 'trial'
            else:
                plan_tier = 'free'
                
            additional_agents = sum(p.get("additional_agents", 0) or 0 for p in prof_res.data)
            additional_phone_numbers = sum(p.get("additional_phone_numbers", 0) or 0 for p in prof_res.data)
        
        # Base limits based on tier
        base_agents = 1
        base_numbers = 0
        if plan_tier == 'trial':
            base_agents = 3
            base_numbers = 1
        elif plan_tier == 'starter':
            base_agents = 5
            base_numbers = 2
        elif plan_tier == 'professional':
            base_agents = 20
            base_numbers = 5
            
        # Get limits from system_config with fallback defaults
        max_agents = await self._get_config(f"max_agents_{plan_tier}", base_agents) + additional_agents
        max_numbers = await self._get_config(f"max_phone_numbers_{plan_tier}", base_numbers) + additional_phone_numbers
        
        # Fallback if specific config is not set
        if max_numbers == additional_phone_numbers:
            max_numbers = await self._get_config("max_phone_numbers_per_org", 10) + additional_phone_numbers
            
        monthly_minutes = await self._get_config(f"{plan_tier}_minutes", 0)
        if plan_tier == 'trial':
            monthly_minutes = 100
        elif plan_tier == 'starter':
            monthly_minutes = 500
        elif plan_tier == 'professional':
            monthly_minutes = 2000
        
        # Count current usage
        agent_count = await self._count_agents(organization_id)
        number_count = await self._count_phone_numbers(organization_id)
        minutes_used = await self._get_monthly_minutes(organization_id)
        
        # Check each limit (violation only if strictly exceeded)
        violations = []
        warnings = []
        
        if agent_count > max_agents:
            violations.append({"type": "agents", "used": agent_count, "limit": max_agents})
        elif agent_count >= max_agents * 0.8:
            warnings.append({"type": "agents", "used": agent_count, "limit": max_agents})
        
        if number_count > max_numbers:
            violations.append({"type": "phone_numbers", "used": number_count, "limit": max_numbers})
        elif number_count >= max_numbers * 0.8:
            warnings.append({"type": "phone_numbers", "used": number_count, "limit": max_numbers})
        
        if monthly_minutes > 0 and minutes_used > monthly_minutes:
            violations.append({"type": "minutes", "used": minutes_used, "limit": monthly_minutes})
        elif monthly_minutes > 0 and minutes_used >= monthly_minutes * 0.8:
            warnings.append({"type": "minutes", "used": minutes_used, "limit": monthly_minutes})
        
        return {
            "plan_tier": plan_tier,
            "usage": {
                "agents": {"used": agent_count, "limit": max_agents},
                "phone_numbers": {"used": number_count, "limit": max_numbers},
                "minutes": {"used": minutes_used, "limit": monthly_minutes}
            },
            "violations": violations,
            "warnings": warnings,
            "is_paused": len(violations) > 0
        }
    
    async def increment_minutes(self, agent_id: str, duration_seconds: int):
        """Add call duration to agent's minutes used"""
        import math
        minutes = max(1, math.ceil(duration_seconds / 60))
        
        agent_res = await asyncio.to_thread(
            self.supabase.table("agents").select("minutes_used").eq("id", agent_id).single().execute
        )
        
        current = 0
        if agent_res.data:
            current = agent_res.data.get("minutes_used", 0) or 0
            new_used = current + minutes
            await asyncio.to_thread(
                self.supabase.table("agents").update({
                    "minutes_used": new_used
                }).eq("id", agent_id).execute
            )
            logger.info(f"[UsageService] Incremented agent {agent_id} minutes_used: raw_duration={duration_seconds}s -> ceil_minutes={minutes}m | previous={current}m -> new={new_used}m written to DB")
        
        # Check limits after increment
        await self.check_agent_minutes(agent_id)
    
    async def _pause_agent(self, agent_id: str):
        """Pause an agent that exceeded limits"""
        await asyncio.to_thread(
            self.supabase.table("agents").update({
                "status": "paused"
            }).eq("id", agent_id).execute
        )
        
        org_id = await self._get_org_id(agent_id)
        
        if org_id:
            # Log activity
            await asyncio.to_thread(
                self.supabase.table("activity_log").insert({
                    "organization_id": org_id,
                    "user_id": None,
                    "activity_type": "agent_paused",
                    "title": "Agent Paused - Limit Exceeded",
                    "description": f"Agent has exceeded its minutes limit and has been paused. Upgrade to resume."
                }).execute
            )
        
        logger.warning(f"Agent {agent_id} paused - minutes limit exceeded")
    
    async def _send_usage_warning(self, org_id: str, agent_id: str, agent_name: str, percent: float):
        """Send warning notification at 80% usage"""
        if not org_id:
            return
            
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0).isoformat()
        
        # Check if warning already sent this month
        existing = await asyncio.to_thread(
            self.supabase.table("notifications")
            .select("id")
            .eq("organization_id", org_id)
            .eq("type", "usage_warning")
            .gte("created_at", start_of_month)
            .execute
        )
        
        if existing.data:
            return  # Already warned this month
        
        # Resolve user_id from agent
        try:
            agent_res = await asyncio.to_thread(
                self.supabase.table("agents").select("user_id").eq("id", agent_id).maybeSingle().execute
            )
            user_id = agent_res.data.get("user_id") if agent_res.data else None
            
            if user_id:
                from app.services.notification_service import NotificationService
                await NotificationService.dispatch(
                    user_id=user_id,
                    event_type="usage_warning",
                    title=f"⚠️ {agent_name} at {percent}% usage",
                    message=f"Your agent '{agent_name}' has used {percent}% of its monthly minutes. Upgrade your plan at /dashboard/billing to continue uninterrupted service.",
                    payload={"agent_id": agent_id, "percent": percent}
                )
        except Exception as e:
            logger.warning(f"Failed to dispatch usage warning: {e}")
    
    async def _get_config(self, key: str, default: int) -> int:
        try:
            res = await asyncio.to_thread(
                self.supabase.table("system_config")
                .select("config_value").eq("config_key", key).execute
            )
            if res.data and len(res.data) > 0 and res.data[0].get("config_value"):
                try:
                    return int(res.data[0]["config_value"])
                except ValueError:
                    return default
        except Exception as e:
            logger.warning(f"Error fetching config key {key}: {e}")
        return default
    
    async def _count_agents(self, org_id: str) -> int:
        res = await asyncio.to_thread(
            self.supabase.table("agents")
            .select("id", count="exact")
            .eq("organization_id", org_id)
            .neq("status", "deleted").execute
        )
        return res.count if res.count is not None else 0
    
    async def _count_phone_numbers(self, org_id: str) -> int:
        res = await asyncio.to_thread(
            self.supabase.table("phone_numbers")
            .select("id", count="exact")
            .eq("organization_id", org_id)
            .eq("status", "active").execute
        )
        return res.count if res.count is not None else 0
    
    async def _get_monthly_minutes(self, org_id: str) -> int:
        import math
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0).isoformat()
        res = await asyncio.to_thread(
            self.supabase.table("voice_calls")
            .select("duration_seconds")
            .eq("organization_id", org_id)
            .gte("started_at", start_of_month).execute
        )
        
        total_seconds = sum(c.get("duration_seconds", 0) or 0 for c in (res.data or []))
        return math.ceil(total_seconds / 60)
    
    async def _get_org_id(self, agent_id: str) -> str:
        res = await asyncio.to_thread(
            self.supabase.table("agents")
            .select("organization_id").eq("id", agent_id).single().execute
        )
        return res.data["organization_id"] if res.data else None
