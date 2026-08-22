from typing import Any, Dict, Optional

class TelephonyProviderError(Exception):
    """Base exception for all telephony provider errors."""
    def __init__(self, provider_name: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.provider_name = provider_name
        self.message = message
        self.details = details or {}
        super().__init__(f"[{provider_name}] {message}")

class NumberNotAvailableError(TelephonyProviderError):
    """Raised when requested number type/city not available."""
    def __init__(self, provider_name: str, message: str = "Requested number not available", details: Optional[Dict[str, Any]] = None):
        super().__init__(provider_name, message, details)

class ProvisioningFailedError(TelephonyProviderError):
    """Raised when provisioning fails."""
    def __init__(self, provider_name: str, step_failed: str, message: str = "Provisioning failed", details: Optional[Dict[str, Any]] = None):
        if details is None:
            details = {}
        details['step_failed'] = step_failed
        super().__init__(provider_name, message, details)

class ProviderAuthError(TelephonyProviderError):
    """Raised when API key is invalid or expired."""
    def __init__(self, provider_name: str, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(provider_name, message, details)

class RateLimitExceededError(TelephonyProviderError):
    """Raised when org exceeds max numbers per day."""
    def __init__(self, provider_name: str, retry_after: Optional[str] = None, message: str = "Rate limit exceeded", details: Optional[Dict[str, Any]] = None):
        if details is None:
            details = {}
        if retry_after:
            details['retry_after'] = retry_after
        super().__init__(provider_name, message, details)
