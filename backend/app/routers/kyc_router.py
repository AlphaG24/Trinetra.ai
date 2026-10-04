"""
backend/app/routers/kyc_router.py

FastAPI Router for Encrypted KYC Document Vault, Mandatory Consent, and Step-Up Access.
Implements Master Plan Section 18.6 & 18.15 Item 13 (Authoritative Overrides).
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query, Header, Request
from pydantic import BaseModel, Field

from app.services.kyc_vault_service import KYCVaultService

kyc_router = APIRouter(prefix="/api/kyc", tags=["kyc"])


class UploadKYCRequest(BaseModel):
    organization_id: str
    user_id: str
    user_role: str = "customer"
    document_type: str = Field(description="One of: company_pan, gstin_certificate, authorized_signatory_id, utility_bill, incorporation_cert, passport, driving_license")
    file_base64: str = Field(min_length=10, description="Base64 encoded file payload")
    filename: str
    mime_type: str = "application/pdf"
    raw_id_number: Optional[str] = None
    phone_number_id: Optional[str] = None
    upload_consent_given: bool = Field(default=True, description="Mandatory affirmative statutory consent")


class SignedUrlRequest(BaseModel):
    organization_id: str
    requesting_user_id: str
    requesting_user_role: str
    step_up_token: Optional[str] = None
    justification: Optional[str] = None
    expiry_seconds: Optional[int] = 900


class ReviewKYCRequest(BaseModel):
    admin_user_id: str
    admin_role: str = "admin"
    status: str = Field(description="'verified' or 'rejected'")
    rejection_reason: Optional[str] = None


@kyc_router.post("/upload")
async def upload_kyc_document(req: UploadKYCRequest, request: Request):
    """
    Ingests and encrypts customer KYC document with AES-256-GCM.
    Enforces mandatory affirmative statutory consent and UIDAI masking.
    """
    import base64
    service = KYCVaultService()
    try:
        raw_bytes = base64.b64decode(req.file_base64.encode("utf-8"))
        client_ip = request.client.host if request.client else None

        result = service.upload_kyc_document(
            organization_id=req.organization_id,
            user_id=req.user_id,
            user_role=req.user_role,
            document_type=req.document_type,
            file_bytes=raw_bytes,
            filename=req.filename,
            mime_type=req.mime_type,
            raw_id_number=req.raw_id_number,
            phone_number_id=req.phone_number_id,
            upload_consent_given=req.upload_consent_given,
            upload_ip_address=client_ip,
        )
        return {
            "success": True,
            "message": "KYC document encrypted and vaulted successfully.",
            "document": result,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload KYC document: {e}")


@kyc_router.get("/documents")
async def list_kyc_documents(
    organization_id: str = Query(...),
    requesting_user_role: str = Query("customer"),
):
    """
    Lists metadata of vaulted KYC documents for an organization.
    """
    service = KYCVaultService()
    try:
        docs = service.list_organization_documents(
            organization_id=organization_id,
            requesting_user_role=requesting_user_role,
        )
        return {
            "success": True,
            "count": len(docs),
            "documents": docs,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list KYC documents: {e}")


@kyc_router.post("/documents/{document_id}/signed-url")
async def generate_signed_view_url(
    document_id: str,
    req: SignedUrlRequest,
    request: Request,
):
    """
    Generates a short-lived (<= 15 minutes) signed URL for document decryption/view.
    Enforces Step-Up Auth for admins and blocks developer_tester accounts.
    """
    service = KYCVaultService()
    try:
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        result = service.generate_signed_view_url(
            document_id=document_id,
            requesting_user_id=req.requesting_user_id,
            requesting_user_role=req.requesting_user_role,
            organization_id=req.organization_id,
            step_up_token=req.step_up_token,
            client_ip=client_ip,
            user_agent=user_agent,
            justification=req.justification,
            expiry_seconds=req.expiry_seconds or 900,
        )
        return {
            "success": True,
            "data": result,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {e}")


@kyc_router.post("/documents/{document_id}/review")
async def review_kyc_document(
    document_id: str,
    req: ReviewKYCRequest,
    request: Request,
):
    """
    Admin review sign-off: marks document as verified or rejected.
    """
    service = KYCVaultService()
    try:
        client_ip = request.client.host if request.client else None
        result = service.update_document_status(
            document_id=document_id,
            admin_user_id=req.admin_user_id,
            admin_role=req.admin_role,
            new_status=req.status,
            rejection_reason=req.rejection_reason,
            client_ip=client_ip,
        )
        return {
            "success": True,
            "message": f"KYC document status updated to '{req.status}'.",
            "data": result,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to review document: {e}")


@kyc_router.get("/documents/{document_id}/audit-logs")
async def get_document_audit_logs(
    document_id: str,
    admin_role: str = Query("admin"),
):
    """
    Retrieves the immutable access audit trail for a KYC document.
    """
    service = KYCVaultService()
    try:
        logs = service.get_document_audit_logs(
            document_id=document_id,
            requesting_user_role=admin_role,
        )
        return {
            "success": True,
            "count": len(logs),
            "audit_logs": logs,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit logs: {e}")
