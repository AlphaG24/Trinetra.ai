import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Session created successfully. Force redirect to dashboard.
      return NextResponse.redirect(`${origin}/dashboard`)
    }
    console.error('Auth Callback Error:', error.message)
  }

  // If there is no code or an error occurred, return home
  return NextResponse.redirect(`${origin}/`)
}
