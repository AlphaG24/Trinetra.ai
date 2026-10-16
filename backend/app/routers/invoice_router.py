"""
backend/app/routers/invoice_router.py

FastAPI Router for GST Invoicing Vault & CA-Reviewed Workflows.
Implements Master Plan Section 18.10, 18.11, and B6.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.services.invoice_vault_service import InvoiceVaultService
from app.services.billing_lifecycle_service import InvoiceDeliveryService

invoice_router = APIRouter(prefix="/api/invoices", tags=["invoices"])


class CAReviewRequest(BaseModel):
    action: str = Field(description="approved | flagged | waived | amended")
    ca_membership_no: str = Field(min_length=3, description="Chartered Accountant ICAI Membership Number")
    ca_name: str = Field(min_length=2, description="CA Full Name")
    notes: str = Field(default="", description="Audit review notes or statutory comments")
    reviewer_id: Optional[str] = Field(default="admin-system-id", description="Reviewer user ID")


class DeliverInvoiceRequest(BaseModel):
    organization_id: str
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None


class GenerateInvoiceRequest(BaseModel):
    organization_id: str
    amount_paisa: int = Field(gt=0, description="Amount in paisa inclusive of GST")
    payment_reference_id: str
    customer_legal_name: Optional[str] = None
    customer_gstin: Optional[str] = None
    customer_state: Optional[str] = None
    customer_state_code: Optional[str] = None
    transaction_type: str = "wallet_topup"
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None


@invoice_router.get("")
async def list_invoices(
    organization_id: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    List invoices filtered by organization_id (tenant-scoped).
    """
    service = InvoiceVaultService()
    invoices = service.list_invoices(organization_id=organization_id, limit=limit, offset=offset)
    return {
        "success": True,
        "count": len(invoices),
        "invoices": invoices,
    }


@invoice_router.get("/ca-summary")
async def get_ca_tax_summary(fiscal_year: Optional[str] = None):
    """
    Aggregate statutory tax summary for GSTR-1 & GSTR-3B filings by Chartered Accountant.
    """
    service = InvoiceVaultService()
    if not fiscal_year:
        fiscal_year, _ = service.get_current_fiscal_year()
    summary = service.generate_ca_tax_summary(fiscal_year=fiscal_year)
    return {
        "success": True,
        "summary": summary,
    }


@invoice_router.get("/{invoice_id}")
async def get_invoice(invoice_id: str, organization_id: Optional[str] = None):
    """
    Retrieves full invoice details with line items and CA review audit history.
    """
    service = InvoiceVaultService()
    invoice = service.get_invoice(invoice_id, organization_id=organization_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "success": True,
        "invoice": invoice,
    }


@invoice_router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, organization_id: Optional[str] = None):
    """
    Generates and returns the statutory GST tax invoice PDF bytes.
    """
    service = InvoiceVaultService()
    try:
        pdf_bytes = service.generate_invoice_pdf(invoice_id, organization_id=organization_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate invoice PDF: {e}")

    filename = f"Invoice_{invoice_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@invoice_router.post("/{invoice_id}/ca-review")
async def submit_ca_review(invoice_id: str, req: CAReviewRequest):
    """
    Submits a Chartered Accountant review sign-off with append-only audit trail.
    """
    service = InvoiceVaultService()
    try:
        result = service.submit_ca_review(
            invoice_id=invoice_id,
            reviewer_id=req.reviewer_id or "ca-system",
            ca_membership_no=req.ca_membership_no,
            ca_name=req.ca_name,
            action=req.action,
            notes=req.notes,
        )
        return {
            "success": True,
            "message": f"CA review recorded successfully with status: {result['ca_review_status']}",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record CA review: {e}")


@invoice_router.post("/generate")
async def generate_invoice(req: GenerateInvoiceRequest):
    """
    Generates an invoice on demand (e.g. for manual credits or top-ups).
    """
    service = InvoiceVaultService()
    try:
        invoice = service.create_invoice_for_wallet_topup(
            organization_id=req.organization_id,
            amount_paisa=req.amount_paisa,
            payment_reference_id=req.payment_reference_id,
            customer_legal_name=req.customer_legal_name,
            customer_gstin=req.customer_gstin,
            customer_state=req.customer_state,
            customer_state_code=req.customer_state_code,
            transaction_type=req.transaction_type,
        )
        # Trigger multi-channel delivery (Email + WhatsApp India + Vault per Decision B4)
        delivery_res = None
        if req.recipient_email or req.recipient_phone:
            try:
                delivery_service = InvoiceDeliveryService()
                inv_id = invoice.get("id") or req.payment_reference_id
                delivery_res = delivery_service.deliver_invoice(
                    invoice_id=inv_id,
                    organization_id=req.organization_id,
                    recipient_email=req.recipient_email,
                    recipient_phone=req.recipient_phone,
                )
            except Exception:
                pass

        return {
            "success": True,
            "invoice": invoice,
            "delivery": delivery_res,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate invoice: {e}")


@invoice_router.post("/{invoice_id}/deliver")
async def deliver_invoice(invoice_id: str, req: DeliverInvoiceRequest):
    """
    Triggers multi-channel delivery of statutory invoice via Email + WhatsApp (India) + permanent in-app vault (Decision B4).
    """
    delivery_service = InvoiceDeliveryService()
    try:
        res = delivery_service.deliver_invoice(
            invoice_id=invoice_id,
            organization_id=req.organization_id,
            recipient_email=req.recipient_email,
            recipient_phone=req.recipient_phone,
        )
        return {
            "success": True,
            "message": "Invoice successfully dispatched across configured delivery channels.",
            "delivery": res,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deliver invoice: {e}")
