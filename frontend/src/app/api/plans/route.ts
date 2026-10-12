import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const DEFAULT_TRIAL_PERSONALITIES = [
  {
    id: 'sales_agent',
    name: 'Sales Agent',
    role: 'Revenue Generation',
    description: 'An AI voice sales agent that calls prospects in natural Hinglish, handles objections, and closes deals.',
    iconBadge: '🎯',
    is_active: true
  },
  {
    id: 'appointment_agent',
    name: 'Appointment Booker',
    role: 'Calendar Automation',
    description: 'A precise, friendly AI appointment booking agent that collects details, confirms availability, and handles rescheduling.',
    iconBadge: '📅',
    is_active: true
  },
  {
    id: 'support_agent',
    name: 'Support Agent',
    role: '24/7 Issue Resolution',
    description: 'An empathetic AI customer support agent that troubleshoots step by step and handles customer inquiries with warmth.',
    iconBadge: '🎧',
    is_active: true
  },
  {
    id: 'lead_qualifier',
    name: 'Lead Qualifier',
    role: 'B2B Discovery',
    description: 'An AI lead qualification agent that asks BANT questions conversationally and scores leads automatically.',
    iconBadge: '⚡',
    is_active: true
  },
  {
    id: 'multi_agent',
    name: 'Multi-Personality Agent',
    role: 'Omnichannel AI',
    description: 'One AI agent that handles Sales, Support, Appointments, and Lead Qualification from a single phone number. Detects caller intent instantly.',
    iconBadge: '🔮',
    is_active: true
  },
  {
    id: 'anika-voice',
    name: 'Vikram - AI Voice Assistant',
    role: 'Enterprise Workflows',
    description: 'An enterprise conversational AI agent capable of managing voice and phone workflows.',
    iconBadge: '🤖',
    is_active: true
  }
]

const ROLE_MAP: Record<string, string> = {
  sales_agent: 'Revenue Generation',
  appointment_agent: 'Calendar Automation',
  support_agent: '24/7 Issue Resolution',
  lead_qualifier: 'B2B Discovery',
  multi_agent: 'Omnichannel AI',
  'anika-voice': 'Enterprise Workflows'
}

const ICON_MAP: Record<string, string> = {
  sales_agent: '🎯',
  appointment_agent: '📅',
  support_agent: '🎧',
  lead_qualifier: '⚡',
  multi_agent: '🔮',
  'anika-voice': '🤖'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_archived', false)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[Plans API] Error fetching plans:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 1. Fetch active marketplace voice agents directly from platform_services table
    let marketplaceVoicePersonalities = DEFAULT_TRIAL_PERSONALITIES
    try {
      const { data: voiceServices } = await supabase
        .from('platform_services')
        .select('id, slug, name, description, marketplace_metadata, is_active, is_visible_in_marketplace')
        .eq('type', 'voice')
        .eq('is_active', true)
        .eq('is_visible_in_marketplace', true)
        .order('name', { ascending: true })

      if (voiceServices && voiceServices.length > 0) {
        // Preferred ordering: sales_agent, appointment_agent, support_agent, lead_qualifier, multi_agent, anika-voice
        const orderPriority = ['sales_agent', 'appointment_agent', 'support_agent', 'lead_qualifier', 'multi_agent', 'anika-voice']
        const sorted = [...voiceServices].sort((a, b) => {
          const idxA = orderPriority.indexOf(a.slug)
          const idxB = orderPriority.indexOf(b.slug)
          if (idxA !== -1 && idxB !== -1) return idxA - idxB
          if (idxA !== -1) return -1
          if (idxB !== -1) return 1
          return a.name.localeCompare(b.name)
        })

        marketplaceVoicePersonalities = sorted.map(svc => {
          const meta = (svc.marketplace_metadata as any) || {}
          return {
            id: svc.slug,
            name: svc.name,
            role: ROLE_MAP[svc.slug] || (meta.tagline ? 'VOICE AGENT' : 'Autonomous Assistant'),
            description: svc.description || meta.tagline || 'Autonomous voice assistant.',
            iconBadge: ICON_MAP[svc.slug] || '🎙️',
            is_active: true
          }
        })
      }
    } catch (svcErr) {
      console.warn('[Plans API] Could not fetch voice services from platform_services:', svcErr)
    }

    // 2. Fetch dynamic trial personalities configured by administrator (if set)
    let trialPersonalities = marketplaceVoicePersonalities
    try {
      const { data: configRow } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'trial_agent_personalities')
        .maybeSingle()

      if (configRow && configRow.config_value) {
        const parsed = JSON.parse(configRow.config_value)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter to valid active items, ensuring old fictional roles (collections/survey) don't creep in
          const valid = parsed.filter((p: any) => p && p.is_active !== false && p.id !== 'collections' && p.id !== 'survey')
          if (valid.length > 0) {
            trialPersonalities = valid
          }
        }
      }
    } catch (confErr) {
      console.warn('[Plans API] Could not load dynamic trial personalities, using defaults:', confErr)
    }

    return NextResponse.json({ 
      plans: plans || [],
      trial_personalities: trialPersonalities
    })
  } catch (err: any) {
    console.error('[Plans API] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
