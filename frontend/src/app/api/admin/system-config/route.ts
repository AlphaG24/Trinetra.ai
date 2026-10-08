import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client bypasses RLS — only used after super_admin check
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Strict Super Admin Role Verification
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin or Super Admin role required' }, { status: 403 })
    }

    // 3. Query system_config table using service role to bypass RLS
    const adminClient = getAdminClient()
    const { data: configs, error: configError } = await adminClient
      .from('system_config')
      .select('config_key, config_value, description, updated_at')

    if (configError) {
      console.error('[system-config GET] Error reading configs:', configError)
      return NextResponse.json({ configs: {} })
    }

    // Map configs into key-value map for frontend
    const configMap: Record<string, string> = {}
    configs?.forEach(item => {
      configMap[item.config_key] = item.config_value
    })

    console.log('[system-config GET] Loaded keys:', Object.keys(configMap))
    return NextResponse.json({ configs: configMap })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Strict Super Admin Role Verification
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      // Audit log unauthorized attempt
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: user.email,
          user_role: profile?.role || 'unknown',
          action: 'admin.system_config_unauthorized',
          resource_type: 'system_config',
        })
      } catch {}
      return NextResponse.json({ error: 'Forbidden: Admin or Super Admin role required' }, { status: 403 })
    }

    // 3. Upsert entries into system_config
    const updates = body.configs as Record<string, string>
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid config payload' }, { status: 400 })
    }

    // Fetch current config state for old_value tracking and change detection
    const adminClientForRead = getAdminClient()
    const { data: currentConfigs } = await adminClientForRead
      .from('system_config')
      .select('config_key, config_value')

    const currentMap: Record<string, string> = {}
    currentConfigs?.forEach(item => {
      currentMap[item.config_key] = item.config_value
    })

    // Master Plan Section 18.4 Step-Up Auth Enforcement
    const pricingKeys = new Set([
      'trial_price_paisa', 'starter_price_paisa', 'professional_price_paisa',
      'enterprise_price_paisa', 'inbound_number_cost_paisa', 'overage_per_minute_paisa',
      'credit_per_minute_paisa', 'wallet_min_topup_paisa',
      'outcome_appointment_paisa', 'outcome_lead_paisa',
      'default_spend_limit_paisa', 'onboarding_fee_paisa',
      'starter_price_usd_cents', 'professional_price_usd_cents', 'enterprise_price_usd_cents',
      'trial_price_usd_cents', 'foreign_number_cost_usd_cents', 'overage_per_minute_usd_cents',
      'starter_price_eur_cents', 'professional_price_eur_cents', 'enterprise_price_eur_cents',
      'trial_price_eur_cents', 'foreign_number_cost_eur_cents', 'overage_per_minute_eur_cents',
    ])
    const hasPricingUpdates = Object.keys(updates).some((k) => pricingKeys.has(k) && currentMap[k] !== undefined && updates[k] !== currentMap[k])
    const isCredentialRotation = Boolean(body.is_rotation)

    if (hasPricingUpdates || isCredentialRotation) {
      const stepUpToken = request.headers.get('x-step-up-token') || body.step_up_token
      const targetAction = isCredentialRotation ? 'credential_update' : 'price_change'

      const secret = process.env.STEP_UP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'trinetra-admin-step-up-secret-key-32b!'
      let isStepUpValid = false

      if (stepUpToken && stepUpToken.includes('.')) {
        try {
          const crypto = await import('crypto')
          const [payloadB64, sigB64] = stepUpToken.split('.')
          const expectedSig = crypto.createHmac('sha256', Buffer.from(secret, 'utf-8')).update(payloadB64).digest('base64url')
          if (sigB64 === expectedSig) {
            const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))
            if (payload.sub === user.id && (payload.action === targetAction || payload.action === '*') && Math.floor(Date.now() / 1000) <= payload.exp) {
              isStepUpValid = true
            }
          }
        } catch {
          isStepUpValid = false
        }
      }

      const isStrictEnforced = process.env.NODE_ENV === 'production' && process.env.STEP_UP_STRICT === 'true'
      if (isStrictEnforced && !isStepUpValid) {
        return NextResponse.json({
          error: `Step-up authentication required: privileged operation '${targetAction}' requires recent re-authentication.`,
          step_up_required: true,
          action: targetAction,
        }, { status: 403 })
      }
    }

    // Perform validation checks
    const integerKeys = [
      'free_demo_minutes', 'trial_days', 'trial_minutes', 
      'starter_minutes', 'professional_minutes', 'enterprise_minutes',
      'max_agents_free', 'max_agents_trial', 'max_agents_starter', 'max_agents_professional',
      'emergency_minutes_quota', 'emergency_minutes_min_reliability_score', 'emergency_minutes_cooldown_days',
      'max_pooled_numbers_per_org', 'hold_period_days', 'auto_pool_threshold'
    ]

    const nonNegativeKeys = [
      'trial_price_paisa', 'starter_price_paisa', 'professional_price_paisa',
      'enterprise_price_paisa', 'inbound_number_cost_paisa', 'overage_per_minute_paisa',
      'credit_per_minute_paisa', 'wallet_min_topup_paisa',
      'outcome_appointment_paisa', 'outcome_lead_paisa',
      'default_spend_limit_paisa', 'onboarding_fee_paisa',
      'starter_price_usd_cents', 'professional_price_usd_cents', 'enterprise_price_usd_cents',
      'trial_price_usd_cents', 'foreign_number_cost_usd_cents', 'overage_per_minute_usd_cents',
      'starter_price_eur_cents', 'professional_price_eur_cents', 'enterprise_price_eur_cents',
      'trial_price_eur_cents', 'foreign_number_cost_eur_cents', 'overage_per_minute_eur_cents',
    ]

    const changes: Record<string, { old_value: string | null; new_value: string }> = {}

    // String-only keys that bypass numeric validation
    const stringKeys = ['maintenance_mode', 'trial_can_assign_numbers', 'onboarding_fee_enabled']

    for (const [key, value] of Object.entries(updates)) {
      const valStr = String(value).trim()

      if (stringKeys.includes(key)) {
        // No numeric validation needed for boolean/string flags
      } else if (integerKeys.includes(key)) {
        const parsed = parseInt(valStr, 10)
        if (isNaN(parsed) || parsed <= 0) {
          return NextResponse.json({ error: `Validation Error: Key '${key}' must be a positive integer` }, { status: 400 })
        }
      } else if (nonNegativeKeys.includes(key)) {
        const parsed = parseInt(valStr, 10)
        if (isNaN(parsed) || parsed < 0) {
          return NextResponse.json({ error: `Validation Error: Key '${key}' must be a non-negative integer` }, { status: 400 })
        }
      }

      // Check if value changed
      const oldVal = currentMap[key] !== undefined ? currentMap[key] : null
      if (oldVal !== valStr) {
        changes[key] = {
          old_value: oldVal,
          new_value: valStr
        }
      }
    }

    // If no changes, return early
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ success: true, message: 'No configuration changes detected', updated_keys: [] })
    }

    // Upsert rows — only send columns that exist on system_config table
    const upsertRows = Object.entries(updates).map(([key, value]) => ({
      config_key: key,
      config_value: String(value).trim(),
    }))

    if (updates['maintenance_mode'] !== undefined) {
      console.log('[Maintenance] Saving mode:', updates['maintenance_mode'])
    }

    // Use a service role client to bypass RLS, since we already verified super_admin role above.
    const adminClient = getAdminClient()

    const { error: upsertError } = await adminClient
      .from('system_config')
      .upsert(upsertRows, { onConflict: 'config_key' })

    if (upsertError) {
      console.error('System config upsert failed:', upsertError)
      return NextResponse.json({ error: 'Failed to update system configs: ' + upsertError.message }, { status: 500 })
    }

    // 4. Record Audit Log for successful update
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: profile.role,
        action: body.is_rotation ? 'admin.keys_rotated' : 'admin.system_config_updated',
        resource_type: 'system_config',
        new_values: {
          changes: changes,
          keys_updated: Object.keys(changes)
        },
      })
    } catch (auditErr) {
      console.warn('Audit log entry failed:', auditErr)
    }

    return NextResponse.json({ success: true, updated_keys: Object.keys(changes) })
  } catch (error: any) {
    console.error('System config route error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error', stack: error.stack }, { status: 500 })
  }
}
