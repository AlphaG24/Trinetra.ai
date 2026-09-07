import os
import logging
from typing import Dict, Any

from app.services.telephony.base import AbstractTelephonyProvider
from app.services.telephony.simulated import SimulatedProvider
from app.services.telephony.twilio import TwilioProvider
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
    elif provider_name == "twilio":
        provider = TwilioProvider()
    else:
        # Fallback default to Twilio
        provider = TwilioProvider()
        
    _provider_cache[provider_name] = provider
    return provider

def get_best_provider(country_code: str = 'IN') -> str:
    return 'twilio'

def get_provider_for_organization(organization_id: str) -> AbstractTelephonyProvider:
    env_override = os.getenv("TELEPHONY_PROVIDER")
    if env_override:
        logger.info(f"Using environment override {env_override} for org {organization_id}")
        return get_provider(env_override)
        
    return get_provider("twilio")

def clear_provider_cache():
    logger.info("Clearing telephony provider cache")
    _provider_cache.clear()
