import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { ConversationsPageClient } from '@/src/components/pages/ConversationsPageClient'

export const metadata = {
  title: 'Conversations — Trinetra AI',
  description: 'All chat and WhatsApp conversations handled by your AI agents.',
}

export default async function ConversationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, agent_type')
    .eq('user_id', user.id)

  return <ConversationsPageClient agents={agents || []} />
}
