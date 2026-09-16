import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { CallsPageClient } from '@/src/components/pages/CallsPageClient'

import { cleanAgentName } from '@/src/utils/formatAgentName'

export const metadata = {
  title: 'Voice Calls — Trinetra AI',
  description: 'Full history of all voice calls handled by your AI agents.',
}

export default async function CallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, agent_type')
    .eq('user_id', user.id)
    .eq('agent_type', 'voice')

  if (!agents || agents.length === 0) {
    redirect('/dashboard')
  }

  const cleanedAgents = (agents || []).map((a: any) => ({
    ...a,
    name: cleanAgentName(a.name)
  }))

  return <CallsPageClient agents={cleanedAgents} />
}
