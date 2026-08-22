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

  // Fetch all voice calls and leads across the entire platform
  const [
    { data: voiceCalls },
    { data: leads }
  ] = await Promise.all([
    supabase
      .from('voice_calls')
      .select('id, created_at, duration_seconds, status, sentiment, recording_url')
      .order('created_at', { ascending: true }),
    supabase
      .from('leads')
      .select('id, created_at, interest_level, lead_score')
  ])

  return (
    <GlobalAnalyticsClient 
      voiceCalls={voiceCalls || []} 
      leads={leads || []} 
    />
  )
}
