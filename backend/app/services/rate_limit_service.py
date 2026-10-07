"""
backend/app/services/rate_limit_service.py

Centralized Rate Limiting Engine for Trinetra AI.
Implements Master Plan Section 1.4 Decision A5 & Section 18.15.

Governing Limits:
1. Login Rate Limit: 5 attempts per 10 minutes (600s) per IP/Email.
2. API Rate Limit: 60 requests per minute per user/IP (editable globally or per user).
3. Calls Rate Limit: 5 calls per minute per number (editable per user via admin for call center workloads).
"""

import time
import logging
from typing import Dict, Tuple, Optional, Any
from collections import defaultdict

logger = logging.getLogger("RateLimitService")

# Operational defaults per Master Plan Section 1.4 Decision A5
LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5
LOGIN_RATE_LIMIT_WINDOW_SECONDS = 600  # 10 minutes

DEFAULT_API_RPM = 60
API_RATE_LIMIT_WINDOW_SECONDS = 60  # 1 minute

DEFAULT_CALLS_CPM = 5
CALLS_RATE_LIMIT_WINDOW_SECONDS = 60  # 1 minute


class RateLimitService:
    """In-memory sliding window rate limiter with per-user/number overrides."""

    _login_attempts: Dict[str, list] = defaultdict(list)
    _api_requests: Dict[str, list] = defaultdict(list)
    _call_requests: Dict[str, list] = defaultdict(list)

    # Overrides configured via Admin Control Center
    _user_api_overrides: Dict[str, int] = {}
    _user_call_overrides: Dict[str, int] = {}

    @classmethod
    def check_login_rate_limit(
        cls,
        identifier: str,
        now: Optional[float] = None
    ) -> Tuple[bool, int, int]:
        """
        Enforces: 5 login attempts per 10 minutes per IP/Email.
        Returns: (allowed: bool, remaining_attempts: int, retry_after_seconds: int)
        """
        current_time = now if now is not None else time.time()
        cutoff = current_time - LOGIN_RATE_LIMIT_WINDOW_SECONDS

        # Prune expired attempts outside the 10-minute window
        cls._login_attempts[identifier] = [
            t for t in cls._login_attempts[identifier] if t > cutoff
        ]

        attempts = len(cls._login_attempts[identifier])
        if attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS:
            oldest_attempt = cls._login_attempts[identifier][0]
            retry_after = max(1, int(oldest_attempt + LOGIN_RATE_LIMIT_WINDOW_SECONDS - current_time))
            return False, 0, retry_after

        # Record this attempt
        cls._login_attempts[identifier].append(current_time)
        remaining = max(0, LOGIN_RATE_LIMIT_MAX_ATTEMPTS - len(cls._login_attempts[identifier]))
        return True, remaining, 0

    @classmethod
    def check_api_rate_limit(
        cls,
        user_or_ip: str,
        custom_limit: Optional[int] = None,
        now: Optional[float] = None
    ) -> Tuple[bool, int, int]:
        """
        Enforces: 60 requests per minute per user/IP by default.
        Allows custom override per user or from system configuration.
        Returns: (allowed: bool, remaining_requests: int, retry_after_seconds: int)
        """
        current_time = now if now is not None else time.time()
        cutoff = current_time - API_RATE_LIMIT_WINDOW_SECONDS

        effective_limit = custom_limit or cls._user_api_overrides.get(user_or_ip, DEFAULT_API_RPM)

        # Prune expired requests
        cls._api_requests[user_or_ip] = [
            t for t in cls._api_requests[user_or_ip] if t > cutoff
        ]

        count = len(cls._api_requests[user_or_ip])
        if count >= effective_limit:
            oldest_req = cls._api_requests[user_or_ip][0]
            retry_after = max(1, int(oldest_req + API_RATE_LIMIT_WINDOW_SECONDS - current_time))
            return False, 0, retry_after

        cls._api_requests[user_or_ip].append(current_time)
        remaining = max(0, effective_limit - len(cls._api_requests[user_or_ip]))
        return True, remaining, 0

    @classmethod
    def check_call_rate_limit(
        cls,
        phone_number: str,
        user_id: Optional[str] = None,
        now: Optional[float] = None
    ) -> Tuple[bool, int, int]:
        """
        Enforces: 5 calls per minute per number by default.
        Supports call center workload override configured by admin.
        Returns: (allowed: bool, remaining_calls: int, retry_after_seconds: int)
        """
        current_time = now if now is not None else time.time()
        cutoff = current_time - CALLS_RATE_LIMIT_WINDOW_SECONDS

        effective_limit = DEFAULT_CALLS_CPM
        if user_id and user_id in cls._user_call_overrides:
            effective_limit = cls._user_call_overrides[user_id]

        cls._call_requests[phone_number] = [
            t for t in cls._call_requests[phone_number] if t > cutoff
        ]

        count = len(cls._call_requests[phone_number])
        if count >= effective_limit:
            oldest_call = cls._call_requests[phone_number][0]
            retry_after = max(1, int(oldest_call + CALLS_RATE_LIMIT_WINDOW_SECONDS - current_time))
            return False, 0, retry_after

        cls._call_requests[phone_number].append(current_time)
        remaining = max(0, effective_limit - len(cls._call_requests[phone_number]))
        return True, remaining, 0

    @classmethod
    def set_user_override(
        cls,
        user_id: str,
        api_rpm: Optional[int] = None,
        calls_cpm: Optional[int] = None
    ) -> Dict[str, Any]:
        """Admin helper to configure higher capacity for call center workloads."""
        if api_rpm is not None:
            cls._user_api_overrides[user_id] = max(1, api_rpm)
        if calls_cpm is not None:
            cls._user_call_overrides[user_id] = max(1, calls_cpm)

        return {
            "user_id": user_id,
            "api_rpm": cls._user_api_overrides.get(user_id, DEFAULT_API_RPM),
            "calls_cpm": cls._user_call_overrides.get(user_id, DEFAULT_CALLS_CPM),
        }

    @classmethod
    def reset_state_for_testing(cls) -> None:
        """Resets in-memory rate limiting state between test runs."""
        cls._login_attempts.clear()
        cls._api_requests.clear()
        cls._call_requests.clear()
        cls._user_api_overrides.clear()
        cls._user_call_overrides.clear()
