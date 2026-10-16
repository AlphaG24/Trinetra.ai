import { createClient } from '@/lib/server'
import { createAdminClient } from '@/utils/supabase/admin'
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

  // Step 1: Check auth per SEC-003
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login?error=session_expired')
  }

  // Step 2: Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const isPrivileged = ['developer_tester', 'admin', 'super_admin'].includes(profile?.role || '')

  if (!profile?.organization_id && !isPrivileged) {
    redirect('/dashboard/onboarding')
  }
  
  // Step 3: Fetch agent using admin client on server component (TRI-001)
  const adminClient = createAdminClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  let baseAgent = null

  let query = adminClient
    .from('agents')
    .select(`
      *,
      agent_phone_numbers (
        is_primary,
        phone_numbers (
          id,
          phone_number,
          status,
          organization_id,
          renewal_date,
          validity_days,
          provisioned_at
        )
      )
    `)

  if (isUuid) {
    query = query.or(`id.eq.${slug},vapi_agent_id.eq.${slug}`)
  } else {
    query = query.eq('vapi_agent_id', slug)
  }

  // Privileged users (developer_tester/admin) can manage all workspace agents
  if (!isPrivileged) {
    if (profile?.organization_id) {
      query = query.or(`organization_id.eq.${profile.organization_id},user_id.eq.${user.id}`)
    } else {
      query = query.eq('user_id', user.id)
    }
  }

  const { data: agentData } = await query.maybeSingle()
  baseAgent = agentData

  if (!baseAgent) {
    return notFound()
  }

  // Pre-fetch recent call logs for this agent
  let initialCallLogs: any[] = []
  if (baseAgent.id) {
    const { data: calls } = await adminClient
      .from('voice_calls')
      .select('id, duration_seconds, sentiment, transcript, recording_url, created_at')
      .eq('agent_id', baseAgent.id)
      .order('created_at', { ascending: false })
      .limit(20)
    initialCallLogs = calls || []
  }

  return (
    <AgentDetailPageClient 
      agentId={baseAgent.id} 
      initialAgent={baseAgent} 
      initialProfile={profile} 
      initialCallLogs={initialCallLogs}
    />
  )
}
