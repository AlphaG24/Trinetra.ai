import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Force Python to look for Next.js's default env file
load_dotenv(".env.local") 

# Fallback to standard .env if .env.local isn't found
if not os.getenv("NEXT_PUBLIC_SUPABASE_URL"):
    load_dotenv(".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") 
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)