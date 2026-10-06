import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { dispatchKYCReviewNotification } from '@/lib/kyc-notifications'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'customer'
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { status, rejection_reason } = body

    if (!status || !['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be "verified" or "rejected".' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, any> = {
      status,
      verified_by_admin_id: user.id,
      verified_at: now,
      updated_at: now,
    }

    if (status === 'rejected') {
      updatePayload.rejection_reason = rejection_reason || 'Document does not meet statutory verification requirements.'
    } else {
      updatePayload.rejection_reason = null
    }

    const { data: updated, error: updateErr } = await admin
      .from('kyc_documents')
      .update(updatePayload)
      .eq('id', id)
      .select('id, organization_id, document_type, status, rejection_reason, verified_at')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Dispatch multi-channel notifications (Dashboard, Email via Resend, WhatsApp via Twilio)
    let notifDelivery = { dashboard: false, email: false, whatsapp: false }
    try {
      notifDelivery = await dispatchKYCReviewNotification({
        documentId: id,
        status,
        rejectionReason: updatePayload.rejection_reason,
        adminUserId: user.id,
      })
    } catch (notifErr) {
      console.warn('[KYC Notification] Notification delivery issue:', notifErr)
    }

    // Audit log
    try {
      await admin.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: role,
        action: `admin.kyc_document_${status}`,
        resource_type: 'kyc_documents',
        details: { 
          document_id: id, 
          status, 
          rejection_reason: updatePayload.rejection_reason,
          notifications_dispatched: notifDelivery 
        },
        created_at: now,
      })
    } catch (auditErr) {
      console.warn('[Audit Log] Failed to log kyc review action:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: `KYC document successfully ${status === 'verified' ? 'approved' : 'rejected'}. Notifications dispatched to customer.`,
      document: updated,
      notifications: notifDelivery,
    })
  } catch (err: any) {
    console.error('Admin KYC review error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
