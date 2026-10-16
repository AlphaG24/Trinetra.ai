import { NextResponse } from 'next/server'
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
    const supabaseAdmin = getAdminClient()

    let configRow: any = null
    try {
      const dbPromise = (supabaseAdmin as any)
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'topbar_announcement')
        .maybeSingle()
      const timeoutPromise = new Promise<any>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 1500)
      )
      const { data, error } = await Promise.race([dbPromise, timeoutPromise])
      if (!error && data?.config_value) {
        configRow = data
      }
    } catch {
      configRow = null
    }

    if (!configRow?.config_value) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_ANNOUNCEMENT,
      })
    }

    try {
      const parsed = JSON.parse(configRow.config_value)
      return NextResponse.json({
        success: true,
        data: {
          enabled: Boolean(parsed.enabled),
          tag: parsed.tag || DEFAULT_ANNOUNCEMENT.tag,
          text: parsed.text || DEFAULT_ANNOUNCEMENT.text,
          action_text: parsed.action_text || DEFAULT_ANNOUNCEMENT.action_text,
          action_url: parsed.action_url ?? DEFAULT_ANNOUNCEMENT.action_url,
        },
      })
    } catch {
      return NextResponse.json({
        success: true,
        data: DEFAULT_ANNOUNCEMENT,
      })
    }
  } catch {
    return NextResponse.json({
      success: true,
      data: DEFAULT_ANNOUNCEMENT,
    })
  }
}
