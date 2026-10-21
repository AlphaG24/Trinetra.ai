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
        // Also restore user so displayName works instantly before getUser() resolves
        if (parsed?.user) {
          setUser(parsed.user)
        }
      }
    } catch {
      // Ignore cache read errors
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string, userObj?: any) => {
    // userObj is passed directly to avoid stale closure on `user` state
    const resolveFullName = (profileData: any, u: any) => {
      const fromProfile = (profileData?.full_name || '').trim()
      if (fromProfile) return fromProfile
      return (
        u?.user_metadata?.full_name ||
        u?.user_metadata?.name ||
        u?.raw_user_meta_data?.full_name ||
        u?.raw_user_meta_data?.name ||
        (u?.email ? u.email.split('@')[0] : '') ||
        ''
      ).trim()
    }

    try {
      const res = await fetch('/api/profiles')
      if (res.ok) {
        const { profile: data } = await res.json()
        if (data) {
          const userEmail = (data.email || '').toLowerCase().trim()
          const isSuperAdmin = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').includes(userEmail)
          const resolvedRole = isSuperAdmin ? 'super_admin' : (data.role || null)
          const resolvedFullName = resolveFullName(data, userObj) || 'Partner'
          const enrichedProfile = { ...data, full_name: resolvedFullName, role: resolvedRole }
          setProfile(enrichedProfile)
          setRole(resolvedRole)
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ profile: enrichedProfile, user: userObj }))
            if (resolvedRole) {
              sessionStorage.setItem('trinetra_user_role', resolvedRole)
            }
          } catch {}
          return
        }
      }
    } catch {
      // Fallback to client Supabase below
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        const userEmail = (data.email || '').toLowerCase().trim()
        const isSuperAdmin = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').includes(userEmail)
        const resolvedRole = isSuperAdmin ? 'super_admin' : (data.role || null)
        const resolvedFullName = resolveFullName(data, userObj) || 'Partner'
        const enrichedProfile = { ...data, full_name: resolvedFullName, role: resolvedRole }
        setProfile(enrichedProfile)
        setRole(resolvedRole)
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ profile: enrichedProfile, user: userObj }))
          if (resolvedRole) {
            sessionStorage.setItem('trinetra_user_role', resolvedRole)
          }
        } catch {}
      }
    } catch (err) {
      console.warn('[AuthProvider] Profile fetch error:', err)
    }
  }, [supabase])

  const loadUser = useCallback(async () => {
    try {
      const res = await supabase.auth.getUser().catch((err: any) => ({
        data: { user: null },
        error: err,
      }))
      const currentUser = res?.data?.user
      const error = res?.error

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
      await fetchProfile(currentUser.id, currentUser)
    } catch (err: any) {
      if (err?.name !== 'AuthRetryableFetchError') {
        console.warn('[AuthProvider] Load user error:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [supabase, fetchProfile])

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const res = await supabase.auth.getUser().catch((err: any) => ({
          data: { user: null },
          error: err,
        }))
        if (!isMounted) return

        const currentUser = res?.data?.user
        const error = res?.error

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

        const userEmail = (currentUser.email || '').toLowerCase().trim()
        const isSuperAdmin = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || currentUser.user_metadata?.role === 'super_admin' || currentUser.app_metadata?.role === 'super_admin'
        if (isSuperAdmin) {
          setRole('super_admin')
        }

        setUser(currentUser)
        await fetchProfile(currentUser.id, currentUser)
      } catch (err: any) {
        if (err?.name !== 'AuthRetryableFetchError') {
          console.warn('[AuthProvider] Init user error:', err)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!isMounted) return

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id, session.user)
          }
        }
        if (event === 'SIGNED_OUT') {
          // Verify if session truly expired or if this was triggered during route transitions
          const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CACHE_KEY) : null
          if (!cached) {
            setUser(null)
            setProfile(null)
            setRole(null)
            try {
              sessionStorage.removeItem('trinetra_user_role')
            } catch {}
            router.push('/')
            router.refresh()
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, router])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    } else {
      await loadUser()
    }
  }, [user?.id, fetchProfile, loadUser])

  const signOut = useCallback(async () => {
    try {
      try {
        sessionStorage.removeItem(CACHE_KEY)
        sessionStorage.removeItem('trinetra_user_role')
        localStorage.removeItem('supabase.auth.token')
      } catch {}
      setUser(null)
      setProfile(null)
      setRole(null)
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('[AuthProvider] Signout error:', err)
      router.push('/')
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
