import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden: Admin role required', status: 403, supabase }
  }

  return { user, supabase }
}

export async function GET() {
  try {
    const { error, status, supabase } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    // Fetch official notifications (announcements)
    const { data: announcements, error: annErr } = await supabase
      .from('official_notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (annErr) throw annErr

    return NextResponse.json({ announcements: announcements || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { error, status, supabase } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { scope, title, message, type, target_id } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and Message are mandatory.' }, { status: 400 })
    }

    if (scope === 'global') {
      const { data, error: insertErr } = await supabase
        .from('official_notifications')
        .insert([{
          title,
          message,
          type: type || 'normal'
        }])
        .select()
        .single()

      if (insertErr) throw insertErr

      return NextResponse.json({ success: true, notification: data })
    } 
    
    if (scope === 'tenant') {
      if (!target_id) {
        return NextResponse.json({ error: 'Missing organization_id for tenant scope.' }, { status: 400 })
      }

      // Find all profiles for this organization
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', target_id)

      if (profErr) throw profErr

      if (!profiles || profiles.length === 0) {
        return NextResponse.json({ success: true, message: 'No active users found for this organization.' })
      }

      // Batch insert into notifications table
      const rows = profiles.map(p => ({
        user_id: p.id,
        title,
        message,
        type: type || 'info',
        is_read: false
      }))

      const { error: batchErr } = await supabase
        .from('notifications')
        .insert(rows)

      if (batchErr) throw batchErr

      return NextResponse.json({ success: true, recipients: profiles.length })
    }

    if (scope === 'user') {
      if (!target_id) {
        return NextResponse.json({ error: 'Missing user_id for user scope.' }, { status: 400 })
      }

      const { data, error: singleErr } = await supabase
        .from('notifications')
        .insert([{
          user_id: target_id,
          title,
          message,
          type: type || 'info',
          is_read: false
        }])
        .select()
        .single()

      if (singleErr) throw singleErr

      return NextResponse.json({ success: true, notification: data })
    }

    return NextResponse.json({ error: 'Invalid scope: global, tenant, or user required.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
