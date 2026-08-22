import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone

from app.services.telephony.base import DIDType, ProvisionedNumber
from app.services.telephony.exceptions import RateLimitExceededError, TelephonyProviderError
from app.services.telephony.factory import get_provider, get_provider_for_organization

logger = logging.getLogger("NumberService")

# Stub for PricingService - implement fully as needed
class PricingService:
    def get_provider_cost(self, provider: str, did_type: str) -> int:
        # returns cost in paisa (e.g., 500 = 5 INR)
        return 500
        
    def get_retail_price(self, provider: str, did_type: str) -> int:
        return 1000

class NumberService:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.pricing_service = PricingService()

    async def check_rate_limit(self, organization_id: str) -> bool:
        try:
            # Check phone_numbers created in last 24 hours for this org
            # Supabase doesn't easily support raw interval queries in select, 
            # so we'll query by created_at >= 24 hours ago
            import datetime
            yesterday = (datetime.datetime.now(timezone.utc) - datetime.timedelta(days=1)).isoformat()
            
            res = self.supabase.table("phone_numbers") \
                .select("id", count="exact") \
                .eq("organization_id", organization_id) \
                .gte("created_at", yesterday) \
                .execute()
                
            count = res.count if res.count is not None else 0
            if count >= 5:
                logger.warning(f"Rate limit exceeded for org {organization_id}: {count} numbers provisioned in last 24h")
                return False
            return True
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            # Fail closed or open? Usually open if DB fails, but fail closed is safer. Let's fail open to not block users on transient DB errors, or return True.
            return True

    async def provision_number(self, user_id: str, org_id: str, area_code: str, did_type: str, provider_name: str = None, specific_phone_number: str = None) -> ProvisionedNumber:
        try:
            # STEP 1: Check rate limit
            is_within_limit = await self.check_rate_limit(org_id)
            if not is_within_limit:
                raise RateLimitExceededError(provider_name or "unknown", retry_after="24h", message="Maximum of 5 numbers per day allowed")

            # STEP 2: Get provider
            if provider_name:
                provider = get_provider(provider_name)
            else:
                provider = get_provider_for_organization(org_id)
                
            did_type_enum = DIDType(did_type)

            # STEP 3: Call provider
            provisioned = await provider.provision_number(
                area_code=area_code,
                did_type=did_type_enum,
                organization_id=org_id,
                phone_number=specific_phone_number
            )

            # STEP 4 & 5: Get Pricing
            monthly_cost = self.pricing_service.get_provider_cost(provider.provider_name, did_type)
            retail_price = self.pricing_service.get_retail_price(provider.provider_name, did_type)

            # STEP 6: Save to phone_numbers table
            db_res = self.supabase.table("phone_numbers").insert({
                "organization_id": org_id,
                "provider": provider.provider_name,
                "provider_number_id": provisioned.provider_number_id,
                "phone_number": provisioned.phone_number,
                "area_code": provisioned.area_code,
                "city": provisioned.city,
                "did_type": provisioned.did_type.value,
                "status": "active",
                "monthly_cost_paisa": monthly_cost,
                "retail_price_paisa": retail_price,
                "metadata": provisioned.metadata
            }).execute()
            
            if not db_res.data:
                raise Exception("Failed to insert phone number into database")
                
            db_id = db_res.data[0]['id']
            provisioned.trinetra_id = db_id

            # STEP 7: Add invoice line item (skipped gracefully)
            
            # STEP 8: Write to audit_logs
            try:
                self.supabase.table("audit_logs").insert({
                    "user_id": user_id,
                    "organization_id": org_id,
                    "action": "number_provisioned",
                    "resource_type": "phone_number",
                    "resource_id": db_id,
                    "new_values": {
                        "phone_number": provisioned.phone_number,
                        "provider": provider.provider_name,
                        "did_type": provisioned.did_type.value,
                        "city": provisioned.city
                    }
                }).execute()
            except Exception as e:
                logger.error(f"Failed to write audit log: {e}")

            # STEP 9: Write to activity_log
            try:
                self.supabase.table("activity_log").insert({
                    "user_id": user_id,
                    "organization_id": org_id,
                    "activity_type": "number_provisioned",
                    "title": "Phone Number Provisioned",
                    "description": f"Provisioned {provisioned.phone_number} ({provisioned.city}, {provisioned.did_type.value})"
                }).execute()
            except Exception as e:
                logger.error(f"Failed to write activity log: {e}")

            # STEP 10
            return provisioned
            
        except RateLimitExceededError:
            raise
        except TelephonyProviderError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in provision_number: {e}", exc_info=True)
            raise TelephonyProviderError("NumberService", f"Provisioning failed due to internal error")

    async def release_number(self, user_id: str, phone_number_id: str) -> bool:
        try:
            # STEP 1: Verify ownership
            # Get user's org
            profile_res = self.supabase.table("profiles").select("organization_id").eq("id", user_id).single().execute()
            user_org = profile_res.data.get("organization_id") if profile_res.data else None
            
            # Get number
            num_res = self.supabase.table("phone_numbers").select("*").eq("id", phone_number_id).single().execute()
            if not num_res.data:
                raise Exception("Phone number not found")
                
            number_data = num_res.data
            if number_data.get("organization_id") != user_org:
                raise Exception("Unauthorized: Number belongs to different organization")

            # STEP 2: Unassign from all agents
            self.supabase.table("agent_phone_numbers").delete().eq("phone_number_id", phone_number_id).execute()

            # STEP 3: Get provider and call release_number
            provider = get_provider(number_data.get("provider"))
            await provider.release_number(number_data.get("provider_number_id"))

            # STEP 4: Update phone_numbers status
            self.supabase.table("phone_numbers").update({
                "status": "released",
                "released_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", phone_number_id).execute()

            # STEP 5: Write to audit_logs
            try:
                self.supabase.table("audit_logs").insert({
                    "user_id": user_id,
                    "organization_id": user_org,
                    "action": "number_released",
                    "resource_type": "phone_number",
                    "resource_id": phone_number_id,
                    "old_values": {"status": number_data.get("status")},
                    "new_values": {"status": "released"}
                }).execute()
            except Exception as e:
                logger.error(f"Failed to write audit log: {e}")

            # STEP 6: Write to activity_log
            try:
                self.supabase.table("activity_log").insert({
                    "user_id": user_id,
                    "organization_id": user_org,
                    "activity_type": "number_released",
                    "title": "Phone Number Released",
                    "description": f"Released {number_data.get('phone_number')}"
                }).execute()
            except Exception as e:
                logger.error(f"Failed to write activity log: {e}")

            # STEP 7
            return True
            
        except Exception as e:
            logger.error(f"Error in release_number: {e}", exc_info=True)
            raise TelephonyProviderError("NumberService", f"Release failed due to internal error")

    async def assign_number_to_agent(self, user_id: str, phone_number_id: str, agent_id: str, is_primary: bool = False) -> bool:
        try:
            # STEP 1: Verify ownership
            profile_res = self.supabase.table("profiles").select("organization_id").eq("id", user_id).single().execute()
            user_org = profile_res.data.get("organization_id") if profile_res.data else None
            
            num_res = self.supabase.table("phone_numbers").select("organization_id, phone_number").eq("id", phone_number_id).single().execute()
            if not num_res.data or num_res.data.get("organization_id") != user_org:
                raise Exception("Unauthorized: Phone number not found or belongs to different org")
                
            agent_res = self.supabase.table("agents").select("organization_id, name").eq("id", agent_id).single().execute()
            if not agent_res.data or agent_res.data.get("organization_id") != user_org:
                raise Exception("Unauthorized: Agent not found or belongs to different org")
                
            # STEP 2: If is_primary, unset primary for other numbers
            if is_primary:
                self.supabase.table("agent_phone_numbers").update({"is_primary": False}).eq("agent_id", agent_id).execute()

            # STEP 3: Insert into agent_phone_numbers
            self.supabase.table("agent_phone_numbers").insert({
                "agent_id": agent_id,
                "phone_number_id": phone_number_id,
                "is_primary": is_primary
            }).execute()

            # STEP 4: Write to activity_log
            try:
                self.supabase.table("activity_log").insert({
                    "user_id": user_id,
                    "organization_id": user_org,
                    "activity_type": "number_assigned",
                    "title": "Phone Number Assigned",
                    "description": f"Assigned {num_res.data.get('phone_number')} to agent {agent_res.data.get('name')}"
                }).execute()
            except Exception:
                pass

            # STEP 5
            return True
        except Exception as e:
            logger.error(f"Error in assign_number_to_agent: {e}", exc_info=True)
            raise TelephonyProviderError("NumberService", "Failed to assign number to agent")

    async def unassign_number_from_agent(self, user_id: str, phone_number_id: str, agent_id: str) -> bool:
        try:
            # STEP 1: Verify ownership
            profile_res = self.supabase.table("profiles").select("organization_id").eq("id", user_id).single().execute()
            user_org = profile_res.data.get("organization_id") if profile_res.data else None
            
            num_res = self.supabase.table("phone_numbers").select("organization_id").eq("id", phone_number_id).single().execute()
            if not num_res.data or num_res.data.get("organization_id") != user_org:
                raise Exception("Unauthorized access")

            # STEP 2: Delete from agent_phone_numbers
            self.supabase.table("agent_phone_numbers").delete().eq("phone_number_id", phone_number_id).eq("agent_id", agent_id).execute()

            # STEP 3: Write to activity_log
            try:
                self.supabase.table("activity_log").insert({
                    "user_id": user_id,
                    "organization_id": user_org,
                    "activity_type": "number_unassigned",
                    "title": "Phone Number Unassigned",
                    "description": f"Unassigned number from agent"
                }).execute()
            except Exception:
                pass

            # STEP 4
            return True
        except Exception as e:
            logger.error(f"Error in unassign_number_from_agent: {e}", exc_info=True)
            raise TelephonyProviderError("NumberService", "Failed to unassign number")

    async def get_organization_numbers(self, organization_id: str) -> List[Dict]:
        try:
            # Fetch phone numbers
            res = self.supabase.table("phone_numbers").select("*").eq("organization_id", organization_id).in_("status", ["provisioning", "active"]).execute()
            numbers = res.data or []
            
            if not numbers:
                return []
                
            # Fetch assigned agents mapping
            number_ids = [n['id'] for n in numbers]
            agents_res = self.supabase.table("agent_phone_numbers").select("phone_number_id, agent_id, is_primary, agents(name)").in_("phone_number_id", number_ids).execute()
            
            # Group agents by phone_number_id
            assignments = {}
            if agents_res.data:
                for a in agents_res.data:
                    pid = a['phone_number_id']
                    if pid not in assignments:
                        assignments[pid] = []
                    assignments[pid].append({
                        "agent_id": a['agent_id'],
                        "agent_name": a.get("agents", {}).get("name", "Unknown"),
                        "is_primary": a['is_primary']
                    })
                    
            # Combine
            for n in numbers:
                n['assigned_agents'] = assignments.get(n['id'], [])
                
            return numbers
        except Exception as e:
            logger.error(f"Error fetching org numbers: {e}", exc_info=True)
            raise TelephonyProviderError("NumberService", "Failed to fetch organization numbers")

    async def sync_numbers_from_provider(self, organization_id: str, provider_name: str):
        provider = get_provider(provider_name)
        # List all active numbers from provider
        numbers = await provider.list_provisioned_numbers()
        
        synced = []
        for num in numbers:
            # Check if already in DB by provider_number_id
            existing = self.supabase.table("phone_numbers").select("id").eq("provider_number_id", num["provider_number_id"]).execute()
            if not existing.data:
                # Insert into phone_numbers
                insert_data = {
                    "organization_id": organization_id,
                    "provider": provider_name,
                    "provider_number_id": num["provider_number_id"],
                    "phone_number": num["phone_number"],
                    "area_code": num.get("area_code", ""),
                    "city": num.get("city", ""),
                    "did_type": num.get("did_type", "local"),
                    "status": "active",
                    "monthly_cost_paisa": num.get("monthly_cost_paisa", 0),
                    "retail_price_paisa": num.get("retail_price_paisa", 0),
                    "metadata": num.get("metadata", {}),
                    "provisioned_at": num.get("provisioned_at", datetime.now(timezone.utc).isoformat())
                }
                self.supabase.table("phone_numbers").insert(insert_data).execute()
                synced.append(num["phone_number"])
        return {"synced_count": len(synced), "numbers": synced}
