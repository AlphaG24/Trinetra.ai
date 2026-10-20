import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ToolDetailClient } from '@/src/components/marketplace/ToolDetailClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: service } = await supabase
    .from('platform_services')
    .select('name, description, marketplace_metadata')
    .eq('slug', slug)
    .maybeSingle()

  if (!service) {
    return {
      title: 'Agent Not Found — Vaakriti AI',
    }
  }

  const tagline = service.marketplace_metadata?.tagline || service.description || 'AI Agent'
  return {
    title: `${service.name} — AI Agent Marketplace`,
    description: tagline,
  }
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Fetch platform service by slug
  const { data: service, error: serviceErr } = await supabase
    .from('platform_services')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (serviceErr || !service) {
    notFound()
  }

  // 2. Fetch authenticated profile & agents if session exists
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  let agents: any[] = []

  if (user) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    profile = userProfile

    if (profile?.organization_id) {
      const { data: userAgents } = await supabase
        .from('agents')
        .select('*')
        .eq('organization_id', profile.organization_id)
      agents = userAgents || []
    }
  }

  // 3. Fetch system configuration values (demo minutes, trial price etc)
  const { data: configs } = await supabase
    .from('system_config')
    .select('config_key, config_value')

  const configMap = (configs || []).reduce((acc, curr) => {
    if (curr.config_key) {
      acc[curr.config_key] = curr.config_value || ''
    }
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] font-sans selection:bg-blue-500/20 pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ToolDetailClient 
          tool={service} 
          profile={profile} 
          config={configMap} 
          agents={agents}
        />
      </div>
    </div>
  )
}
