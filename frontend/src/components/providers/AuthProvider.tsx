'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (event === 'TOKEN_REFRESHED') {
          router.refresh()
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
        if (event === 'USER_UPDATED') {
          router.refresh()
        }
      }
    )

    // Handle stale refresh token
    supabase.auth.getSession().then(({ data: { session }, error }: any) => {
      if (error && error.message.includes('Refresh Token')) {
        // Clear bad session and redirect
        supabase.auth.signOut()
        localStorage.removeItem('supabase.auth.token')
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase])

  return <>{children}</>
}
