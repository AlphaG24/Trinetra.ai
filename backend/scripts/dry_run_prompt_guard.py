import sys
import os
import json
import re

# Ensure backend directory is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "trinetra-fresh", "backend"))
from app.services.ai.prompt_guard import validate_prompt_ai_transparency, sanitize_prompt_deception

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", "trinetra-fresh", "frontend", ".env.local"))

from supabase import create_client

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in env.")
    sys.exit(1)

supabase = create_client(url, key)

def run_dry_run():
    res = supabase.table("agents").select("id, name, personality, greeting_message, fallback_message, ending_message, config").execute()
    agents = res.data or []
    print(f"\n========================================================")
    print(f"PROMPT GUARD DRY-RUN AUDIT: {len(agents)} STORED AGENTS")
    print(f"========================================================\n")

    flagged = []
    clean_count = 0

    for a in agents:
        agent_id = a.get("id")
        agent_name = a.get("name") or "Unnamed Agent"
        config = a.get("config") or {}

        fields = [
            ("greeting_message", a.get("greeting_message") or ""),
            ("fallback_message", a.get("fallback_message") or ""),
            ("ending_message", a.get("ending_message") or ""),
            ("personality", a.get("personality") or ""),
            ("config.system_prompt", config.get("system_prompt") or ""),
            ("config.prompt", config.get("prompt") or "")
        ]

        agent_violations = []
        for field_name, text in fields:
            if not text:
                continue
            is_valid, matches = validate_prompt_ai_transparency(text)
            if not is_valid:
                cleaned, removed = sanitize_prompt_deception(text)
                agent_violations.append({
                    "field": field_name,
                    "violations": matches,
                    "original_snippet": text[:120],
                    "sanitized_snippet": cleaned[:120]
                })

        if agent_violations:
            flagged.append({
                "agent_id": agent_id,
                "agent_name": agent_name,
                "violations": agent_violations
            })
        else:
            clean_count += 1

    print(f"Dry-run Scan Completed:")
    print(f"- Total Agents Scanned: {len(agents)}")
    print(f"- Clean Agents (Compliant): {clean_count}")
    print(f"- Flagged Agents (Requiring Sanitization): {len(flagged)}")

    if flagged:
        print("\nFlagged Details:")
        for item in flagged:
            print(f"\nAgent [{item['agent_name']}] (ID: {item['agent_id']}):")
            for v in item["violations"]:
                print(f"  Field: {v['field']}")
                print(f"  Matches: {v['violations']}")
                print(f"  Original: {v['original_snippet']}")
                print(f"  Proposed Sanitized: {v['sanitized_snippet']}")
    else:
        print("\nAll stored agent prompts in the database are 100% compliant with AI truthfulness standards! (0 deceptive directives found)")

if __name__ == "__main__":
    run_dry_run()
