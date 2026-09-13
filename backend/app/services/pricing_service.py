import time
import logging
from typing import Dict, Optional, Any
from database import supabase_admin

logger = logging.getLogger("PricingService")

# Module-level cache to share across instances
_cache: Dict[str, dict] = {}
_cache_ttl_seconds: int = 300  # 5 minutes

class PricingService:
    def __init__(self, supabase_client=None):
        # Allow passing a specific client (e.g. for user context), but default to admin
        # Pricing config is typically fetched with admin privileges
        self.supabase = supabase_client or supabase_admin

    async def _get_config(self, key: str, default: str = None) -> Optional[str]:
        """Fetch config with caching and graceful degradation."""
        now = time.time()
        
        # Check cache
        if key in _cache:
            entry = _cache[key]
            if now - entry['cached_at'] < _cache_ttl_seconds:
                logger.debug(f"Cache hit for pricing config: {key}")
                return entry['value']

        # Cache miss - fetch from DB
        try:
            res = self.supabase.table("system_config").select("config_value").eq("config_key", key).single().execute()
            if res.data and res.data.get("config_value") is not None:
                val = str(res.data["config_value"]).strip()
                _cache[key] = {'value': val, 'cached_at': now}
                logger.debug(f"Config '{key}' loaded from DB: {val}")
                return val
        except Exception as e:
            # Check if it's just a missing row error (e.g., PostgrestAPIError 406 Not Acceptable / JSON object requested)
            if "JSON object requested" not in str(e):
                logger.warning(f"DB error fetching config '{key}': {e}. Using cache/default if available.")
        
        # If DB fails or key not found, serve stale cache if available, else default
        if key in _cache:
            logger.warning(f"Config '{key}' not found or error, serving stale cache")
            return _cache[key]['value']

        logger.warning(f"Config '{key}' not found, using default: {default}")
        return default

    async def _get_config_int(self, key: str, default: int = 0) -> int:
        val = await self._get_config(key)
        if val is None:
            return default
        try:
            return int(val)
        except ValueError:
            logger.error(f"Invalid integer config for '{key}': {val}")
            return default

    async def _get_config_float(self, key: str, default: float = 0.0) -> float:
        val = await self._get_config(key)
        if val is None:
            return default
        try:
            return float(val)
        except ValueError:
            logger.error(f"Invalid float config for '{key}': {val}")
            return default

    async def get_provider_cost(self, provider: str, did_type: str, country_code: str = "IN") -> Optional[int]:
        provider = provider.lower()
        did_type = did_type.lower()
        
        if provider == "exotel":
            key = f"{provider}_{did_type}_did_cost_paisa"
        elif provider == "twilio":
            key = f"twilio_{country_code.upper()}_{did_type}_cost_paisa"
            # Attempt to fetch country specific
            val_str = await self._get_config(key)
            if val_str is None:
                # Fallback to generic
                key = f"twilio_{did_type}_cost_paisa"
        else:
            # Other providers (e.g., simulated)
            key = f"{provider}_{did_type}_cost_paisa"

        val_str = await self._get_config(key)
        if val_str is None:
            logger.warning(f"Missing cost config for provider '{provider}' did_type '{did_type}' (key: {key})")
            return None
            
        try:
            return int(val_str)
        except ValueError:
            logger.error(f"Invalid cost format for key '{key}': {val_str}")
            return None

    async def get_all_provider_costs(self, provider: str) -> Dict[str, int]:
        provider = provider.lower()
        types = ["mobile", "landline", "tollfree", "92series", "local"]
        costs = {}
        for t in types:
            cost = await self.get_provider_cost(provider, t)
            if cost is not None:
                costs[t] = cost
        return costs

    async def get_markup_percent(self) -> int:
        markup = await self._get_config_int("trinetra_number_markup_percent", 20)
        logger.debug(f"Using markup: {markup}%")
        return markup

    async def get_retail_price(self, provider: str, did_type: str, country_code: str = "IN") -> Optional[int]:
        cost = await self.get_provider_cost(provider, did_type, country_code)
        if cost is None:
            return None
            
        markup = await self.get_markup_percent()
        retail = round(cost * (1 + markup / 100.0))
        logger.info(f"Retail price for {provider} {did_type}: {retail} paisa (cost: {cost} + {markup}%)")
        return retail

    async def should_show_prices(self) -> bool:
        val = await self._get_config("show_number_prices_to_users")
        if val is None:
            logger.warning("Config 'show_number_prices_to_users' missing, defaulting to False")
            return False
        return str(val).lower() in ("true", "1", "yes", "t")

    async def format_price_for_display(self, provider: str, did_type: str) -> str:
        show = await self.should_show_prices()
        if not show:
            return "Billed monthly"
            
        retail = await self.get_retail_price(provider, did_type)
        if retail is None:
            return "Contact sales"
            
        rupees = retail / 100.0
        if rupees.is_integer():
            return f"₹{int(rupees)}/month"
        return f"₹{rupees:.2f}/month"

    async def get_price_display_map(self) -> Dict[str, str]:
        # Predefined combinations we might care about
        combos = [
            ("exotel", "mobile"), ("exotel", "landline"),
            ("twilio", "local"), ("twilio", "mobile")
        ]
        
        result = {}
        for provider, dtype in combos:
            key = f"{provider}_{dtype}"
            display = await self.format_price_for_display(provider, dtype)
            result[key] = display
            
        return result

    async def calculate_monthly_phone_bill(self, organization_id: str) -> Dict:
        try:
            res = self.supabase.table("phone_numbers").select(
                "id, phone_number, did_type, provider, retail_price_paisa"
            ).eq("organization_id", organization_id).eq("status", "active").execute()
            
            numbers = res.data or []
            
            total_paisa = 0
            breakdown = []
            
            for num in numbers:
                price_paisa = num.get("retail_price_paisa")
                # Calculate fresh if missing
                if price_paisa is None:
                    price_paisa = await self.get_retail_price(num["provider"], num["did_type"])
                    if price_paisa is not None:
                        # Keep DB in sync
                        try:
                            self.supabase.table("phone_numbers").update({"retail_price_paisa": price_paisa}).eq("id", num["id"]).execute()
                        except Exception as e:
                            logger.error(f"Failed to sync retail_price_paisa for number {num['id']}: {e}")
                
                if price_paisa is None:
                    price_paisa = 0 # Cannot bill if price is unknown
                    
                total_paisa += price_paisa
                
                # Format for display
                rupees = price_paisa / 100.0
                if rupees.is_integer():
                    display = f"₹{int(rupees)}/month"
                else:
                    display = f"₹{rupees:.2f}/month"
                    
                breakdown.append({
                    "id": num["id"],
                    "phone_number": num["phone_number"],
                    "did_type": num["did_type"],
                    "provider": num["provider"],
                    "price_paisa": price_paisa,
                    "price_display": display
                })
                
            total_rupees = total_paisa / 100.0
            total_display = f"₹{int(total_rupees)}/month" if total_rupees.is_integer() else f"₹{total_rupees:.2f}/month"
            
            return {
                "total_paisa": total_paisa,
                "total_display": total_display,
                "number_count": len(numbers),
                "breakdown": breakdown
            }
        except Exception as e:
            logger.error(f"Error calculating phone bill for org {organization_id}: {e}")
            return {
                "total_paisa": 0,
                "total_display": "₹0/month",
                "number_count": 0,
                "breakdown": []
            }

    async def validate_pricing_configured(self, provider: str) -> Dict:
        provider = provider.lower()
        required_keys = []
        if provider == "exotel":
            required_keys = [
                "exotel_mobile_did_cost_paisa",
                "exotel_landline_did_cost_paisa"
            ]
        elif provider == "twilio":
            # Just check if at least one twilio cost is configured
            required_keys = ["twilio_US_local_cost_paisa"] # Basic check
            
        configured_keys = {}
        missing_keys = []
        
        for k in required_keys:
            val = await self._get_config(k)
            if val is not None:
                try:
                    configured_keys[k] = {"configured": True, "value": int(val)}
                except ValueError:
                    missing_keys.append(k)
                    configured_keys[k] = {"configured": False, "value": val}
            else:
                missing_keys.append(k)
                configured_keys[k] = {"configured": False, "value": None}
                
        is_fully_configured = len(missing_keys) == 0
        if provider == "twilio" and not is_fully_configured:
            # More complex logic could be here for twilio, but standard requirement check
            # We'll allow it if any twilio config exists
            try:
                res = self.supabase.table("system_config").select("config_key").like("config_key", "twilio_%_cost_paisa").execute()
                if res.data and len(res.data) > 0:
                    is_fully_configured = True
                    missing_keys = []
                    for item in res.data:
                        k = item["config_key"]
                        v = await self._get_config_int(k)
                        configured_keys[k] = {"configured": True, "value": v}
            except Exception:
                pass

        return {
            "is_fully_configured": is_fully_configured,
            "provider": provider,
            "missing_keys": missing_keys,
            "configured_keys": configured_keys
        }

    async def validate_markup_sane(self) -> bool:
        markup = await self.get_markup_percent()
        if markup > 100:
            logger.warning("Markup exceeds 100% — this may be intentional")
            return True
        if markup < 0:
            logger.error("Negative markup detected — selling below cost")
            return False
        return True

    def clear_cache(self):
        logger.info("Pricing cache cleared")
        _cache.clear()

    async def refresh_cache(self):
        logger.info("Refreshing pricing cache")
        keys = [
            "trinetra_number_markup_percent",
            "show_number_prices_to_users",
            "max_phone_numbers_per_org"
        ]
        
        # Pre-fetch known provider keys
        types = ["mobile", "landline"]
        for t in types:
            keys.append(f"exotel_{t}_did_cost_paisa")
            
        keys.extend([
            "twilio_US_local_cost_paisa",
            "twilio_UK_local_cost_paisa",
            "twilio_IN_mobile_cost_paisa"
        ])
        
        for k in keys:
            await self._get_config(k)

    async def get_max_phone_numbers(self, organization_id: str = None) -> int:
        return await self._get_config_int("max_phone_numbers_per_org", 10)
