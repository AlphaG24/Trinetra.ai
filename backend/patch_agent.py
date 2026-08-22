import sys
import re

with open("agent.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add imports
if "import httpx" not in code:
    code = code.replace("import os", "import os\nimport httpx\nimport json\nimport time")

# 2. Add extract_and_save_lead and save_voice_call before entrypoint
helpers = """
async def extract_and_save_lead(transcript: str, agent_id: str, user_id: str, organization_id: str):
    \"\"\"Extract lead information from call transcript and save to leads table\"\"\"
    if not transcript or not transcript.strip():
        return
    
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return
    
    prompt = f\"\"\"Analyze this sales call transcript and extract lead information.
    
Transcript: {transcript[:3000]}

Return a JSON object with:
- is_lead: true if the caller showed interest, asked about pricing, or wants follow-up. false otherwise.
- contact_name: the caller's name if mentioned
- contact_phone: the caller's phone if mentioned
- contact_email: the caller's email if mentioned
- company: the caller's company if mentioned
- interest_level: "low", "medium", "high", or "hot"
- budget_range: any budget mentioned
- timeline: when they want to buy (immediate, 1_month, 3_months, exploring)
- call_summary: 2-sentence summary of the conversation
- extracted_data: object with any other useful fields (pain_points, product_interest, competitor_mentioned, etc.)
- sentiment: "positive", "neutral", or "negative"

Only return valid JSON. No other text.\"\"\"

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 500,
                "response_format": {"type": "json_object"}
            }
        )
        
        if res.status_code != 200:
            return
        
        data = res.json()
        content = data["choices"][0]["message"]["content"]
        
        try:
            lead_data = json.loads(content)
        except json.JSONDecodeError:
            return

        # 1. Update voice_calls with transcript and sentiment
        try:
            supabase_admin.table("voice_calls").insert({
                "user_id": user_id,
                "agent_id": agent_id,
                "organization_id": organization_id,
                "transcript": transcript,
                "sentiment": lead_data.get("sentiment", "neutral"),
                "status": "completed"
            }).execute()
        except Exception as e:
            logger.error(f"Failed to save voice call: {e}")
        
        # 2. Insert into leads
        if lead_data.get("is_lead"):
            try:
                interest_level_val = str(lead_data.get("interest_level", "medium")).lower()
                initial_stage = (
                    "hot" if interest_level_val == "hot"
                    else "qualified" if interest_level_val == "high"
                    else "new"
                )

                supabase_admin.table("leads").insert({
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "agent_id": agent_id,
                    "full_name": lead_data.get("contact_name", "Unknown"),
                    "phone": lead_data.get("contact_phone"),
                    "email": lead_data.get("contact_email"),
                    "company_name": lead_data.get("company"),
                    "interest_level": lead_data.get("interest_level", "medium"),
                    "budget_range": lead_data.get("budget_range"),
                    "timeline": lead_data.get("timeline"),
                    "call_summary": lead_data.get("call_summary"),
                    "extracted_data": lead_data.get("extracted_data", {}),
                    "status": initial_stage,
                    "stage": initial_stage,
                    "source": "voice_call"
                }).execute()
            except Exception as e:
                logger.error(f"Failed to save lead: {e}")

"""
if "def extract_and_save_lead" not in code:
    code = code.replace("async def entrypoint(ctx: JobContext):", helpers + "\nasync def entrypoint(ctx: JobContext):")

# 3. Modify entrypoint to fetch organization_id and handle disconnect
old_fetch = 'res = supabase_admin.table("agents").select("*, user_id").eq("id", agent_id).execute()'
new_fetch = 'res = supabase_admin.table("agents").select("*, user_id, organization_id").eq("id", agent_id).execute()'
code = code.replace(old_fetch, new_fetch)

old_user_id = 'user_id = agent_data.get("user_id")'
new_user_id = 'user_id = agent_data.get("user_id")\n                organization_id = agent_data.get("organization_id")'
code = code.replace(old_user_id, new_user_id)

old_agent_id_decl = 'agent_id = ctx.job.metadata if ctx.job else None'
new_agent_id_decl = 'agent_id = ctx.job.metadata if ctx.job else None\n    user_id = None\n    organization_id = None'
code = code.replace(old_agent_id_decl, new_agent_id_decl)

disconnect_logic = """
    call_start_time = time.time()
    
    @ctx.room.on("disconnected")
    def on_disconnected():
        try:
            if not agent_id or not user_id:
                return
            duration = int(time.time() - call_start_time)
            
            # Extract transcript from the chat context (assuming livekit agent context)
            if hasattr(agent_instance, 'chat_ctx'):
                messages = agent_instance.chat_ctx.messages
                transcript = "\\n".join([f"{m.role}: {m.content}" for m in messages if m.role in ("user", "assistant")])
            else:
                transcript = ""
            
            if transcript:
                asyncio.create_task(extract_and_save_lead(transcript, agent_id, user_id, organization_id))
        except Exception as e:
            logger.error(f"Error processing disconnected event: {e}")

    await session.start(agent=agent_instance, room=ctx.room)
"""
if "@ctx.room.on(\"disconnected\")" not in code:
    code = code.replace("await session.start(agent=agent_instance, room=ctx.room)", disconnect_logic)

with open("agent.py", "w", encoding="utf-8") as f:
    f.write(code)
print("agent.py patched successfully")
