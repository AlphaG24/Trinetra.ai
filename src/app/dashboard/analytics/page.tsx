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

  return <AnalyticsPageClient />
}
