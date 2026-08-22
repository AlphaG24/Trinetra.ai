import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { safeApiHandler } from '@/utils/apiAuth'

async function authorizeAdmin(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { authorized: false, errorResponse: NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 }) }
  }

  return { authorized: true, user }
}

export const DELETE = safeApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ phoneNumber: string }> }
) => {
  const { phoneNumber } = await params
  const supabase = await createClient()
  const { authorized, errorResponse } = await authorizeAdmin(supabase)
  if (!authorized) return errorResponse!

  const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
  const res = await fetch(`${fastApiUrl}/api/dnd/${encodeURIComponent(phoneNumber)}`, {
    method: 'DELETE'
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data.detail || 'Failed to remove number from DND' }, { status: res.status })
  }

  return NextResponse.json(data)
})
