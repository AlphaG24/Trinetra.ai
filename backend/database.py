import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables locally from backend directory
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") 
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Create standard client using the public Anon Key
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Create admin client using the private Service Role Key to bypass RLS securely
if not SUPABASE_SERVICE_ROLE_KEY:
    logging.warning("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables! Falling back to standard Anon Client.")
    supabase_admin: Client = supabase
else:
    supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
