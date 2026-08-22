import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

// POST /api/admin/login
// Verifies the authenticated user has admin/super_admin role.
// The password field is an optional extra layer — if ADMIN_PASSWORD is set in env,
// the password must match. If not set, role-check alone is sufficient.
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated. Please log in first.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    // Optional extra password gate — only enforced if ADMIN_PASSWORD is configured
    const adminPassword = process.env.ADMIN_PASSWORD
    if (adminPassword) {
      const body = await req.json().catch(() => ({}))
      const { password } = body
      if (!password || password !== adminPassword) {
        return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
