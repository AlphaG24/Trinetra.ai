import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { DeployPageClient } from '@/src/components/pages/DeployPageClient'

export const metadata = {
  title: 'Deploy Custom AI — Trinetra AI',
  description: 'Deploy your custom voice and chat agents to production.',
}

export default async function DeployPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch active platform services
  const { data: services } = await supabase
    .from('platform_services')
    .select('*')
    .eq('is_visible_in_marketplace', true)
    .order('name', { ascending: true })

  return <DeployPageClient user={user} services={services || []} />
}
