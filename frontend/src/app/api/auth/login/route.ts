import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      const msg = error.message || 'Invalid email or password.'
      return NextResponse.json({ error: msg }, { status: error.status || 401 })
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at,
      },
    })
  } catch (err: any) {
    console.error('[/api/auth/login] Server login error:', err)
    return NextResponse.json({ error: 'Authentication service temporarily unavailable. Please try again.' }, { status: 500 })
  }
}
