import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const headerList = await headers()
  const host = headerList.get('host') || ''
  const cleanHost = host.split(':')[0]
  let cookieDomain: string | undefined = undefined
  
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd && cleanHost && !cleanHost.includes('dev.')) {
    if (cleanHost.endsWith('trinetraedu-ai.com')) {
      cookieDomain = '.trinetraedu-ai.com'
    } else if (cleanHost.endsWith('trinetra.ai')) {
      cookieDomain = '.trinetra.ai'
    }
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const setOptions: any = {
                name,
                value,
                ...options,
              }
              if (cookieDomain) {
                setOptions.domain = cookieDomain
              }
              cookieStore.set(setOptions)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
