import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Reusable admin client singleton to avoid socket/handshake thrashing
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

// In-memory cache for public system configs (TTL: 60 seconds)
let cachedConfigs: Record<string, string> | null = null
let cacheExpiresAt = 0

const PUBLIC_KEYS = [
  "maintenance_mode",
  "free_demo_minutes", "trial_price_paisa", "trial_days", 
  "trial_minutes", "starter_price_paisa", "starter_minutes", 
  "professional_price_paisa", "professional_minutes",
  "enterprise_price_paisa", "enterprise_minutes",
  "max_agents_free", "max_agents_starter", "max_agents_professional",
  "inbound_number_cost_paisa", "overage_per_minute_paisa",
  "starter_price_usd_cents", "professional_price_usd_cents",
  "enterprise_price_usd_cents", "trial_price_usd_cents",
  "foreign_number_cost_usd_cents", "overage_per_minute_usd_cents"
]

export async function GET() {
  const now = Date.now()

  // Return from memory cache if fresh
  if (cachedConfigs && now < cacheExpiresAt) {
    return NextResponse.json(
      { configs: cachedConfigs },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  }

  try {
    const supabaseAdmin = getAdminClient()

    // Query all public settings from system_config table
    const { data: configs, error } = await supabaseAdmin
      .from('system_config')
      .select('config_key, config_value')

    if (error) {
      // If DB is busy but we have stale cache, return stale cache gracefully
      if (cachedConfigs) {
        return NextResponse.json({ configs: cachedConfigs })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const configMap: Record<string, string> = {}
    ;(configs as any[])?.forEach((item: any) => {
      if (item && PUBLIC_KEYS.includes(item.config_key)) {
        configMap[item.config_key] = item.config_value
      }
    })

    cachedConfigs = configMap
    cacheExpiresAt = now + 60000 // 60 seconds TTL

    return NextResponse.json(
      { configs: configMap },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (error: any) {
    if (cachedConfigs) {
      return NextResponse.json({ configs: cachedConfigs })
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

