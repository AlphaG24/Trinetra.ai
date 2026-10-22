import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { LeadsPageClient } from '@/src/components/pages/LeadsPageClient'
import { cleanAgentName } from '@/src/utils/formatAgentName'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Leads — Vaakriti AI',
  description: 'Track and manage all leads captured by your AI agents.',
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const userEmail = (user.email || '').toLowerCase().trim()
  const isSuperAdmin = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai'

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  const isPrivileged = isSuperAdmin || ['developer_tester', 'admin', 'super_admin'].includes(profile?.role || '')
  const orgId = profile?.organization_id || (isSuperAdmin ? 'b1ddf1e9-abc1-4ff4-90f5-3ac66913738a' : null)

  // Fetch agents
  let agentQuery = supabase
    .from('agents')
    .select('id, name, agent_type, status')
    .neq('status', 'deleted')
    .order('name', { ascending: true })

  if (!isPrivileged) {
    if (orgId) {
      agentQuery = agentQuery.or(`user_id.eq.${user.id},organization_id.eq.${orgId}`)
    } else {
      agentQuery = agentQuery.eq('user_id', user.id)
    }
  }

  const { data: dbAgents } = await agentQuery

  const agents = (dbAgents || []).map((a: any) => ({
    id: a.id,
    name: cleanAgentName(a.name),
    agent_type: a.agent_type,
    status: a.status
  }))

  // Fetch leads
  let leadQuery = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (!isPrivileged) {
    if (orgId) {
      leadQuery = leadQuery.or(`user_id.eq.${user.id},organization_id.eq.${orgId}`)
    } else {
      leadQuery = leadQuery.eq('user_id', user.id)
    }
  }

  const { data: leads } = await leadQuery

  // Fetch revenue events
  let revQuery = supabase
    .from('revenue_events')
    .select('id, lead_id, call_id, quoted_amount, won_amount, deal_status, price_type, source')

  if (!isPrivileged) {
    revQuery = revQuery.eq('business_id', user.id)
  }

  const { data: revenueEvents } = await revQuery

  return (
    <LeadsPageClient 
      initialLeads={leads || []} 
      agents={agents} 
      initialRevenueEvents={revenueEvents || []}
    />
  )
}
