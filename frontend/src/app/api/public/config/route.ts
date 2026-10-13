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
  "foreign_number_cost_usd_cents", "overage_per_minute_usd_cents",
  "starter_price_eur_cents", "professional_price_eur_cents",
  "enterprise_price_eur_cents", "trial_price_eur_cents",
  "foreign_number_cost_eur_cents", "overage_per_minute_eur_cents",
  "onboarding_fee_enabled", "onboarding_fee_paisa"
]

const DEFAULT_PUBLIC_CONFIGS: Record<string, string> = {
  maintenance_mode: 'false',
  free_demo_minutes: '10',
  trial_price_paisa: '9900',
  trial_days: '7',
  trial_minutes: '50',
  starter_price_paisa: '499900',
  starter_minutes: '500',
  professional_price_paisa: '1499900',
  professional_minutes: '2000',
  enterprise_price_paisa: '0',
  enterprise_minutes: '10000',
  max_agents_free: '1',
  max_agents_starter: '3',
  max_agents_professional: '10',
  inbound_number_cost_paisa: '49900',
  overage_per_minute_paisa: '1100',
  starter_price_usd_cents: '8900',
  professional_price_usd_cents: '24900',
  enterprise_price_usd_cents: '59900',
  trial_price_usd_cents: '500',
  foreign_number_cost_usd_cents: '1500',
  overage_per_minute_usd_cents: '12',
  starter_price_eur_cents: '7900',
  professional_price_eur_cents: '21900',
  enterprise_price_eur_cents: '49900',
  trial_price_eur_cents: '400',
  foreign_number_cost_eur_cents: '1500',
  overage_per_minute_eur_cents: '11',
  onboarding_fee_enabled: 'false',
  onboarding_fee_paisa: '0'
}

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
      return NextResponse.json({ configs: DEFAULT_PUBLIC_CONFIGS })
    }

    const configMap: Record<string, string> = { ...DEFAULT_PUBLIC_CONFIGS }
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

