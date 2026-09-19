'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'

export interface UserProfile {
  id: string
  full_name?: string | null
  email?: string | null
  avatar_url?: string | null
  role?: string | null
  organization_id?: string | null
  plan_tier?: string | null
  demo_minutes_used?: number
  demo_minutes_limit?: number
  paid_minutes_used?: number
  paid_minutes_limit?: number
  tour_completed?: boolean
  onboarding_complete?: boolean
  trial_ends_at?: string | null
  [key: string]: any
}

interface AuthContextType {
  user: any | null
  profile: UserProfile | null
  role: string | null
  isLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

const CACHE_KEY = 'trinetra_auth_profile_cache'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 1. Instant hydration from sessionStorage if available
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.profile) {
          setProfile(parsed.profile)
          setRole(parsed.profile.role || null)
        }
        if (parsed?.user) {
          setUser(parsed.user)
        }
      }
    } catch {
      // Ignore cache read errors
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        setProfile(data)
        setRole(data.role || null)
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user, profile: data }))
          if (data.role) {
            sessionStorage.setItem('trinetra_user_role', data.role)
          }
        } catch {}
      }
    } catch (err) {
      console.warn('[AuthProvider] Profile fetch error:', err)
    }
  }, [supabase, user])

  const loadUser = useCallback(async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      if (error || !currentUser) {
        setUser(null)
        setProfile(null)
        setRole(null)
        try {
          sessionStorage.removeItem(CACHE_KEY)
          sessionStorage.removeItem('trinetra_user_role')
        } catch {}
        return
      }

      setUser(currentUser)
      await fetchProfile(currentUser.id)
    } catch (err) {
      console.warn('[AuthProvider] Load user error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, fetchProfile])

  useEffect(() => {
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            setUser(session.user)
          }
        }
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setRole(null)
          try {
            sessionStorage.removeItem(CACHE_KEY)
            sessionStorage.removeItem('trinetra_user_role')
          } catch {}
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, loadUser, router])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    } else {
      await loadUser()
    }
  }, [user?.id, fetchProfile, loadUser])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      try {
        sessionStorage.removeItem(CACHE_KEY)
        sessionStorage.removeItem('trinetra_user_role')
        localStorage.removeItem('supabase.auth.token')
      } catch {}
      router.push('/login')
    } catch (err) {
      console.error('[AuthProvider] Signout error:', err)
    }
  }, [supabase, router])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
