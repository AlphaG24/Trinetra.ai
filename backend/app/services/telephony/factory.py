import os
import logging
from typing import Dict, Any

from app.services.telephony.base import AbstractTelephonyProvider
from app.services.telephony.simulated import SimulatedProvider
from app.services.telephony.twilio import TwilioProvider
from app.services.sarvam_voice_service import SarvamVoiceService
from database import supabase_admin

logger = logging.getLogger("TelephonyFactory")

_provider_cache: Dict[str, Any] = {}

def get_provider(provider_name: str) -> Any:
    provider_name = provider_name.lower()
    
    if provider_name in _provider_cache:
        logger.info(f"Returning cached {provider_name} provider")
        return _provider_cache[provider_name]
        
    logger.info(f"Creating new {provider_name} provider instance")
    
    if provider_name == "simulated":
        provider = SimulatedProvider()
    elif provider_name in ("sarvam", "voicelink"):
        provider = SarvamVoiceService()
    elif provider_name == "twilio":
        provider = TwilioProvider()
    else:
        raise ValueError(f"Unknown telephony provider: {provider_name}")
        
    _provider_cache[provider_name] = provider
    return provider

def get_best_provider(country_code: str = 'IN') -> str:
    country = (country_code or '').upper().strip()
    if country in ('IN', 'INDIA'):
        logger.info(f"Selected sarvam as primary provider for country: {country}")
        return 'sarvam'
    logger.info(f"Selected twilio as primary provider for country: {country}")
    return 'twilio'

def get_provider_for_organization(organization_id: str) -> AbstractTelephonyProvider:
    env_override = os.getenv("TELEPHONY_PROVIDER")
    if env_override:
        logger.info(f"Using environment override {env_override} for org {organization_id}")
        return get_provider(env_override)
        
    # Query profiles for user's country
    country_code = 'US' # Default
    try:
        res = supabase_admin.table("profiles").select("country").eq("organization_id", organization_id).limit(1).execute()
        if res.data and len(res.data) > 0 and res.data[0].get("country"):
            country_code = res.data[0]["country"]
    except Exception as e:
        logger.warning(f"Failed to fetch country for org {organization_id}, using default: {e}")
        
    provider_name = get_best_provider(country_code)
    logger.info(f"Selected {provider_name} for org {organization_id} based on country {country_code}")
    
    return get_provider(provider_name)

def clear_provider_cache():
    logger.info("Clearing telephony provider cache")
    _provider_cache.clear()
