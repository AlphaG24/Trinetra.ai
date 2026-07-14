import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  // SECURITY: Use getUser() instead of getSession() — getSession() trusts
  // the client JWT without server validation, making it vulnerable to forgery.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: body.full_name,
        phone: body.phone,
        company_name: body.company_name,
        business_type: body.business_type,
        city: body.city,
        state: body.state,
        language: body.language,
        gst_number: body.gst_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/settings/profile]', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
