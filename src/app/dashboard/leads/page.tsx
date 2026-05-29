import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { LeadsPageClient } from '@/src/components/pages/LeadsPageClient'

export const metadata = {
  title: 'Leads — Trinetra AI',
  description: 'Track and manage all leads captured by your AI agents.',
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <LeadsPageClient initialLeads={leads || []} />
}
