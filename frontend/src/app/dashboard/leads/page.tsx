import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { LeadsPageClient } from '@/src/components/pages/LeadsPageClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Leads — Trinetra AI',
  description: 'Track and manage all leads captured by your AI agents.',
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch active platform services
  const { data: services } = await supabase
    .from('platform_services')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Fetch user profile to get organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  // Fetch leads for the current user
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

     
  return (
    <LeadsPageClient 
      initialLeads={leads || []} 
      services={services || []} 
    />
  )
}
