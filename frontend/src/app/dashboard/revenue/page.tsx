import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { RevenueDashboardClient } from '@/src/components/dashboard/revenue/RevenueDashboardClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Revenue from Trinetra — Trinetra AI',
  description: 'Track estimated pipeline, owner-confirmed revenue, source attribution, and return on investment.',
}

export default async function RevenuePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return <RevenueDashboardClient />
}
