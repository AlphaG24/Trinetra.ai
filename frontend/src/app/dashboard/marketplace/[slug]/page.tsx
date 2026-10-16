import Link from 'next/link'
import { AlertTriangle, Bot, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/server'
import { ToolDetailClient } from '@/src/components/marketplace/ToolDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface MarketplaceDetailPageProps {
  params: Promise<{ slug: string }>
}

const FALLBACK_SERVICES: Record<string, any> = {
  appointment_agent: {
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
      features: [
        'Natural conversational slot booking',
        'Direct calendar synchronization',
        'Automatic SMS and WhatsApp reminders',
        'Rescheduling and cancellation handling',
      ],
      use_cases: ['Clinic and doctor appointments', 'Salon and spa bookings', 'Real estate site visits', 'Enterprise demo scheduling'],
    }
  },
  sales_agent: {
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
      features: ['BANT objection handling', 'Automatic language switching', 'Trial close techniques'],
      use_cases: ['Inbound sales', 'Outbound prospecting', 'Cold outreach follow-up'],
    }
  },
  support_agent: {
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
      features: ['Multi-turn troubleshooting', 'Ticket creation and lookup', 'Live human escalation'],
      use_cases: ['Customer service hotline', 'Order status inquiries', 'Technical troubleshooting'],
    }
  },
  lead_qualifier: {
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
      features: ['BANT scoring framework', 'Instant webhook push to CRM', 'Callback scheduling for hot leads'],
      use_cases: ['Inbound marketing leads', 'Event attendee follow-ups', 'Website enquiry forms'],
    }
  }
}

export default async function MarketplaceDetailPage({ params }: MarketplaceDetailPageProps) {
  const { slug } = await params
  let tool: any = null
  let profile: any = null
  let systemConfig: Record<string, string> = {}
  let agents: any[] = []
  let is404 = false

  try {
    const supabase = await createClient()

    // 1. Fetch single tool by slug or ID with 2000ms timeout
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    let toolQuery = supabase.from('platform_services').select('*')
    if (isUuid) {
      toolQuery = toolQuery.or(`slug.eq.${slug},id.eq.${slug}`)
    } else {
      toolQuery = toolQuery.eq('slug', slug)
    }

    const timeoutPromise = new Promise<any>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 2000)
    )
    const { data: toolData } = await Promise.race([toolQuery.maybeSingle(), timeoutPromise])

    if (toolData) {
      tool = toolData
    } else if (FALLBACK_SERVICES[slug]) {
      tool = FALLBACK_SERVICES[slug]
    } else {
      is404 = true
    }

    if (tool) {
      // 2. Fetch authenticated user profile safely with timeout
      try {
        const authPromise = supabase.auth.getUser().catch(() => ({ data: { user: null } }))
        const authTimeout = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: { user: null } }), 1500)
        )
        const { data: authData } = await Promise.race([authPromise, authTimeout])
        const user = authData?.user

        if (user) {
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
            .then(res => res)
            .catch(() => ({ data: null }))
          const profileTimeout = new Promise<any>((resolve) =>
            setTimeout(() => resolve({ data: null }), 1500)
          )
          const { data: profileData } = await Promise.race([profilePromise, profileTimeout])
          profile = profileData

          const agentsPromise = supabase
            .from('agents')
            .select('*')
            .eq('user_id', user.id)
            .then(res => res)
            .catch(() => ({ data: [] }))
          const agentsTimeout = new Promise<any>((resolve) =>
            setTimeout(() => resolve({ data: [] }), 1500)
          )
          const { data: agentsData } = await Promise.race([agentsPromise, agentsTimeout])
          agents = agentsData || []
        }
      } catch {}

      // 3. Fetch system config keys safely with timeout
      try {
        const configPromise = supabase
          .from('system_config')
          .select('config_key, config_value')
          .then(res => res)
          .catch(() => ({ data: null }))
        const configTimeout = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: null }), 1500)
        )
        const { data: configData } = await Promise.race([configPromise, configTimeout])
        if (configData) {
          systemConfig = configData.reduce((acc: any, cur: any) => {
            acc[cur.config_key] = cur.config_value
            return acc
          }, {})
        }
      } catch {}
    }
  } catch {
    if (FALLBACK_SERVICES[slug]) {
      tool = FALLBACK_SERVICES[slug]
    } else {
      is404 = true
    }
  }

  // 404 State
  if (is404) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] shadow-sm">
          <Bot className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-display text-[var(--heading)]">Tool Not Found</h2>
          <p className="text-xs text-[var(--body)] font-merriweather max-w-xs mx-auto">
            The AI agent &ldquo;{slug}&rdquo; could not be located in our marketplace.
          </p>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Browse Marketplace
        </Link>
      </div>
    )
  }

  // Error State
  if (errorOccurred) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-red-500 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-display text-[var(--heading)]">Database Connection Error</h2>
          <p className="text-xs text-[var(--body)] font-merriweather max-w-xs mx-auto">
            {errorMessage || 'Unable to retrieve tool detail at this time.'}
          </p>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Marketplace
        </Link>
      </div>
    )
  }

  return (
    <ToolDetailClient
      tool={tool}
      profile={profile}
      config={systemConfig}
      agents={agents}
    />
  )
}