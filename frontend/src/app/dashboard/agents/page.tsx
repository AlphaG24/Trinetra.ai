import type { Metadata } from 'next'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { MarketplaceGrid } from '@/src/components/marketplace/MarketplaceGrid'

export const metadata: Metadata = {
  title: 'AI Marketplace — Deploy Autonomous Agents',
  description:
    'Browse and deploy custom autonomous AI agents, voice workflows, and intelligent automation tools. Explore the Trinetra AI marketplace for self-healing business solutions.',
  openGraph: {
    title: 'AI Marketplace — Deploy Autonomous Agents | Trinetra AI',
    description:
      'Browse and deploy custom autonomous AI agents, voice workflows, and intelligent automation tools.',
  },
}

export default async function AgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all platform services visible in marketplace
  const { data: services } = await supabase
    .from('platform_services')
    .select('*')
    .eq('is_visible_in_marketplace', true)
    .order('name', { ascending: true })

  return <MarketplaceGrid tools={services || []} />
}
