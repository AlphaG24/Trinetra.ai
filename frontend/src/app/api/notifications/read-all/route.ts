import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { safeApiHandler } from '@/utils/apiAuth'

export const PATCH = safeApiHandler(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .rpc('mark_all_notifications_read', { p_user_id: user.id })

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
