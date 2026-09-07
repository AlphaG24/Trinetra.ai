import os
import logging
import socket
import httpx
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

# Ensure IPv4 resolution to prevent NAT64 / IPv6 socket timeouts
_orig_getaddrinfo = socket.getaddrinfo
def _getaddrinfo_ipv4_first(host, port, family=0, type=0, proto=0, flags=0):
    if family == 0:
        family = socket.AF_INET
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _getaddrinfo_ipv4_first

# Load environment variables locally from backend directory
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") 
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def _create_supabase_options():
    return ClientOptions(
        postgrest_client_timeout=10,
        storage_client_timeout=10
    )

# Create standard client using the public Anon Key
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY, options=_create_supabase_options())

# Create admin client using the private Service Role Key to bypass RLS securely
if not SUPABASE_SERVICE_ROLE_KEY:
    logging.warning("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables! Falling back to standard Anon Client.")
    supabase_admin: Client = supabase
else:
    supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, options=_create_supabase_options())

