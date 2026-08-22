import re
import logging
from database import supabase_admin

logger = logging.getLogger("DNDService")

class DNDService:
    """Handles DND registry checks and management"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    async def check_number(self, phone_number: str) -> bool:
        """Check if a phone number is in DND registry. Returns True if DND."""
        cleaned = self._clean_phone(phone_number)
        if not cleaned:
            return False
        
        result = await self.supabase.table("dnd_registry") \
            .select("id") \
            .eq("phone_number", cleaned) \
            .execute()
        
        return len(result.data) > 0
    
    async def check_numbers_batch(self, phone_numbers: list) -> dict:
        """Check multiple numbers at once. Returns {phone: is_dnd} dict."""
        cleaned_map = {p: self._clean_phone(p) for p in phone_numbers}
        cleaned_numbers = [c for c in cleaned_map.values() if c]
        
        if not cleaned_numbers:
            return {p: False for p in phone_numbers}
            
        result = await self.supabase.table("dnd_registry") \
            .select("phone_number") \
            .in_("phone_number", cleaned_numbers) \
            .execute()
        
        dnd_numbers = {r["phone_number"] for r in result.data}
        return {p: (cleaned_map[p] in dnd_numbers) for p in phone_numbers}
    
    async def add_to_dnd(self, phone_number: str, source: str = "manual"):
        """Add a number to DND registry"""
        cleaned = self._clean_phone(phone_number)
        if not cleaned:
            return
        await self.supabase.table("dnd_registry").upsert({
            "phone_number": cleaned,
            "source": source
        }).execute()
    
    async def remove_from_dnd(self, phone_number: str):
        """Remove a number from DND registry"""
        cleaned = self._clean_phone(phone_number)
        if not cleaned:
            return
        await self.supabase.table("dnd_registry").delete().eq("phone_number", cleaned).execute()
    
    async def bulk_upload(self, phone_numbers: list, source: str = "upload"):
        """Bulk add numbers to DND registry"""
        records = []
        for p in phone_numbers:
            cleaned = self._clean_phone(p)
            if cleaned:
                records.append({"phone_number": cleaned, "source": source})
        if records:
            await self.supabase.table("dnd_registry").upsert(records).execute()
            
    async def bulk_delete_by_source_or_date(self, source: str = None, before_date: str = None):
        """Bulk delete registry items by source and/or registration date threshold"""
        query = self.supabase.table("dnd_registry").delete()
        if source:
            query = query.eq("source", source)
        if before_date:
            query = query.lte("registered_at", before_date)
        await query.execute()
    
    def _clean_phone(self, phone: str) -> str:
        """Clean phone number to standard format: 10 digits"""
        if not phone:
            return ""
        cleaned = re.sub(r'[\s\+\-\(\)]', '', str(phone))
        if cleaned.startswith('91') and len(cleaned) > 10:
            cleaned = cleaned[2:]
        # Get last 10 digits if longer, otherwise keep whatever is left
        return cleaned[-10:] if len(cleaned) >= 10 else cleaned
