'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { WelcomeHeader } from '@/src/components/dashboard/WelcomeHeader'
import { QuickActions } from '@/src/components/dashboard/QuickActions'
import { KPICards } from '@/src/components/dashboard/KPICards'
import { ToolHealthCards } from '@/src/components/dashboard/ToolHealthCards'
import { ActivityFeed } from '@/src/components/dashboard/ActivityFeed'
import { TrialWarnings } from '@/src/components/dashboard/TrialWarnings'
import useSWR from 'swr'
import { AgentComparisonWidget } from '@/src/components/agents/AgentComparisonWidget'
import { useDashboardStore } from '@/src/store/dashboardStore'
import { useAuth } from '@/src/components/providers/AuthProvider'
import { AlertTriangle, RefreshCw } from 'lucide-react'
const fetcher = (url: string) => fetch(url).then(res => res.json())

interface UserProfile {
  full_name: string | null
  onboarding_complete: boolean
  plan_tier: string
  trial_ends_at: string | null
  demo_minutes_used: number
  demo_minutes_limit: number
  paid_minutes_used: number
  paid_minutes_limit: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user: authUser, profile: authProfile, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const { setProfile: setStoreProfile } = useDashboardStore()

  useEffect(() => {
    // 1-second fail-safe timer so the header NEVER gets stuck on skeleton
    const safetyTimer = setTimeout(() => {
      setProfileLoading(false)
    }, 1000)

    if (authProfile) {
      const fullProfile = {
        ...authProfile,
        plan_tier: authProfile.plan_tier || 'free',
        trial_ends_at: authProfile.trial_ends_at || null
      }
      setProfile(fullProfile as any)
      setStoreProfile(fullProfile as any)
      setProfileLoading(false)
    } else if (!authLoading) {
      setProfileLoading(false)
    }

    return () => clearTimeout(safetyTimer)
  }, [authProfile, authLoading, setStoreProfile])

  const { data: overviewData, error: overviewError, isLoading: overviewLoading, mutate: mutateOverview } = useSWR('/api/dashboard/overview', fetcher, {
    refreshInterval: 0, // Disabled aggressive polling; manual refresh or user actions trigger updates
    revalidateOnFocus: false, // Prevent query storm when switching browser tabs
    revalidateOnMount: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // 30s deduplication window
  })

  const init = async () => {
    if (authProfile) return
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        if (!authLoading && !authUser) router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (userProfile) {
        const fullProfile = {
          ...userProfile,
          plan_tier: userProfile.plan_tier || 'free',
          trial_ends_at: userProfile.trial_ends_at || null
        }
        setProfile(fullProfile as any)
        setStoreProfile(fullProfile as any)
      }
    } catch (err) {
      console.error('[Dashboard page init error]', err)
    } finally {
      setProfileLoading(false)
    }
  }

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedMutateOverview = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      mutateOverview()
    }, 2000)
  }, [mutateOverview])

  useEffect(() => {
    if (!authProfile && !authLoading) {
      init()
    }

    const supabase = createClient()
    let activeChannel: any = null
    let dataChannel: any = null
    let isMounted = true

    const subscribeToRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      // Deterministic channel names to avoid connection leak in pooler
      activeChannel = supabase
        .channel(`dashboard_profile_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            if (!isMounted) return
            const updatedProfile = payload.new as UserProfile
            setProfile(updatedProfile)
            setStoreProfile(updatedProfile as any)
          }
        )
        .subscribe()

      // Realtime KPI, Calls, Leads & Campaigns sync (debounced to avoid query bursts)
      dataChannel = supabase
        .channel(`dashboard_data_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'voice_calls',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            debouncedMutateOverview()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leads',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            debouncedMutateOverview()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaigns',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            debouncedMutateOverview()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_log',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            debouncedMutateOverview()
          }
        )
        .subscribe()
    }

    subscribeToRealtime()

    return () => {
      isMounted = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
      if (dataChannel) {
        supabase.removeChannel(dataChannel)
      }
    }
  }, [debouncedMutateOverview])

  return (
    <div suppressHydrationWarning className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* 1. Welcome Header */}
      <WelcomeHeader
        fullName={profile?.full_name || authProfile?.full_name || authUser?.email?.split('@')[0] || 'Partner'}
        isOnboardingComplete={profile?.onboarding_complete ?? authProfile?.onboarding_complete ?? true}
        loading={profileLoading && !authProfile && !authUser}
      />

      {/* Degraded State / Connection Warning Banner */}
      {(overviewError || overviewData?.error) && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold text-amber-200">Database telemetry is temporarily reconnecting.</span> You are viewing cached dashboard data while telemetry refreshes in the background.
          </div>
          <button
            onClick={() => mutateOverview()}
            disabled={overviewLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs font-medium text-amber-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${overviewLoading ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      )}

      {/* 2. Trial & Demo Warnings */}
      {profile && (
        <TrialWarnings
          planTier={profile.plan_tier}
          trialEndsAt={profile.trial_ends_at}
          demoMinutesUsed={profile.demo_minutes_used}
          demoMinutesLimit={profile.demo_minutes_limit}
          paidMinutesUsed={profile.paid_minutes_used}
          paidMinutesLimit={profile.paid_minutes_limit}
        />
      )}

      {/* 3. Quick Actions */}
      <div suppressHydrationWarning>
        <QuickActions />
      </div>

      {/* 4. KPI Cards Grid */}
      <div suppressHydrationWarning>
        <KPICards
          stats={overviewData?.stats || null}
          loading={overviewLoading}
          error={overviewError?.message || (overviewData?.error ? overviewData.error : null)}
          onRetry={() => mutateOverview()}
        />
      </div>

      {/* Comparison Scorecard Widget */}
      <div suppressHydrationWarning>
        <AgentComparisonWidget
          agents={overviewData?.tools || []}
          loading={overviewLoading}
        />
      </div>

      {/* 5. Main Content Section (Deployed Tools & Activity Feed) */}
      <div suppressHydrationWarning className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployed Tools (Left 2 Columns) */}
        <div suppressHydrationWarning className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display text-[var(--heading)] uppercase tracking-wider">
              Deployed Tools
            </h3>
          </div>
          <ToolHealthCards
            tools={overviewData?.tools || []}
            loading={overviewLoading}
            error={overviewError?.message || (overviewData?.error ? overviewData.error : null)}
            onRetry={() => mutateOverview()}
          />
        </div>

        {/* Recent Activity (Right 1 Column) */}
        <div suppressHydrationWarning className="space-y-4">
          <h3 className="text-base font-bold font-display text-[var(--heading)] uppercase tracking-wider">
            Recent Activity
          </h3>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5">
            <ActivityFeed
              activities={overviewData?.activity || []}
              loading={overviewLoading}
              error={overviewError?.message || (overviewData?.error ? overviewData.error : null)}
              onRetry={() => mutateOverview()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
