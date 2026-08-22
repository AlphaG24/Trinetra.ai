import { createClient } from '@/lib/server'
import { redirect, notFound } from 'next/navigation'
import { AgentSetupWizardClient } from '@/src/components/agents/AgentSetupWizardClient'

interface PageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    bundle?: string
  }>
}

export default async function AgentSetupPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { bundle } = await searchParams
  
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login?error=session_expired')
  }

  // 2. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.organization_id) {
    redirect('/dashboard/onboarding')
  }

  // 3. Fetch agent
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  let agent = null

  if (isUuid) {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('id', slug)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()
    agent = data
  } else {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('vapi_agent_id', slug)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()
    agent = data
  }

  if (!agent) {
    return notFound()
  }

  // Load all agents in organization if bundle mode
  let bundleAgents: any[] = []
  if (bundle === 'true') {
    const { data: agentsData } = await supabase
      .from('agents')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .neq('status', 'deleted')
    bundleAgents = agentsData || []
  }

  return (
    <AgentSetupWizardClient 
      agent={agent} 
      profile={profile} 
      bundleAgents={bundleAgents}
    />
  )
}
