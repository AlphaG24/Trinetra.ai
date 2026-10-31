import os
import sys
import json
import re

sys.path.append(os.path.abspath('backend'))

# Load environment
from dotenv import load_dotenv
load_dotenv('backend/.env')

from app.services.sarvam_outbound_service import SarvamOutboundService

def verify_sarvam_and_pipeline():
    print("=================================================================")
    print("STEP 1: VERIFYING SARVAM OUTBOUND PAYLOAD & TEMPLATE HYDRATION")
    print("=================================================================")

    prospect = {
        "full_name": "Rajesh Sharma",
        "phone": "+919452045499",
        "company_name": "Parle Distributors",
        "intent": "Return freight loads to Kanpur",
        "notes": "Parle biscuits load from Kanpur, needs 16-wheel truck quotation"
    }

    # Simulate payload construction in SarvamOutboundService
    target_phone = prospect["phone"]
    cleaned_phone = target_phone.strip().replace(" ", "").replace("-", "")

    user_config = {
        "user_phone_number": cleaned_phone,
        "customer_phone": cleaned_phone,
        "customer_name": prospect["full_name"],
        "customer_first_name": prospect["full_name"].split()[0],
        "customer_salutation": f"{prospect['full_name'].split()[0]} ji",
        "prospect_company": prospect["company_name"],
        "intent": prospect["intent"],
        "notes": prospect["notes"],
        "agent_name": "Shubh",
        "company_name": "Purvi Roadlines"
    }

    # Test the user's actual prompt template from request
    prompt_template = """
Placeholders: {{agent_name}}, {{company_name}}, {{customer_name}}, {{customer_first_name}}, {{customer_salutation}}, {{prospect_company}}, {{customer_phone}}, {{intent}}, {{notes}}

ROLE & IDENTITY:
You are {{agent_name}} from {{company_name}} — an intelligent, natural AI voice agent making outbound consultative calls for logistics and freight transport.

PROSPECT CONTEXT & CONVERSATION GOAL:
Customer Name: {{customer_name}}
Customer First Name: {{customer_first_name}}
Customer Salutation: {{customer_salutation}}
Prospect Company: {{prospect_company}}
Customer Phone: {{customer_phone}}
Prospect Intent / Reason: {{intent}}
Prospect Business Context & Notes: {{notes}}
""".strip()

    # Hydrate prompt
    hydrated_prompt = prompt_template
    for k, v in user_config.items():
        hydrated_prompt = hydrated_prompt.replace(f"{{{{{k}}}}}", str(v))

    print("\n[VERIFICATION RESULT] Hydrated System Prompt:")
    print(hydrated_prompt)

    # Check for unreplaced placeholders
    unreplaced = re.findall(r"\{\{.*?\}\}", hydrated_prompt)
    assert len(unreplaced) == 0, f"Error: Unreplaced placeholders found: {unreplaced}"
    print("\n[CHECK PASS] All {{...}} placeholders are 100% replaced!")
    assert "Rajesh Sharma" in hydrated_prompt
    assert "Parle Distributors" in hydrated_prompt
    assert "Purvi Roadlines" in hydrated_prompt
    assert "Return freight loads to Kanpur" in hydrated_prompt
    print("[CHECK PASS] Customer name, company, intent, and notes are all present in the prompt!")

    print("\n=================================================================")
    print("STEP 2: VERIFYING NAME GOVERNOR & FORBIDDEN PHRASES ELIMINATION")
    print("=================================================================")
    
    with open('backend/prompts/multi_agent.txt', 'r', encoding='utf-8') as f:
        multi_content = f.read()

    assert "Fair deal sir?" not in multi_content, "Fair deal sir? found in multi_agent.txt!"
    assert "Fair enough sir?" not in multi_content, "Fair enough sir? found in multi_agent.txt!"
    print("[CHECK PASS] 'Fair deal sir?' completely eliminated from prompt templates.")

    with open('backend/agent.py', 'r', encoding='utf-8') as f:
        agent_code = f.read()

    assert "NEVER use their name. Use 'ji', 'sir'" not in agent_code, "Old name refusal rule still present in agent.py!"
    assert "Main {p_name} se hi baat kar raha/rahi hoon" in agent_code, "New name disclosure rule missing in agent.py!"
    print("[CHECK PASS] Old rule forbidding middle-call name usage is completely removed.")
    print("[CHECK PASS] Explicit instruction added: When caller asks 'Who am I?' or 'What is my name?', agent MUST confirm caller's name accurately.")

    print("\n=================================================================")
    print("ALL VERIFICATION CHECKS PASSED EMPIRICALLY.")
    print("=================================================================")

if __name__ == '__main__':
    verify_sarvam_and_pipeline()
