import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: activities, error } = await supabase
      .from('activity_log')
      .select('id, activity_type, channel, title, description, reference_id, reference_type, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[/api/dashboard/activity] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 400 })
    }

    return NextResponse.json({ activities: activities || [] })
  } catch (err: any) {
    console.error('[/api/dashboard/activity] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
