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
    id: 'tpl-appointment',
    name: 'Appointment Booker',
    slug: 'appointment_agent',
    type: 'voice',
    description: 'A proactive booking agent that checks slot availability, confirms dates and times, handles reschedule requests, and syncs directly to your calendar.',
    status: 'live',
    is_active: true,
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
    is_active: true,
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Sales',
      personality: 'Sharp, inquisitive, professional',
      language: 'Hinglish + English',
      pricing_tier: 'starter',
      tagline: 'Scores and qualifies inbound leads under 60 seconds',
    }
  },
  {
    id: 'tpl-msme',
    name: 'MSME Scheme Navigator',
    slug: 'msme-navigator',
    type: 'finance',
    description: 'Find government subsidies, low-interest credit schemes, and grants that your business qualifies for across India.',
    status: 'coming_soon',
    is_active: false,
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Finance',
      personality: 'Analytical, regulatory-aware',
      language: 'English + Hindi',
      pricing_tier: 'starter',
      tagline: 'Find grants you did not know you qualified for.',
    }
  },
  {
    id: 'tpl-multi',
    name: 'Multi-Personality Agent',
    slug: 'multi_agent',
    type: 'voice',
    description: 'One number, all capabilities — dynamically routes sales, support, and scheduling conversations based on caller intent.',
    status: 'live',
    is_active: true,
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Operations',
      personality: 'Adaptive, versatile, intent-aware',
      language: 'Hinglish + Hindi + English',
      pricing_tier: 'professional',
      tagline: 'One number, all capabilities — intent-aware AI for every caller',
    }
  },
  {
    id: 'tpl-sales',
    name: 'Sales Agent',
    slug: 'sales_agent',
    type: 'voice',
    description: 'An AI voice sales agent that calls prospects in natural Hinglish, handles every objection, and closes with a concrete next step.',
    status: 'live',
    is_active: true,
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
    is_active: true,
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Support',
      personality: 'Empathetic, calm, solution-oriented',
      language: 'Hinglish + Hindi + English',
      pricing_tier: 'starter',
      tagline: 'Resolves customer issues with empathy and precision',
    }
  },
  {
    id: 'tpl-triscrap',
    name: 'Triscrap',
    slug: 'triscrap',
    type: 'ocr',
    description: 'Turn messy financial documents and scanned invoices into structured tabular data instantly.',
    status: 'coming_soon',
    is_active: false,
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'OCR',
      personality: 'Automated document extraction',
      language: 'Universal',
      pricing_tier: 'starter',
      tagline: 'Turn messy documents into structured data instantly.',
    }
  },
  {
    id: 'tpl-vikram',
    name: 'Vikram - AI Voice Assistant',
    slug: 'anika-voice',
    type: 'voice',
    description: 'Self-healing conversational AI assistant capable of managing appointments, qualification, and phone workflows.',
    status: 'live',
    is_active: true,
    is_visible_in_marketplace: true,
    marketplace_metadata: {
      category: 'Enterprise',
      personality: 'Professional, calm, resilient',
      language: 'Hinglish + English',
      pricing_tier: 'enterprise',
      tagline: 'Self-healing conversational AI for scheduling and enterprise voice.',
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
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 5000)
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
