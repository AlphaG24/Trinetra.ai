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
      if (fromProfile && fromProfile.toLowerCase() !== 'partner') return fromProfile
      const fromMeta = (
        u?.user_metadata?.full_name ||
        u?.user_metadata?.name ||
        u?.raw_user_meta_data?.full_name ||
        u?.raw_user_meta_data?.name ||
        ''
      ).trim()
      if (fromMeta && fromMeta.toLowerCase() !== 'partner') return fromMeta
      const email = u?.email || profileData?.email || ''
      if (email) {
        const prefix = email.split('@')[0]
        return prefix.charAt(0).toUpperCase() + prefix.slice(1)
      }
      return 'User'
    }

    try {
      const res = await fetch('/api/profiles')
      if (res.ok) {
        const { profile: data, user: serverUser } = await res.json()
        if (data) {
          const userEmail = (data.email || '').toLowerCase().trim()
          const isSuperAdminEmail = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').includes(userEmail)
          const resolvedRole = data.role || (isSuperAdminEmail ? 'super_admin' : null)
          const activeUser = userObj || serverUser
          const resolvedFullName = resolveFullName(data, activeUser) || (isSuperAdminEmail ? 'Raghav Thakur' : 'User')
          const enrichedProfile = { ...data, full_name: resolvedFullName, role: resolvedRole }
          setProfile(enrichedProfile)
          setRole(resolvedRole)
          if (activeUser) {
            setUser((prev: any) => prev || activeUser)
          }
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ profile: enrichedProfile, user: activeUser }))
            localStorage.setItem(CACHE_KEY, JSON.stringify({ profile: enrichedProfile, user: activeUser }))
            if (resolvedRole) {
              sessionStorage.setItem('trinetra_user_role', resolvedRole)
              localStorage.setItem('trinetra_user_role', resolvedRole)
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
        const isSuperAdminEmail = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').includes(userEmail)
        const resolvedRole = data.role || (isSuperAdminEmail ? 'super_admin' : null)
        const resolvedFullName = resolveFullName(data, userObj) || (isSuperAdminEmail ? 'Raghav Thakur' : 'User')
        const enrichedProfile = { ...data, full_name: resolvedFullName, role: resolvedRole }
        setProfile(enrichedProfile)
        setRole(resolvedRole)
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ profile: enrichedProfile, user: userObj }))
          localStorage.setItem(CACHE_KEY, JSON.stringify({ profile: enrichedProfile, user: userObj }))
          if (resolvedRole) {
            sessionStorage.setItem('trinetra_user_role', resolvedRole)
            localStorage.setItem('trinetra_user_role', resolvedRole)
          }
        } catch {}
      }
    } catch (err) {
      console.warn('[AuthProvider] Profile fetch error:', err)
    }
  }, [supabase])

  const loadUser = useCallback(async () => {
    try {
      // 1. Attempt client getUser()
      const res = await supabase.auth.getUser().catch((err: any) => ({
        data: { user: null },
        error: err,
      }))
      let currentUser = res?.data?.user

      // 2. If client getUser() failed or timed out, attempt server /api/profiles fallback
      if (!currentUser) {
        try {
          const sRes = await fetch('/api/profiles')
          if (sRes.ok) {
            const sData = await sRes.json()
            if (sData?.profile) {
              currentUser = sData.user || {
                id: sData.profile.id,
                email: sData.profile.email,
                user_metadata: { full_name: sData.profile.full_name }
              }
              setUser(currentUser)
              setProfile(sData.profile)
              setRole(sData.profile.role || null)
              return
            }
          }
        } catch {}
      }

      if (!currentUser) {
        // Only clear if no existing cached profile
        const cached = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY)
        if (!cached) {
          setUser(null)
          setProfile(null)
          setRole(null)
        }
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

        let currentUser = res?.data?.user

        // Server-side /api/profiles fallback if client getUser() yielded null
        if (!currentUser) {
          try {
            const sRes = await fetch('/api/profiles')
            if (sRes.ok) {
              const sData = await sRes.json()
              if (sData?.profile) {
                currentUser = sData.user || {
                  id: sData.profile.id,
                  email: sData.profile.email,
                  user_metadata: { full_name: sData.profile.full_name }
                }
                setUser(currentUser)
                setProfile(sData.profile)
                setRole(sData.profile.role || null)
                return
              }
            }
          } catch {}
        }

        if (!currentUser) {
          const cached = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY)
          if (!cached) {
            setUser(null)
            setProfile(null)
            setRole(null)
          }
          return
        }

        const userEmail = (currentUser.email || '').toLowerCase().trim()
        const isSuperAdminEmail = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || currentUser.user_metadata?.role === 'super_admin' || currentUser.app_metadata?.role === 'super_admin'
        if (isSuperAdminEmail) {
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
  }, [supabase, router])

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
