"""
backend/app/routers/backup_router.py

Router for Automated Backup & Restore Validation Drills.
Implements Master Plan Section 18.15 Item 17.

Endpoints:
- GET /api/backup/drill-status : Public/Admin status of latest backup restore drill
- POST /api/backup/run-synthetic-drill : Privileged admin trigger for synthetic drill
"""

from fastapi import APIRouter, Header, HTTPException, status
from typing import Optional, Dict, Any

from app.services.backup_restore_service import BackupRestoreService
from app.services.admin_auth_service import AdminAuthService

backup_router = APIRouter(prefix="/api/backup", tags=["Disaster Recovery & Backup Drills"])


@backup_router.get("/drill-status")
async def get_drill_status() -> Dict[str, Any]:
    """
    Returns the latest synthetic backup and restore drill results,
    including RPO/RTO compliance, table verification counts, and checksum.
    """
    return BackupRestoreService.get_latest_drill_status()


@backup_router.post("/run-synthetic-drill")
async def run_synthetic_drill(
    x_admin_user_id: Optional[str] = Header(None, alias="x-admin-user-id"),
    x_admin_role: Optional[str] = Header(None, alias="x-admin-role"),
    x_step_up_token: Optional[str] = Header(None, alias="x-step-up-token")
) -> Dict[str, Any]:
    """
    Privileged admin endpoint to execute an automated synthetic backup and restore drill.
    Requires role 'admin'. If step-up token provided, validates authenticity.
    """
    # 1. Role validation
    if x_admin_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin role required to execute disaster recovery drills."
        )

    actor_id = x_admin_user_id or "admin_system"

    # 2. Step-up token validation (if provided)
    if x_step_up_token:
        # If token provided, verify it isn't invalid
        is_valid, _, _ = AdminAuthService.verify_step_up_token(
            token=x_step_up_token,
            expected_user_id=actor_id,
            expected_action="backup_drill"
        )
        if not is_valid:
            # Also check generic admin actions
            is_valid_generic, _, _ = AdminAuthService.verify_step_up_token(
                token=x_step_up_token,
                expected_user_id=actor_id,
                expected_action="admin_action"
            )
            if not is_valid_generic:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired step-up authorization token."
                )

    # 3. Execute drill
    report = BackupRestoreService.run_drill(
        admin_user_id=actor_id,
        mode="synthetic"
    )

    return {
        "success": report.get("restore_status") == "SUCCESS",
        "drill_report": report
    }
