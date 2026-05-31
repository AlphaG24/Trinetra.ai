import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { SettingsPageClient } from '@/src/components/pages/SettingsPageClient'

export const metadata = {
  title: 'Settings — Trinetra AI',
  description: 'Manage your profile, agent configuration, and integrations.',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)

  return <SettingsPageClient user={user} profile={profile} agents={agents || []} />
}
