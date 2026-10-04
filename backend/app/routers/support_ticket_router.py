"""
backend/app/routers/support_ticket_router.py

FastAPI Router for Support Tickets System & CFU (Call Forwarding Unconditional) Workflows.
Implements Master Plan Section 18.15 Item 12.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, Field

from app.services.support_ticket_service import SupportTicketService

support_ticket_router = APIRouter(prefix="/api/support", tags=["support"])


class CreateCFUTicketRequest(BaseModel):
    organization_id: str
    source_number: str = Field(min_length=7, description="Existing business phone number to forward from")
    carrier: str = Field(min_length=2, description="Customer telecom carrier (e.g. Jio, Airtel, Vi, BSNL, AT&T, Verizon)")
    forward_to_number: str = Field(min_length=7, description="Assigned Vaakriti/Trinetra virtual number")
    notes: Optional[str] = None
    priority: Optional[str] = "urgent"
    submitted_by: Optional[str] = None


class CreateTicketRequest(BaseModel):
    organization_id: str
    subject: str = Field(min_length=3)
    category: str
    priority: Optional[str] = "medium"
    message: str = Field(min_length=5)
    sender_name: Optional[str] = None
    submitted_by: Optional[str] = None


class AddReplyRequest(BaseModel):
    organization_id: str
    sender_role: str = Field(description="'client' or 'admin'")
    sender_name: str
    message: str = Field(min_length=1)


class ConfirmCFUVerificationRequest(BaseModel):
    organization_id: str
    verified: bool
    notes: Optional[str] = None


class AssignTicketAdminRequest(BaseModel):
    admin_id: Optional[str] = None


# -----------------------------------------------------------------------------
# Customer Endpoints
# -----------------------------------------------------------------------------
@support_ticket_router.post("/tickets/cfu")
async def create_cfu_ticket(req: CreateCFUTicketRequest):
    """
    Creates a specialized Call Forwarding Unconditional (CFU) support ticket
    with carrier-tailored dial codes and instructions.
    """
    service = SupportTicketService()
    try:
        ticket = service.create_cfu_ticket(
            organization_id=req.organization_id,
            submitted_by=req.submitted_by,
            source_number=req.source_number,
            carrier=req.carrier,
            forward_to_number=req.forward_to_number,
            notes=req.notes,
            priority=req.priority or "urgent",
        )
        return {
            "success": True,
            "message": "Call Forwarding Unconditional (CFU) request created successfully.",
            "ticket": ticket,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create CFU ticket: {e}")


@support_ticket_router.post("/tickets")
async def create_standard_ticket(req: CreateTicketRequest):
    """
    Creates a standard support ticket with SLA tracking.
    """
    service = SupportTicketService()
    try:
        ticket = service.create_ticket(
            organization_id=req.organization_id,
            submitted_by=req.submitted_by,
            subject=req.subject,
            category=req.category,
            priority=req.priority or "medium",
            message=req.message,
            sender_name=req.sender_name,
        )
        return {
            "success": True,
            "message": "Support ticket created successfully.",
            "ticket": ticket,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create support ticket: {e}")


@support_ticket_router.get("/tickets")
async def list_organization_tickets(
    organization_id: str = Query(...),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    """Lists support tickets for a tenant organization."""
    service = SupportTicketService()
    tickets = service.list_organization_tickets(
        organization_id=organization_id,
        status=status,
        category=category,
    )
    return {
        "success": True,
        "count": len(tickets),
        "tickets": tickets,
    }


@support_ticket_router.get("/tickets/{ticket_id}")
async def get_ticket_details(
    ticket_id: str,
    organization_id: str = Query(...),
):
    """Gets details for a specific support ticket."""
    service = SupportTicketService()
    try:
        ticket = service.get_ticket(ticket_id=ticket_id, organization_id=organization_id)
        return {
            "success": True,
            "ticket": ticket,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch ticket: {e}")


@support_ticket_router.post("/tickets/{ticket_id}/reply")
async def add_ticket_reply(ticket_id: str, req: AddReplyRequest):
    """Appends a new reply to a ticket thread."""
    service = SupportTicketService()
    try:
        res = service.add_reply(
            ticket_id=ticket_id,
            organization_id=req.organization_id,
            sender_role=req.sender_role,
            sender_name=req.sender_name,
            message=req.message,
        )
        return {
            "success": True,
            "data": res,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reply to ticket: {e}")


@support_ticket_router.post("/tickets/{ticket_id}/cfu/test-call")
async def trigger_cfu_test_call(
    ticket_id: str,
    organization_id: str = Query(...),
):
    """Dispatches automated test call verification for a CFU ticket."""
    service = SupportTicketService()
    try:
        res = service.trigger_cfu_test_call(
            ticket_id=ticket_id,
            organization_id=organization_id,
        )
        return {
            "success": True,
            "data": res,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch test call: {e}")


@support_ticket_router.post("/tickets/{ticket_id}/cfu/confirm")
async def confirm_cfu_verification(
    ticket_id: str,
    req: ConfirmCFUVerificationRequest,
):
    """Marks CFU forwarding test call as verified or failed."""
    service = SupportTicketService()
    try:
        res = service.confirm_cfu_verification(
            ticket_id=ticket_id,
            organization_id=req.organization_id,
            verified=req.verified,
            notes=req.notes,
        )
        return {
            "success": True,
            "data": res,
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm verification: {e}")


# -----------------------------------------------------------------------------
# Admin Triage Endpoints
# -----------------------------------------------------------------------------
@support_ticket_router.get("/admin/triage")
async def get_admin_triage_queue(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    only_sla_breached: bool = Query(False),
):
    """Lists global admin triage queue ordered by SLA urgency."""
    service = SupportTicketService()
    tickets = service.get_admin_triage_queue(
        status=status,
        priority=priority,
        category=category,
        only_sla_breached=only_sla_breached,
    )
    return {
        "success": True,
        "count": len(tickets),
        "tickets": tickets,
    }


@support_ticket_router.post("/admin/tickets/{ticket_id}/assign")
async def assign_ticket_admin(
    ticket_id: str,
    req: AssignTicketAdminRequest,
):
    """Assigns an admin operator to a ticket."""
    service = SupportTicketService()
    try:
        res = service.assign_ticket_admin(ticket_id=ticket_id, admin_id=req.admin_id)
        return {
            "success": True,
            "data": res,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign admin: {e}")
