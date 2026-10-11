import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    let user: any = null
    try {
      const authPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 2500)
      )
      const authRes = await Promise.race([authPromise, timeoutPromise])
      user = authRes?.data?.user ?? null
    } catch {
      user = null
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()

    let notifs: any[] = []
    try {
      const dbPromise = admin
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), 2500)
      )
      const { data, error } = await Promise.race([dbPromise, timeoutPromise])
      if (!error && data) {
        notifs = data
      }
    } catch (dbErr) {
      console.warn('[/api/notifications GET] DB notice, returning fallback:', dbErr)
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
      })
    }

    const unreadCount = (notifs || []).filter((n: any) => !n.is_read).length

    return NextResponse.json({
      notifications: notifs || [],
      unreadCount,
    })
  } catch (err: any) {
    console.warn('[/api/notifications GET] Error, returning fallback:', err?.message || err)
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
}
