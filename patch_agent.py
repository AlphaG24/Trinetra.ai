import sys

with open('backend/agent.py', 'r', encoding='utf-8') as f:
    content = f.read()

usage_func = '''
async def update_usage_and_check_limits(user_id: str, duration_seconds: int, agent_id: str):
    import math
    minutes_used = math.ceil(duration_seconds / 60)
    if minutes_used <= 0:
        return
        
    try:
        # Fetch current profile
        prof_res = await asyncio.to_thread(
            supabase_admin.table("profiles").select("*").eq("id", user_id).execute
        )
        if not prof_res.data: return
        profile = prof_res.data[0]
        
        plan_tier = profile.get("plan_tier", "free")
        is_free = plan_tier in ("free", "free_demo")
        
        limit = profile.get("demo_minutes_limit", 10) if is_free else profile.get("paid_minutes_limit", 100)
        current_used = profile.get("demo_minutes_used", 0) if is_free else profile.get("paid_minutes_used", 0)
        
        new_used = current_used + minutes_used
        
        # Update profile
        update_data = {}
        if is_free:
            update_data["demo_minutes_used"] = new_used
        else:
            update_data["paid_minutes_used"] = new_used
            
        await asyncio.to_thread(
            supabase_admin.table("profiles").update(update_data).eq("id", user_id).execute
        )
        
        # Check percentage
        percentage = (new_used / limit) * 100 if limit > 0 else 0
        
        telegram_chat_id = profile.get("telegram_chat_id")
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        
        async def send_tg(msg):
            if not telegram_chat_id or not bot_token: return
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": telegram_chat_id, "text": msg}
                )

        if percentage >= 100 and (limit == 0 or (current_used / limit) * 100 < 100):
            # Reached 100% just now
            await asyncio.to_thread(
                supabase_admin.table("agents").update({"status": "paused"}).eq("user_id", user_id).execute
            )
            await send_tg(f"?? Monthly limit reached ({new_used}/{limit} mins). Your agents are paused. Upgrade to continue.")
        elif percentage >= 80 and (limit == 0 or (current_used / limit) * 100 < 80):
            # Reached 80% just now
            await send_tg(f"?? You've used {int(percentage)}% of your monthly minutes ({new_used}/{limit} mins). Consider upgrading soon.")
            
    except Exception as e:
        logger.error(f"Failed to update usage limits: {e}")

'''

if "def update_usage_and_check_limits" not in content:
    # Insert before generate_agent_token
    content = content.replace("def generate_agent_token", usage_func + "def generate_agent_token")

# Add the call in extract_and_save_lead
call_stmt = "        await update_usage_and_check_limits(user_id, duration_seconds, agent_id)\n"
if "await update_usage_and_check_limits" not in content:
    # Find the end of extract_and_save_lead
    # it ends with: 
    #             except Exception as e:
    #                 logger.error(f"Failed to save lead: {e}")
    target = 'logger.error(f"Failed to save lead: {e}")'
    content = content.replace(target, target + "\n\n" + call_stmt)

with open('backend/agent.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched agent.py')
