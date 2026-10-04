#!/usr/bin/env python3
"""
scripts/verify_frozen_files.py

CI and pre-commit verification script for Trinetra AI frozen compliance files.
Enforces Master Plan Section 18.5 (Authoritative Overrides).

Computes canonical SHA-256 hashes (normalizing CRLF to LF) for files listed in
docs/compliance/FROZEN_FILES_MANIFEST.json. Exits with non-zero status if any file
is modified, corrupted, or tampered with without authorization.
"""

import os
import sys
import json
import hashlib
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple


def get_repo_root() -> Path:
    """Resolve the absolute repository root path."""
    current = Path(__file__).resolve().parent
    if (current / ".." / "docs" / "compliance" / "FROZEN_FILES_MANIFEST.json").exists():
        return (current / "..").resolve()
    # Fallback to current working directory if inside repo
    if (Path.cwd() / "docs" / "compliance" / "FROZEN_FILES_MANIFEST.json").exists():
        return Path.cwd().resolve()
    raise FileNotFoundError("Could not resolve repository root containing docs/compliance/FROZEN_FILES_MANIFEST.json")


def compute_canonical_sha256(filepath: Path) -> str:
    """
    Compute canonical SHA-256 hash by normalizing all newline sequences to LF (b'\\n').
    Guarantees bit-for-bit hash equality across Windows CRLF and Linux/macOS LF checkouts.
    """
    if not filepath.exists():
        raise FileNotFoundError(f"Frozen file does not exist: {filepath}")
    
    with open(filepath, "rb") as f:
        content = f.read()
    
    normalized = content.replace(b"\r\n", b"\n")
    return hashlib.sha256(normalized).hexdigest()


def load_manifest(manifest_path: Path) -> Dict[str, Any]:
    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_manifest(manifest_path: Path, data: Dict[str, Any]) -> None:
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def verify_frozen_files(repo_root: Path, manifest: Dict[str, Any]) -> Tuple[List[str], List[Dict[str, str]]]:
    """Verify all files against the manifest. Returns (passed, failures)."""
    passed: List[str] = []
    failures: List[Dict[str, str]] = []

    for item in manifest.get("frozen_files", []):
        rel_path = item["path"]
        expected_hash = item["sha256"]
        full_path = repo_root / rel_path

        if not full_path.exists():
            failures.append({
                "path": rel_path,
                "error": "FILE_MISSING",
                "expected": expected_hash,
                "actual": "NONE"
            })
            continue

        actual_hash = compute_canonical_sha256(full_path)
        if actual_hash != expected_hash:
            failures.append({
                "path": rel_path,
                "error": "HASH_MISMATCH",
                "expected": expected_hash,
                "actual": actual_hash
            })
        else:
            passed.append(rel_path)

    return passed, failures


def main():
    parser = argparse.ArgumentParser(description="Verify integrity of Trinetra AI frozen compliance files.")
    parser.add_argument("--update", action="store_true", help="Recalculate and update the frozen manifest (Owner only).")
    parser.add_argument("--emergency-fix-reason", type=str, default="", help="Documented reason for temporary emergency fix bypass.")
    args = parser.parse_args()

    repo_root = get_repo_root()
    manifest_path = repo_root / "docs" / "compliance" / "FROZEN_FILES_MANIFEST.json"

    if not manifest_path.exists():
        print(f"CRITICAL ERROR: Manifest file not found at {manifest_path}", file=sys.stderr)
        sys.exit(1)

    manifest = load_manifest(manifest_path)

    # 1. Update mode (authorized hash refresh)
    if args.update:
        print("[FrozenFilesCI] Updating frozen files manifest with canonical SHA-256 hashes...")
        for item in manifest.get("frozen_files", []):
            full_path = repo_root / item["path"]
            new_hash = compute_canonical_sha256(full_path)
            item["sha256"] = new_hash
            print(f"  -> {item['path']}: {new_hash}")
        save_manifest(manifest_path, manifest)
        print("[FrozenFilesCI] Manifest updated successfully.")
        sys.exit(0)

    # 2. Verification mode
    passed, failures = verify_frozen_files(repo_root, manifest)

    if not failures:
        print("==================================================================")
        print(" TRINETRA AI - FROZEN COMPLIANCE FILES INTEGRITY CHECK: PASSED")
        print("==================================================================")
        for p in passed:
            print(f" [PASS] {p}")
        print("==================================================================")
        sys.exit(0)

    # 3. Check for emergency bypass authorization
    emergency_env = os.getenv("ALLOW_FROZEN_FILE_MODIFICATION", "").strip().lower() in ("true", "1", "yes")
    has_emergency_reason = bool(args.emergency_fix_reason.strip())

    if emergency_env or has_emergency_reason:
        reason = args.emergency_fix_reason or os.getenv("EMERGENCY_FIX_REASON", "Unspecified emergency")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", file=sys.stderr)
        print(" [WARNING] EMERGENCY BYPASS ACTIVE FOR FROZEN COMPLIANCE FILES", file=sys.stderr)
        print(f" Reason: {reason}", file=sys.stderr)
        print(" The build is permitted to proceed, but this event must be signed off.", file=sys.stderr)
        print(" Manifest must be updated via --update before final production merge.", file=sys.stderr)
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", file=sys.stderr)
        sys.exit(0)

    # 4. Report failures
    print("==================================================================", file=sys.stderr)
    print(" [FAIL] FROZEN COMPLIANCE FILES INTEGRITY VIOLATION", file=sys.stderr)
    print(" Under Master Plan Section 18.5, validated compliance modules are FROZEN.", file=sys.stderr)
    print(" Any uncommitted or unauthorized edit triggers CI build failure.", file=sys.stderr)
    print("==================================================================", file=sys.stderr)
    for f in failures:
        print(f" VIOLATION: {f['path']}", file=sys.stderr)
        print(f"   Reason:   {f['error']}", file=sys.stderr)
        print(f"   Expected: {f['expected']}", file=sys.stderr)
        print(f"   Actual:   {f['actual']}", file=sys.stderr)
    print("==================================================================", file=sys.stderr)
    print(" To resolve legitimately: If changes are authorized, run:", file=sys.stderr)
    print("   python scripts/verify_frozen_files.py --update", file=sys.stderr)
    print(" To invoke emergency fix path during outage:", file=sys.stderr)
    print("   See docs/compliance/EMERGENCY_FIX_RUNBOOK.md", file=sys.stderr)
    print("==================================================================", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
