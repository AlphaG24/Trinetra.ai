import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { LeadsPageClient } from '@/src/components/pages/LeadsPageClient'
import { cleanAgentName } from '@/src/utils/formatAgentName'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Leads — Trinetra AI',
  description: 'Track and manage all leads captured by your AI agents.',
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user's actual agents
  const { data: dbAgents } = await supabase
    .from('agents')
    .select('id, name, agent_type, status')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('name', { ascending: true })

  const agents = (dbAgents || []).map((a: any) => ({
    id: a.id,
    name: cleanAgentName(a.name),
    agent_type: a.agent_type,
    status: a.status
  }))

  // Fetch leads for the current user
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <LeadsPageClient 
      initialLeads={leads || []} 
      agents={agents} 
    />
  )
}
