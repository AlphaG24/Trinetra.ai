import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { AnalyticsPageClient } from '@/src/components/pages/AnalyticsPageClient'

export const metadata = {
  title: 'Analytics — Trinetra AI',
  description: 'In-depth analytics across all your AI agent interactions.',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all active platform services
  const { data: services } = await supabase
    .from('platform_services')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <AnalyticsPageClient 
      userId={user.id} 
      initialServices={services || []} 
    />
  )
}
