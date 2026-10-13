import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GlobalAnalyticsClient from '@/src/components/admin/GlobalAnalyticsClient'

export const metadata = {
  title: 'Global Analytics telemetry — Admin Control Center',
  description: 'View platform usage, financial aggregates, and cost allocations.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()

  // Verify Admin Role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch all voice calls, leads, invoices, and organizations across the platform
  const [
    { data: voiceCalls },
    { data: leads },
    { data: invoices },
    { data: organizations },
    { data: plans }
  ] = await Promise.all([
    supabase
      .from('voice_calls')
      .select('id, created_at, duration_seconds, status, sentiment, recording_url')
      .order('created_at', { ascending: true }),
    supabase
      .from('leads')
      .select('id, created_at, interest_level, lead_score'),
    supabase
      .from('invoices')
      .select('id, created_at, grand_total_paisa, subtotal_paisa, status, organization_id'),
    supabase
      .from('organizations')
      .select('id, name, plan_tier, created_at, is_active'),
    supabase
      .from('plans')
      .select('slug, name, price_monthly, price_annual')
  ])

  return (
    <GlobalAnalyticsClient 
      voiceCalls={voiceCalls || []} 
      leads={leads || []}
      invoices={invoices || []}
      organizations={organizations || []}
      plans={plans || []}
    />
  )
}
