import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut().catch(() => {})

    // Collect all auth-related cookies
    const cookieStore = await cookies()
    const all = cookieStore.getAll()

    const response = NextResponse.json({ success: true })

    // Explicitly expire and delete all supabase and auth tokens across all domains/paths
    for (const c of all) {
      if (
        c.name.startsWith('sb-') ||
        c.name.includes('auth-token') ||
        c.name.includes('supabase') ||
        c.name.includes('session')
      ) {
        cookieStore.delete(c.name)
        response.cookies.set(c.name, '', {
          path: '/',
          maxAge: 0,
          expires: new Date(0),
          sameSite: 'lax',
        })
      }
    }

    return response
  } catch (err: any) {
    console.error('[/api/auth/signout error]', err)
    return NextResponse.json({ success: true })
  }
}

export async function GET(req: Request) {
  // Support direct GET redirect for links
  const res = await POST(req)
  return NextResponse.redirect(new URL('/login?signed_out=true', req.url))
}
