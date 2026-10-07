import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const STEP_UP_TOKEN_VALIDITY_SECONDS = 300 // 5 minutes

const ALLOWED_STEP_UP_ACTIONS = new Set([
  'kyc_view',
  'wallet_adjust',
  'price_change',
  'credential_update',
  'number_release_override',
])

function getSigningKey(): Buffer {
  const secret = process.env.STEP_UP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'trinetra-admin-step-up-secret-key-32b!'
  return Buffer.from(secret, 'utf-8')
}

function issueStepUpToken(userId: string, role: string, action: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: userId,
    role,
    action,
    iat: now,
    exp: now + STEP_UP_TOKEN_VALIDITY_SECONDS,
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', getSigningKey()).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'customer'
    const isAdmin = role === 'admin' || role === 'super_admin'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin role required for step-up authentication.' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { action, credential, credential_type = 'password' } = body

    if (!action || !ALLOWED_STEP_UP_ACTIONS.has(action)) {
      return NextResponse.json({
        error: `Invalid action. Allowed step-up actions: ${Array.from(ALLOWED_STEP_UP_ACTIONS).join(', ')}`,
      }, { status: 400 })
    }

    // Role check: developer_tester forbidden from KYC view
    if (role === 'developer_tester' && action === 'kyc_view') {
      return NextResponse.json({
        error: 'Developer/tester accounts are strictly forbidden from viewing customer KYC documents.',
      }, { status: 403 })
    }

    // Credential check
    const expectedPassword = process.env.ADMIN_PASSWORD || 'trinetra-admin-secure-2026'
    let verified = false

    if (credential_type === 'password') {
      verified = Boolean(credential && credential === expectedPassword)
    } else if (credential_type === 'totp') {
      // In production, verify against Supabase MFA or TOTP secret
      verified = Boolean(credential && credential.length === 6 && /^\d+$/.test(credential))
    }

    if (!verified) {
      return NextResponse.json({ error: `Incorrect ${credential_type}. Step-up authentication failed.` }, { status: 401 })
    }

    // Issue step-up token
    const token = issueStepUpToken(user.id, role, action)

    // Audit log
    try {
      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: role,
        action: 'admin.step_up_reauth_success',
        resource_type: 'step_up_token',
        details: { action, credential_type },
        created_at: new Date().toISOString(),
      })
    } catch (auditErr) {
      console.warn('[Audit Log] Failed to log step-up reauth:', auditErr)
    }

    return NextResponse.json({
      success: true,
      step_up_token: token,
      action,
      expires_in_seconds: STEP_UP_TOKEN_VALIDITY_SECONDS,
    })
  } catch (error: any) {
    console.error('Step-up auth error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
