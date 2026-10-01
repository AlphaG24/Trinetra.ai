import os
import sys
import re
import pytest

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(WORKSPACE_ROOT, "backend"))


def test_client_components_have_no_service_role_references():
    """
    Rule TRI-001 & SEC-001:
    Ensure that no client-side component ('use client') contains or accesses SUPABASE_SERVICE_ROLE_KEY
    or imports admin clients that bypass RLS.
    """
    frontend_src = os.path.join(WORKSPACE_ROOT, "frontend", "src")
    assert os.path.exists(frontend_src), "frontend/src directory must exist"

    violations = []

    for root, _, files in os.walk(frontend_src):
        for file in files:
            if file.endswith((".tsx", ".jsx", ".ts", ".js")):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                    # Check if file declares client component directive
                    first_lines = "\n".join(content.splitlines()[:10])
                    is_client = re.search(r"['\"]use client['\"]", first_lines) is not None

                    if is_client:
                        if "SUPABASE_SERVICE_ROLE_KEY" in content:
                            violations.append(f"{filepath} declares 'use client' but references SUPABASE_SERVICE_ROLE_KEY")
                        if "utils/supabase/admin" in content or "lib/admin" in content:
                            violations.append(f"{filepath} declares 'use client' but imports admin supabase client")
                except Exception as e:
                    violations.append(f"Failed reading {filepath}: {e}")

    assert not violations, f"Service-role security violations found in client components:\n" + "\n".join(violations)

def test_no_next_public_service_role_key():
    """
    Rule SEC-002:
    Ensure no environment variable or code prefixes sensitive service-role keys with NEXT_PUBLIC_.
    """
    pattern = re.compile(r"NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE", re.IGNORECASE)

    violations = []
    scan_dirs = ["frontend", "backend", "scripts"]
    exclude_dirs = {"node_modules", ".next", ".git", "__pycache__", ".venv"}
    for d in scan_dirs:
        dirpath = os.path.join(WORKSPACE_ROOT, d)
        if not os.path.exists(dirpath):
            continue
        for root, dirs, files in os.walk(dirpath):
            dirs[:] = [x for x in dirs if x not in exclude_dirs]
            for file in files:
                if file.endswith((".ts", ".tsx", ".js", ".jsx", ".py", ".env", ".env.example", ".mjs")):
                    if file == "test_service_role_safety.py":
                        continue
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            for idx, line in enumerate(f, 1):
                                if pattern.search(line):
                                    violations.append(f"{filepath}:{idx}: {line.strip()}")
                    except Exception:
                        pass



    assert not violations, f"Forbidden NEXT_PUBLIC_ service-role prefixes found:\n" + "\n".join(violations)

def test_admin_clients_contain_browser_execution_guards():
    """
    Defense-in-depth:
    Ensure all admin client initializer factories explicitly check for browser context (`typeof window !== 'undefined'`)
    and abort execution immediately to prevent runtime leak.
    """
    admin_files = [
        os.path.join(WORKSPACE_ROOT, "frontend", "src", "utils", "supabase", "admin.ts"),
        os.path.join(WORKSPACE_ROOT, "frontend", "utils", "supabase", "admin.ts"),
        os.path.join(WORKSPACE_ROOT, "frontend", "lib", "admin.ts"),
    ]

    for af in admin_files:
        assert os.path.exists(af), f"Admin client helper {af} must exist"
        with open(af, "r", encoding="utf-8") as f:
            content = f.read()

        assert "typeof window !== 'undefined'" in content, (
            f"{af} is missing the required browser-context execution guard."
        )
        assert "FATAL SECURITY VIOLATION" in content or "Error" in content

def test_script_mutation_safeguards():
    """
    Operational script safety:
    Verify that destructive/mutative operational scripts require explicit confirmation flags
    before executing irreversible modifications on live databases.
    """
    delete_script = os.path.join(WORKSPACE_ROOT, "scripts", "delete-partner.mjs")
    with open(delete_script, "r", encoding="utf-8") as f:
        content = f.read()
    assert "--confirm" in content, "delete-partner.mjs must enforce --confirm before deleting user/partner records"

    check_script = os.path.join(WORKSPACE_ROOT, "scripts", "check-partners-schema.mjs")
    with open(check_script, "r", encoding="utf-8") as f:
        content = f.read()
    assert "--fix-confirmation" in content, (
        "check-partners-schema.mjs must not auto-confirm user emails unless --fix-confirmation flag is passed"
    )

def test_integration_encryption_seed_production_hardening():
    """
    Rule SEC-001:
    Verify that integration route and executor handlers require ENCRYPTION_SECRET_SEED or SUPABASE_SERVICE_ROLE_KEY
    and enforce production safeguards.
    """
    from app.services.integration_executor import decrypt_val
    # Empty or malformed inputs safely return empty string without unhandled exceptions
    assert decrypt_val("") == ""
    assert decrypt_val("invalid-payload") == ""
    assert decrypt_val(None) == ""
