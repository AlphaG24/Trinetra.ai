import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { safeApiHandler } from '@/utils/apiAuth'

export const PATCH = safeApiHandler(async (req: Request) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any = null
  try {
    body = await req.json()
  } catch {
    // Empty body is acceptable; defaults to marking all read
  }

  const query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)

  if (body?.id) {
    query.eq('id', body.id)
  } else {
    query.eq('is_read', false)
  }

  const { error } = await query

  if (error) {
    console.error('Failed to update notifications:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
