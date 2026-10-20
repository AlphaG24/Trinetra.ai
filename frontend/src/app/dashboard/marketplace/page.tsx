import { createClient } from '@/lib/server'
import { MarketplaceListingClient } from '@/src/components/marketplace/MarketplaceListingClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'AI Agent Marketplace — Vaakriti AI',
  description: 'Deploy AI agents on Vaakriti AI Marketplace in 60 seconds.',
}

const FALLBACK_SERVICES = [
  {
    id: 'tpl-sales',
    name: 'Sales Agent',
    slug: 'sales_agent',
    type: 'voice',
    description: 'An AI voice sales agent that calls prospects in natural Hinglish, handles every objection, and closes with a concrete next step.',
    status: 'live',
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Sales',
      personality: 'Warm, confident, persuasive',
      language: 'Hinglish (Hindi + English)',
      pricing_tier: 'starter',
      tagline: 'Converts prospects with natural Hinglish sales conversations',
    }
  },
  {
    id: 'tpl-support',
    name: 'Support Agent',
    slug: 'support_agent',
    type: 'voice',
    description: 'An empathetic AI customer support agent that troubleshoots step by step, handles angry customers with warmth, and escalates to humans when needed.',
    status: 'live',
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Support',
      personality: 'Empathetic, calm, solution-oriented',
      language: 'Hinglish + Hindi + English',
      pricing_tier: 'starter',
      tagline: '24/7 multilingual customer support with human escalation',
    }
  },
  {
    id: 'tpl-appointment',
    name: 'Appointment Booker',
    slug: 'appointment_agent',
    type: 'voice',
    description: 'A proactive booking agent that checks slot availability, confirms dates and times, handles reschedule requests, and syncs directly to your calendar.',
    status: 'live',
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Operations',
      personality: 'Organized, polite, efficient',
      language: 'Hinglish + English',
      pricing_tier: 'starter',
      tagline: 'Automates scheduling and calendar bookings effortlessly',
    }
  },
  {
    id: 'tpl-lead',
    name: 'Lead Qualifier',
    slug: 'lead_qualifier',
    type: 'voice',
    description: 'A rapid qualification agent that asks the 4 key BANT questions, scores intent, and routes high-value opportunities to your sales reps in real time.',
    status: 'live',
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Sales',
      personality: 'Sharp, inquisitive, professional',
      language: 'Hinglish + English',
      pricing_tier: 'starter',
      tagline: 'Scores and qualifies inbound leads under 60 seconds',
    }
  }
]

export default async function MarketplacePage() {
  let services: any[] = []

  try {
    const supabase = await createClient()
    const dbPromise = supabase
      .from('platform_services')
      .select('*')
      .eq('is_visible_in_marketplace', true)
      .order('name', { ascending: true })

    const timeoutPromise = new Promise<any>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 2000)
    )

    const { data, error } = await Promise.race([dbPromise, timeoutPromise])

    if (!error && data && data.length > 0) {
      services = data
    } else {
      services = FALLBACK_SERVICES
    }
  } catch {
    services = FALLBACK_SERVICES
  }

  return (
    <MarketplaceListingClient
      initialTools={services}
      errorOccurred={false}
      errorMessage=""
    />
  )
}
