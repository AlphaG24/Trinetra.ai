import { createClient } from '@/utils/supabase/server'
import { MarketplaceMarketingClient } from '@/src/components/marketplace/MarketplaceMarketingClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'AI Agent Marketplace — Vaakriti AI',
  description: 'Deploy sovereign autonomous voice agents and enterprise workflows in 60 seconds.',
}

const FALLBACK_SERVICES = [
  {
    id: 'tpl-sales',
    name: 'Sales Agent',
    slug: 'sales_agent',
    type: 'voice',
    description: 'An AI voice sales agent that calls prospects in natural Hinglish, handles every objection, and closes with a concrete next step.',
    status: 'live',
    is_active: true,
    marketplace_metadata: {
      category: 'Sales & Conversion',
      personality: 'Warm, confident, persuasive',
      language: 'Hinglish (Hindi + English)',
      pricing_tier: 'starter',
      tagline: 'Converts inbound prospects with natural Hinglish sales conversations',
      features: [
        'Natural conversational objection handling',
        'Direct CRM lead scoring & sync',
        'Post-call WhatsApp summary dispatch',
      ]
    }
  },
  {
    id: 'tpl-support',
    name: 'Customer Support Agent',
    slug: 'support_agent',
    type: 'voice',
    description: 'An empathetic AI customer support agent that troubleshoots step by step, handles angry customers with warmth, and escalates to humans when needed.',
    status: 'live',
    is_active: true,
    marketplace_metadata: {
      category: 'Customer Support',
      personality: 'Empathetic, calm, solution-oriented',
      language: 'Hinglish + Hindi + English',
      pricing_tier: 'starter',
      tagline: '24/7 multilingual customer support with seamless human escalation',
      features: [
        '24/7 first-ring resolution',
        'Dynamic human agent call transfer',
        'Zendesk & Freshdesk ticketing sync',
      ]
    }
  },
  {
    id: 'tpl-appointment',
    name: 'Appointment Booker',
    slug: 'appointment_agent',
    type: 'voice',
    description: 'A proactive booking agent that checks slot availability, confirms dates and times, handles reschedule requests, and syncs directly to your calendar.',
    status: 'live',
    is_active: true,
    marketplace_metadata: {
      category: 'Operations & Booking',
      personality: 'Organized, polite, efficient',
      language: 'Hinglish + English',
      pricing_tier: 'starter',
      tagline: 'Automates scheduling and calendar bookings effortlessly',
      features: [
        'Natural conversational slot booking',
        'Direct Cal.com & Google Calendar sync',
        'Automatic SMS reminders and reschedule handling',
      ]
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
    marketplace_metadata: {
      category: 'Sales & Conversion',
      personality: 'Sharp, inquisitive, professional',
      language: 'Hinglish + English',
      pricing_tier: 'starter',
      tagline: 'Scores and qualifies inbound leads under 60 seconds',
      features: [
        'Sub-60s rapid qualification',
        'Budget and timeline verification',
        'Instant webhook routing to Slack & CRM',
      ]
    }
  }
]

export default async function MarketplacePage() {
  let services = FALLBACK_SERVICES

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('platform_services')
      .select('*')
      .eq('is_visible_in_marketplace', true)
      .order('name', { ascending: true })

    if (!error && data && data.length > 0) {
      services = data
    }
  } catch (err) {
    console.error("Failed to load platform services from database:", err)
  }

  return <MarketplaceMarketingClient initialServices={services} />
}
