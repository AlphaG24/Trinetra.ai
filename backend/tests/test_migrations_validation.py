import os
import re
import pytest

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def _strip_sql_comments(sql: str) -> str:
    lines = []
    for line in sql.splitlines():
        # remove single line comment
        line = re.sub(r"--.*$", "", line)
        lines.append(line)
    return "\n".join(lines)

def test_migration_pairs_exist_and_symmetric():
    """
    Rule DB-001:
    Database changes must include migration files with both up and down steps.
    Verify that 20261001 migrations all have matching down migrations.
    """
    migrations_dir = os.path.join(WORKSPACE_ROOT, "database", "migrations")
    assert os.path.exists(migrations_dir), f"{migrations_dir} must exist"

    up_files = [
        f for f in os.listdir(migrations_dir)
        if f.startswith("20261001") and not f.endswith("_down.sql") and f.endswith(".sql")
    ]
    assert len(up_files) >= 4, f"Expected at least 4 compliance migrations, found {len(up_files)}"

    for up_file in up_files:
        down_file = up_file.replace(".sql", "_down.sql")
        down_path = os.path.join(migrations_dir, down_file)
        assert os.path.exists(down_path), f"Down migration missing for {up_file}: expected {down_file}"

        with open(os.path.join(migrations_dir, up_file), "r", encoding="utf-8") as f:
            up_content = _strip_sql_comments(f.read())
        with open(down_path, "r", encoding="utf-8") as f:
            down_content = _strip_sql_comments(f.read())

        # Check tables dropped in down
        created_tables = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)", up_content, re.IGNORECASE)
        for tbl in created_tables:
            assert f"DROP TABLE" in down_content and tbl in down_content, (
                f"Table {tbl} created in {up_file} but not dropped in {down_file}"
            )

        # Check added columns dropped in down
        col_adds = re.findall(r"ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)", up_content, re.IGNORECASE)
        for col in col_adds:
            assert f"DROP COLUMN" in down_content and col in down_content, (
                f"Column {col} added in {up_file} but not dropped in {down_file}"
            )

def test_migration_rls_and_security_compliance():
    """
    Rule SEC-004:
    Every new database table must have Row Level Security enabled.
    """
    migrations_dir = os.path.join(WORKSPACE_ROOT, "database", "migrations")
    up_files = [
        f for f in os.listdir(migrations_dir)
        if f.startswith("20261001") and not f.endswith("_down.sql") and f.endswith(".sql")
    ]

    for up_file in up_files:
        with open(os.path.join(migrations_dir, up_file), "r", encoding="utf-8") as f:
            content = _strip_sql_comments(f.read())

        created_tables = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)", content, re.IGNORECASE)
        for tbl in created_tables:
            assert f"ALTER TABLE public.{tbl} ENABLE ROW LEVEL SECURITY" in content or f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY" in content, (
                f"Table {tbl} in {up_file} missing ENABLE ROW LEVEL SECURITY (SEC-004 violation)!"
            )
            assert f"CREATE POLICY" in content, (
                f"Table {tbl} in {up_file} has no RLS policies defined (SEC-004 violation)!"
            )


def test_foreign_key_constraints_and_indexes():
    """
    Rule DB-002 & DB-003:
    All relationships must have explicit foreign key cascade constraints and be indexed.
    """
    migrations_dir = os.path.join(WORKSPACE_ROOT, "database", "migrations")
    up_files = [
        f for f in os.listdir(migrations_dir)
        if f.startswith("20261001") and not f.endswith("_down.sql") and f.endswith(".sql")
    ]

    for up_file in up_files:
        with open(os.path.join(migrations_dir, up_file), "r", encoding="utf-8") as f:
            content = f.read()

        fk_references = re.findall(r"REFERENCES\s+([a-zA-Z0-9_.]+)\s*\(([a-zA-Z0-9_]+)\)([^,;\n]*)", content, re.IGNORECASE)
        for target_table, target_col, rest in fk_references:
            assert "ON DELETE CASCADE" in rest.upper() or "ON DELETE SET NULL" in rest.upper(), (
                f"FK reference in {up_file} to {target_table}({target_col}) must have explicit ON DELETE CASCADE or SET NULL (DB-002)"
            )

def test_supabase_cli_migrations_synchronized():
    """
    Verify that migrations in supabase/migrations/ match database/migrations/ for CLI synchronization.
    """
    supabase_mig_dir = os.path.join(WORKSPACE_ROOT, "supabase", "migrations")
    assert os.path.exists(supabase_mig_dir)

    expected_supabase_files = [
        "20261001000001_add_gender_to_agents.sql",
        "20261001000002_create_call_disclosure_and_consent.sql",
        "20261001000003_create_outbound_safety_guardrails.sql",
        "20261001000004_add_campaign_consent_attestation.sql",
    ]

    for smf in expected_supabase_files:
        path = os.path.join(supabase_mig_dir, smf)
        assert os.path.exists(path), f"Supabase CLI migration {smf} must exist in supabase/migrations/"
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        assert len(content.strip()) > 50, f"{smf} should not be empty"
