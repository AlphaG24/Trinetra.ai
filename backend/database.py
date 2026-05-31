import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables locally from backend directory
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") 
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
