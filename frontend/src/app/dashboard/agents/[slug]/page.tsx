import { createClient } from '@/lib/server'
import { redirect, notFound } from 'next/navigation'
import { AgentDetailPageClient } from './AgentDetailPageClient'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ToolOrAgentPage({ params }: PageProps) {
  const { slug } = await params
  
  const supabase = await createClient()

  // Step 1: Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login?error=session_expired')
  }

  // Step 2: Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    redirect('/dashboard/onboarding')
  }
  
  // Step 3: Fetch agent within organization context
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  let baseAgent = null

  if (isUuid) {
    const { data } = await supabase
      .from('agents')
      .select(`
        *,
        agent_phone_numbers (
          is_primary,
          phone_numbers (
            phone_number
          )
        )
      `)
      .or(`id.eq.${slug},vapi_agent_id.eq.${slug}`)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()
    baseAgent = data
  } else {
    const { data } = await supabase
      .from('agents')
      .select(`
        *,
        agent_phone_numbers (
          is_primary,
          phone_numbers (
            phone_number
          )
        )
      `)
      .eq('vapi_agent_id', slug)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()
    baseAgent = data
  }

  if (!baseAgent) {
    return notFound()
  }

  return (
    <AgentDetailPageClient 
      agentId={baseAgent.id} 
      initialAgent={baseAgent} 
      initialProfile={profile} 
    />
  )
}
