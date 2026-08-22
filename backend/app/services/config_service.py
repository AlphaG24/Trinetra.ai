import os
from database import supabase_admin

class ConfigService:
    @staticmethod
    def get(key: str, default=None) -> str:
        """Get a single config value (synchronous wrapper)."""
        try:
            res = supabase_admin.table("system_config").select("config_value").eq("config_key", key).single().execute()
            if res.data and res.data.get("config_value") is not None:
                val = res.data["config_value"].strip()
                if val:
                    return val
        except Exception:
            pass
        # Fallback to environment variables
        env_val = os.getenv(key)
        if env_val is not None:
            return env_val
        return str(default) if default is not None else ""

    @staticmethod
    def get_all() -> dict:
        """Get all config as dict."""
        try:
            res = supabase_admin.table("system_config").select("config_key, config_value").execute()
            if res.data:
                return {item["config_key"]: item["config_value"] for item in res.data}
        except Exception:
            pass
        return {}

    @staticmethod
    def set(key: str, value: str, updated_by: str) -> dict | None:
        """Set a config value with audit logging."""
        # Fetch old value first for audit logging
        old_value = None
        try:
            old_res = supabase_admin.table("system_config").select("config_value").eq("config_key", key).single().execute()
            if old_res.data:
                old_value = old_res.data.get("config_value")
        except Exception:
            pass

        # Update system_config
        res = supabase_admin.table("system_config").upsert({
            "config_key": key,
            "config_value": str(value),
            "updated_by": updated_by,
            "updated_at": "now()"
        }, on_conflict="config_key").execute()

        # Insert audit_logs record
        try:
            supabase_admin.table("audit_logs").insert({
                "user_id": updated_by,
                "action": "admin.system_config_updated",
                "resource_type": "system_config",
                "new_values": {
                    "config_key": key,
                    "old_value": old_value,
                    "new_value": str(value)
                }
            }).execute()
        except Exception as audit_err:
            print(f"[AUDIT LOG ERROR] Failed to write config update to audit log: {audit_err}", flush=True)

        return res.data[0] if res.data else None

    @staticmethod
    def get_public_config() -> dict:
        """Get config safe for public exposure."""
        configs = ConfigService.get_all()
        public_keys = [
            "free_demo_minutes", "trial_price_paisa", "trial_days", 
            "trial_minutes", "starter_price_paisa", "starter_minutes", 
            "professional_price_paisa", "professional_minutes",
            "enterprise_price_paisa", "enterprise_minutes",
            "max_agents_free", "max_agents_starter", "max_agents_professional",
            "inbound_number_cost_paisa", "overage_per_minute_paisa"
        ]
        return {k: configs[k] for k in public_keys if k in configs}
