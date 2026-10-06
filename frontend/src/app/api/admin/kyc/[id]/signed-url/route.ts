import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getSigningKey(): Buffer {
  const secret = process.env.STEP_UP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'trinetra-admin-step-up-secret-key-32b!'
  return Buffer.from(secret, 'utf-8')
}

function verifyStepUpToken(token: string, expectedUserId: string, expectedAction: string): { valid: boolean; reason?: string } {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return { valid: false, reason: 'Malformed token structure' }
    const expectedSig = crypto.createHmac('sha256', getSigningKey()).update(payloadB64).digest('base64url')
    if (sig !== expectedSig) return { valid: false, reason: 'Invalid token signature' }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return { valid: false, reason: 'Step-up token expired' }
    if (payload.sub !== expectedUserId) return { valid: false, reason: 'Token user mismatch' }
    if (payload.action !== expectedAction && payload.action !== '*') return { valid: false, reason: 'Action mismatch' }
    return { valid: true }
  } catch (e: any) {
    return { valid: false, reason: e.message }
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
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

    // Master Plan Section 18.4: developer_tester accounts are strictly forbidden from viewing customer KYC
    if (role === 'developer_tester') {
      return NextResponse.json({
        error: 'Developer/tester accounts are strictly forbidden from viewing or decrypting customer KYC documents.',
      }, { status: 403 })
    }

    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 })
    }

    // Step-Up Re-Authentication verification (300-second token)
    const stepUpToken = req.headers.get('x-admin-step-up-token')
    if (!stepUpToken) {
      return NextResponse.json({
        error: 'Privileged step-up authentication required to decrypt customer KYC documents.',
        requires_step_up: true,
        action: 'kyc_view',
      }, { status: 403 })
    }

    const verification = verifyStepUpToken(stepUpToken, user.id, 'kyc_view')
    if (!verification.valid) {
      return NextResponse.json({
        error: `Step-up authentication failed: ${verification.reason || 'Invalid or expired token'}. Please re-authenticate.`,
        requires_step_up: true,
        action: 'kyc_view',
      }, { status: 403 })
    }

    // Fetch document record
    const { data: doc, error: docErr } = await admin
      .from('kyc_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docErr || !doc) {
      return NextResponse.json({ error: 'KYC document not found.' }, { status: 404 })
    }

    // Fetch organization name
    let orgName = 'Default Workspace'
    if (doc.organization_id) {
      const { data: org } = await admin.from('organizations').select('name').eq('id', doc.organization_id).maybeSingle()
      if (org?.name) orgName = org.name
    }

    // Fetch user details
    let userEmail = 'N/A'
    if (doc.user_id) {
      const { data: uProf } = await admin.from('profiles').select('email').eq('id', doc.user_id).maybeSingle()
      if (uProf?.email) userEmail = uProf.email
    }

    // Master Plan Section 18.4 & 18.6: Generate short-lived signed URL (max 15 minutes / 900 seconds)
    const expirySeconds = 900
    const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds

    const viewPayload = `${doc.id}:${expiresAt}:${user.id}`
    const sig = crypto.createHmac('sha256', getSigningKey()).update(viewPayload).digest('base64url')
    const viewToken = Buffer.from(`${viewPayload}:${sig}`).toString('base64url')

    const signedUrl = `/api/kyc/documents/${doc.id}/view?token=${viewToken}`

    const forwarded = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const clientIp = forwarded.split(',')[0].trim()
    const userAgent = req.headers.get('user-agent') || 'Unknown'
    const nowIso = new Date().toISOString()

    // 1. Immutably record access in kyc_access_audit_logs
    try {
      await admin.from('kyc_access_audit_logs').insert({
        document_id: doc.id,
        organization_id: doc.organization_id,
        accessed_by_user_id: user.id,
        access_type: 'view_signed_url',
        step_up_token_verified: true,
        client_ip: clientIp,
        user_agent: userAgent,
        justification: `Decrypted signed view URL generated by admin ${user.email || user.id}`,
        accessed_at: nowIso,
      })
    } catch (auditErr) {
      console.warn('[Audit Log] Failed to insert kyc_access_audit_logs:', auditErr)
    }

    // 2. Immutably record in central audit_logs
    try {
      await admin.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: role,
        action: 'admin.kyc_document_decrypted',
        resource_type: 'kyc_documents',
        resource_id: doc.id,
        details: {
          document_type: doc.document_type,
          masked_id: doc.id_number_masked,
          expires_in_seconds: expirySeconds,
          signed_url: signedUrl,
        },
        ip_address: clientIp,
        user_agent: userAgent,
        created_at: nowIso,
      })
    } catch (auditErr) {
      console.warn('[Audit Log] Failed to insert audit_logs:', auditErr)
    }

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      signed_url: signedUrl,
      expires_in_seconds: expirySeconds,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      document: {
        ...doc,
        organization_name: orgName,
        user_email: userEmail,
      },
    })
  } catch (err: any) {
    console.error('Error in KYC signed URL generation:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
