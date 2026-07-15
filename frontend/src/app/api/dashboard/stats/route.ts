import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { calculateROI } from '@/lib/utils/roiCalculator'
import { safeApiHandler } from '@/utils/apiAuth'

export const GET = safeApiHandler(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Real queries from database
  let total_calls = 0
  let minutes_used = 0
  let total_conversations = 0
  let appointments = 0
  let total_leads = 0

  try {
    const [{ count: callsCount }, { count: convCount }, { count: apptCount }, { count: leadsCount }] = await Promise.all([
      supabase.from('calls').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    
    total_calls = callsCount || 0
    total_conversations = convCount || 0
    appointments = apptCount || 0
    total_leads = leadsCount || 0
  } catch (err) {
    console.error("Database tables might not exist yet:", err)
  }

  const stats = {
    total_calls,
    minutes_used, // Will need a real aggregation query in the future
    total_conversations,
    resolution_rate: 0,
    appointments,
    appointments_week: 0,
    total_leads,
    qualified_leads: 0,
    active_now: 0,
    trends: {
      calls: 0,
      minutes: 0,
      conversations: 0,
      appointments: 0,
      leads: 0
    }
  }

  return NextResponse.json(stats)
})
