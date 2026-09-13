import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_KEYS = [
  'EXOTEL_API_KEY', 'EXOTEL_API_TOKEN', 'EXOTEL_ACCOUNT_SID', 'EXOTEL_SUBDOMAIN', 'EXOTEL_CALLER_ID', 'EXOTEL_APP_ID',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN',
  'TRINETRA_WEBHOOK_BASE_URL',
  'exotel_mobile_did_cost_paisa', 'exotel_landline_did_cost_paisa',
  'twilio_US_local_cost_paisa', 'twilio_UK_local_cost_paisa', 'twilio_IN_mobile_cost_paisa',
  'trinetra_number_markup_percent', 'show_number_prices_to_users', 'max_phone_numbers_per_org'
]

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate super_admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Query system_config
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ALLOWED_KEYS)

    if (configError) {
      return NextResponse.json({ success: false, error: configError.message }, { status: 500 })
    }

    // 3. Mask API keys
    const configMap: Record<string, string> = {}
    const maskedKeys: string[] = []

    configs?.forEach(item => {
      let val = item.config_value
      if (
        item.config_key.endsWith('_API_KEY') || 
        item.config_key.endsWith('_AUTH_TOKEN') || 
        item.config_key.endsWith('_TOKEN') || 
        item.config_key.endsWith('_SID')
      ) {
        if (val && val.length > 4) {
          val = '•'.repeat(Math.max(8, val.length - 4)) + val.slice(-4)
        } else if (val) {
          val = '•'.repeat(8)
        }
        maskedKeys.push(item.config_key)
      }
      configMap[item.config_key] = val
    })

    return NextResponse.json({ success: true, data: { configs: configMap, masked_keys: maskedKeys } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Super admin check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { configs } = body
    
    if (!configs || typeof configs !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
    }
    
    // Use SERVICE ROLE client for system_config writes
    // Regular client may not have permission due to RLS
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    const results = []
    
    for (const [key, value] of Object.entries(configs)) {
      console.log('[Admin Config] Saving:', key, '=', typeof value === 'string' ? value.substring(0, 10) + '...' : value)
      
      const { data, error } = await serviceClient
        .from('system_config')
        .upsert({
          config_key: key,
          config_value: String(value),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'config_key'
        })
        .select()
      
      if (error) {
        console.error('[Admin Config] DB error for key:', key, error)
        return NextResponse.json({ 
          success: false, 
          error: `Failed to save ${key}: ${error.message}` 
        }, { status: 500 })
      }
      
      results.push({ key, saved: true })
    }
    
    // Log to audit_logs (non-critical — don't fail if this errors)
    try {
      await serviceClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'telephony_config_updated',
        resource_type: 'system_config',
        new_values: { keys_updated: Object.keys(configs) }
      })
    } catch (auditError) {
      console.warn('[Admin Config] Audit log failed (non-critical):', auditError)
    }
    
    // Try to clear backend cache (non-critical — don't fail if this errors)
    try {
      const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      await fetch(`${fastApiUrl}/api/telephony/cache/clear`, { method: 'POST' })
      console.log('[Admin Config] Backend cache cleared')
    } catch (cacheError) {
      console.warn('[Admin Config] Cache clear failed (non-critical):', cacheError)
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { updated_keys: Object.keys(configs) } 
    })
    
  } catch (error) {
    console.error('[Admin Telephony Config] POST error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
