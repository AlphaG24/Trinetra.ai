import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createAdminClient(url, serviceKey)
}

async function verifyAdminAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401, user: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { authorized: false, error: 'Forbidden: Admin role required', status: 403, user: null }
  }

  return { authorized: true, user, profile }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    let regionsData: any = null

    try {
      const res = await fetch(`${backendUrl}/api/compliance/regions`, { cache: 'no-store' })
      if (res.ok) {
        regionsData = await res.json()
      }
    } catch (backendErr) {
      console.warn('Backend /compliance/regions unreachable, reading from database system_config fallback')
    }

    // Also check database system_config for any persistent regional config overrides
    const adminSupabase = getAdminClient()
    const { data: configs } = await adminSupabase
      .from('system_config')
      .select('config_key, config_value')
      .like('config_key', 'region_config_%')

    const dbOverrides: Record<string, any> = {}
    if (configs) {
      for (const row of configs) {
        const regionCode = row.config_key.replace('region_config_', '').toUpperCase()
        try {
          dbOverrides[regionCode] = typeof row.config_value === 'string' ? JSON.parse(row.config_value) : row.config_value
        } catch {
          // ignore
        }
      }
    }

    if (regionsData && regionsData.regions) {
      // Merge db overrides into canonical regions
      for (const code of Object.keys(dbOverrides)) {
        if (regionsData.regions[code]) {
          regionsData.regions[code] = { ...regionsData.regions[code], ...dbOverrides[code] }
        }
      }
      return NextResponse.json(regionsData)
    }

    return NextResponse.json({
      success: true,
      regions: dbOverrides
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { region_code, updates } = body

    if (!region_code || !updates) {
      return NextResponse.json({ error: 'region_code and updates are required' }, { status: 400 })
    }

    const normCode = region_code.toUpperCase()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    let backendSuccess = false

    try {
      const bRes = await fetch(`${backendUrl}/api/compliance/regions/${normCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (bRes.ok) {
        backendSuccess = true
      }
    } catch (bErr) {
      console.warn('Failed to push to FastAPI directly, will save to system_config')
    }

    // Persist to system_config
    const adminSupabase = getAdminClient()
    const configKey = `region_config_${normCode}`
    
    // Read current config if existing to merge
    const { data: existingRow } = await adminSupabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle()

    let merged = {}
    if (existingRow?.config_value) {
      try {
        merged = typeof existingRow.config_value === 'string' ? JSON.parse(existingRow.config_value) : existingRow.config_value
      } catch {
        merged = {}
      }
    }

    merged = {
      ...merged,
      ...updates,
      updated_at: new Date().toISOString()
    }

    await adminSupabase.from('system_config').upsert({
      config_key: configKey,
      config_value: JSON.stringify(merged),
      description: `Admin regional compliance overrides for ${normCode}`
    }, { onConflict: 'config_key' })

    // Log in admin audit logs
    await adminSupabase.from('audit_logs').insert({
      action: 'admin.region_config_updated',
      user_id: auth.user?.id,
      user_email: auth.profile?.email,
      details: { region_code: normCode, updates }
    })

    return NextResponse.json({
      success: true,
      message: `Region rules for ${normCode} successfully updated.`,
      region_code: normCode,
      updated_config: merged
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
