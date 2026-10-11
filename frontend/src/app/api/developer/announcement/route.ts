import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-helpers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

let supabaseAdminSingleton: ReturnType<typeof createSupabaseClient> | null = null

function getAdminClient() {
  if (!supabaseAdminSingleton) {
    supabaseAdminSingleton = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseAdminSingleton
}

const DEFAULT_ANNOUNCEMENT = {
  enabled: false,
  tag: 'PLATFORM',
  text: 'How Autonomous Voice Agents handle complex Indian calls',
  action_text: 'Experience Live',
  action_url: '',
}

export async function GET() {
  try {
    const { authenticated, profile } = await authenticateRequest()
    if (!authenticated || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['developer_tester', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseAdmin = getAdminClient()
    const { data } = await (supabaseAdmin as any)
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'topbar_announcement')
      .maybeSingle()

    let config = { ...DEFAULT_ANNOUNCEMENT }
    if (data?.config_value) {
      try {
        const parsed = JSON.parse(data.config_value)
        config = {
          enabled: Boolean(parsed.enabled),
          tag: parsed.tag || DEFAULT_ANNOUNCEMENT.tag,
          text: parsed.text || DEFAULT_ANNOUNCEMENT.text,
          action_text: parsed.action_text || DEFAULT_ANNOUNCEMENT.action_text,
          action_url: parsed.action_url ?? DEFAULT_ANNOUNCEMENT.action_url,
        }
      } catch {
        // fallback
      }
    }

    return NextResponse.json({
      success: true,
      data: config,
      default: DEFAULT_ANNOUNCEMENT,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile } = await authenticateRequest()
    if (!authenticated || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['developer_tester', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
    }

    const { enabled, tag, text, action_text, action_url } = body

    const cleanConfig = {
      enabled: Boolean(enabled),
      tag: String(tag || 'PLATFORM').trim().slice(0, 30),
      text: String(text || '').trim().slice(0, 200),
      action_text: String(action_text || 'Experience Live').trim().slice(0, 50),
      action_url: String(action_url || '').trim().slice(0, 200),
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }

    // Fallback safeguard: if enabled is true but text is empty, disable custom mode
    if (cleanConfig.enabled && !cleanConfig.text) {
      cleanConfig.enabled = false
      cleanConfig.tag = DEFAULT_ANNOUNCEMENT.tag
      cleanConfig.text = DEFAULT_ANNOUNCEMENT.text
      cleanConfig.action_text = DEFAULT_ANNOUNCEMENT.action_text
    }

    const supabaseAdmin = getAdminClient()
    const { error: upsertError } = await (supabaseAdmin as any)
      .from('system_config')
      .upsert(
        {
          config_key: 'topbar_announcement',
          config_value: JSON.stringify(cleanConfig),
          description: 'Top announcement or offer banner configured via Developer Marketing Portal',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'config_key' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: cleanConfig,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
