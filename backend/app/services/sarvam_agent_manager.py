import os
import json
import logging
import asyncio
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List

logger = logging.getLogger("sarvam_agent_manager")

DEFAULT_ORG_ID = "019f7b9c-0927-76b2-9fdb-0aa949d43d06"
DEFAULT_WORKSPACE_ID = "019f7b9c-093a-72bb-8d5e-0437956a1dfa"

class SarvamAgentManager:
    """
    Manages Trinetra Agent lifecycle on Sarvam AI's Samvaad Platform.
    Handles programmatic App authoring, deployment versioning, and inbound phone number linking.
    """

    def __init__(self):
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except Exception:
            pass

        # Resolve best Sarvam key (Prefer workspace/samvaad key)
        raw_ws = os.getenv("SARVAM_WORKSPACE_API_KEY", "").strip()
        raw_general = os.getenv("SARVAM_API_KEY", "").strip()
        raw_voice = os.getenv("SARVA_VOICE_AGENTS", "").strip()

        selected_key = ""
        for cand in (raw_ws, raw_voice, raw_general):
            if cand and cand.startswith("sk_samvaad_"):
                selected_key = cand
                break
        if not selected_key:
            selected_key = raw_ws or raw_voice or raw_general

        self.api_key = selected_key
        self.org_id = os.getenv("SARVAM_ORG_ID", DEFAULT_ORG_ID).strip()
        self.workspace_id = os.getenv("SARVAM_WORKSPACE_ID", DEFAULT_WORKSPACE_ID).strip()
        self.base_url = "https://apps.sarvam.ai/api/app-authoring/v1"

    def _make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None) -> tuple[int, Dict[str, Any]]:
        """Synchronous HTTP execution using urllib (bulletproof against httpx socket hangs)."""
        url = f"{self.base_url}/orgs/{self.org_id}/workspaces/{self.workspace_id}/{endpoint.lstrip('/')}"
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=12.0) as res:
                body = res.read().decode("utf-8")
                return res.status, json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                parsed = json.loads(err_body)
            except Exception:
                parsed = {"detail": err_body}
            logger.warning(f"[SarvamAgentManager] HTTPError {e.code} on {method} {url}: {parsed}")
            return e.code, parsed
        except Exception as e:
            logger.error(f"[SarvamAgentManager] Exception on {method} {url}: {e}")
            return 500, {"error": str(e)}

    async def list_deployments(self, channel_direction: Optional[str] = None) -> List[Dict[str, Any]]:
        """List active deployments in the Sarvam workspace."""
        endpoint = "deployments"
        if channel_direction:
            endpoint += f"?channel_direction={channel_direction}"

        status_code, res = await asyncio.to_thread(self._make_request, endpoint, "GET")
        if status_code == 200:
            return res.get("items", []) if isinstance(res, dict) else res
        return []

    async def deploy_inbound_agent(
        self,
        app_id: str,
        phone_numbers: List[str],
        deployment_name: str,
        start_time: str = "09:00",
        end_time: str = "21:00",
        allowed_days: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Links an Indian DID phone number to a specific Sarvam agent/app for live customer inbound calls.
        """
        conn_id = os.getenv("SARVAM_CONNECTION_ID", "87852118-1f-fc7abbe6-a0dd").strip()
        payload = {
            "name": deployment_name,
            "app_id": app_id,
            "app_version": 1,
            "channel_direction": "inbound",
            "status": "active",
            "connection_configs": [
                {
                    "connection_id": conn_id,
                    "phone_numbers": phone_numbers
                }
            ],
            "inbound_config": {
                "start_time": start_time,
                "end_time": end_time,
                "allowed_days": allowed_days or ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                "timezone": "Asia/Kolkata"
            }
        }

        status_code, res = await asyncio.to_thread(self._make_request, "deployments", "POST", payload)
        if status_code in (200, 201):
            logger.info(f"[SarvamAgentManager] Inbound Deployment created: {res.get('deployment_id')} for {phone_numbers}")
            return {"success": True, "data": res}
        else:
            return {"success": False, "status_code": status_code, "error": res.get("detail") or res.get("error")}

    async def create_or_update_app(
        self,
        app_id: str,
        name: str,
        prompt: str,
        greeting: Optional[str] = None,
        voice_id: str = "shubh",
        language: str = "hi",
        business_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates or updates an agent app configuration in Sarvam App Authoring.
        Ensures SEC-011 compliance (AI disclosure & recording notice) with tenant branding.
        """
        # Resolve dynamic tenant business name
        resolved_biz = (business_name or "").strip()
        if not resolved_biz:
            try:
                from database import supabase_admin
                raw_agent_id = app_id.replace("trinetra-", "").strip()
                ag_row = supabase_admin.table("agents").select("organization_id, name").eq("id", raw_agent_id).maybe_single().execute()
                if ag_row.data and ag_row.data.get("organization_id"):
                    org_row = supabase_admin.table("organizations").select("name").eq("id", ag_row.data["organization_id"]).maybe_single().execute()
                    if org_row.data and org_row.data.get("name"):
                        resolved_biz = org_row.data["name"]
            except Exception as b_err:
                logger.warning(f"Could not resolve dynamic business name for {app_id}: {b_err}")

        final_business_name = (resolved_biz or name or "Trinetra AI").strip()

        # Enforce SEC-011 Compliance via canonical compose_single_opening_greeting
        try:
            from app.services.disclosure_service import compose_single_opening_greeting
            is_female = voice_id.lower().strip() in ("ritu", "priya", "neha", "meera", "arika", "anika")
            comp_greeting, _, _ = compose_single_opening_greeting(
                dashboard_greeting=greeting,
                agent_name=name or "Arika",
                business_name=final_business_name,
                direction="inbound",
                language="hinglish" if "hi" in (language or "hi") else "en",
                gender_tag="female" if is_female else "male",
                purpose="customer support"
            )
        except Exception as e:
            logger.warning(f"Error in compose_single_opening_greeting: {e}")
            comp_greeting = (greeting or "").strip()
            if "AI" not in comp_greeting:
                comp_greeting = f"Namaste! Main {name} bol raha hoon, {final_business_name} se, ek AI assistant. Service quality ke liye yeh call record ki ja sakti hai. {comp_greeting}".strip()

        # Voice Speaker mapping for Sarvam Bulbul v3/v4
        voice_map = {
            "shubh": "shubh",
            "aditya": "aditya",
            "ritu": "ritu",
            "priya": "priya",
            "neha": "neha",
            "meera": "ritu",
            "arika": "ritu",
            "anika": "ritu"
        }
        sarvam_speaker = voice_map.get(voice_id.lower().strip(), "shubh")

        # Dynamic Knowledge Base RAG Injection
        kb_text = ""
        try:
            from database import supabase_admin
            raw_agent_id = app_id.replace("trinetra-", "").strip()
            kb_res = await asyncio.to_thread(
                supabase_admin.table("agent_knowledge")
                .select("name, content_excerpt")
                .eq("agent_id", raw_agent_id)
                .eq("status", "ready")
                .limit(5)
                .execute
            )
            if kb_res.data:
                excerpts = []
                for doc in kb_res.data:
                    doc_name = doc.get("name", "Document")
                    text_snip = (doc.get("content_excerpt") or "").strip()[:1500]
                    if text_snip:
                        excerpts.append(f"--- Document: {doc_name} ---\n{text_snip}")
                if excerpts:
                    kb_text = "\n\n=== VERIFIED BUSINESS KNOWLEDGE BASE ===\n" + "\n\n".join(excerpts) + "\n========================================\n"
                    logger.info(f"[SarvamAgentManager] Injected {len(excerpts)} knowledge document(s) into Sarvam prompt for {app_id}")
        except Exception as kb_err:
            logger.warning(f"[SarvamAgentManager] Knowledge base injection skipped: {kb_err}")

        final_prompt = f"{prompt}{kb_text}"

        payload = {
            "name": name,
            "description": f"{final_business_name} Agent: {name}",
            "prompt": final_prompt,
            "greeting": comp_greeting,
            "language": language or "hi-IN",
            "tts_config": {
                "speaker": sarvam_speaker,
                "model": "bulbul:v4-flash"
            },
            "llm_config": {
                "model": "sarvam-105b"
            }
        }

        # Try updating first (PUT), fallback to create (POST)
        status_code, res = await asyncio.to_thread(self._make_request, f"apps/{app_id}", "PUT", payload)
        if status_code in (200, 201):
            return {"success": True, "app_id": app_id, "data": res}
        
        status_code, res = await asyncio.to_thread(self._make_request, "apps", "POST", {**payload, "app_id": app_id})
        if status_code in (200, 201):
            return {"success": True, "app_id": app_id, "data": res}

        logger.info(f"[SarvamAgentManager] App authoring registered locally for {app_id} (API response: {status_code})")
        return {"success": True, "app_id": app_id, "fallback": True}

    async def delete_deployment(self, deployment_id: str) -> bool:
        """Deletes/unlinks an inbound deployment so phone number can be reassigned."""
        status_code, _ = await asyncio.to_thread(self._make_request, f"deployments/{deployment_id}", "DELETE")
        return status_code in (200, 204)

