import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import IntegrationsPageClient from '@/src/components/pages/IntegrationsPageClient'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, telegram_chat_id')
    .eq('id', user.id)
    .single()

  // Fetch all agents for this user to show their integration statuses
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, agent_type, telegram_chat_id, enable_telegram_alerts, crm_sync_enabled, webhook_url, is_active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <IntegrationsPageClient 
      agents={agents || []}
      userId={user.id}
    />
  )
}
