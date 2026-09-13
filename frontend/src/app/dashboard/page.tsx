'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { WelcomeHeader } from '@/src/components/dashboard/WelcomeHeader'
import { QuickActions } from '@/src/components/dashboard/QuickActions'
import { KPICards } from '@/src/components/dashboard/KPICards'
import { ToolHealthCards } from '@/src/components/dashboard/ToolHealthCards'
import { ActivityFeed } from '@/src/components/dashboard/ActivityFeed'
import { TrialWarnings } from '@/src/components/dashboard/TrialWarnings'
import useSWR from 'swr'
import { ProductTour } from '@/src/components/onboarding/ProductTour'
import { AgentComparisonWidget } from '@/src/components/agents/AgentComparisonWidget'
import { useDashboardStore } from '@/src/store/dashboardStore'
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
  tour_completed?: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const { runProductTour, setRunProductTour, setProfile: setStoreProfile } = useDashboardStore()

  useEffect(() => {
    if (profile && profile.tour_completed === false) {
      setRunProductTour(true)
    }
  }, [profile, setRunProductTour])

  const { data: overviewData, error: overviewError, isLoading: overviewLoading, mutate: mutateOverview } = useSWR('/api/dashboard/overview', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnMount: true,
    dedupingInterval: 2000, // short window so mutate() from delete immediately re-fetches
  })

  const init = async () => {
    setProfileLoading(true)
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, onboarding_complete, demo_minutes_used, demo_minutes_limit, paid_minutes_used, paid_minutes_limit, tour_completed')
        .eq('id', user.id)
        .single()

      if (userProfile) {
        const fullProfile = {
          ...userProfile,
          plan_tier: 'free_demo',
          trial_ends_at: null
        }
        setProfile(fullProfile)
        setStoreProfile(fullProfile as any)
      }
    } catch (err) {
      console.error('[Dashboard page init error]', err)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    init()

    const supabase = createClient()
    let activeChannel: any = null
    let dataChannel: any = null

    const subscribeToRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Profile updates
      activeChannel = supabase
        .channel(`dashboard_profile_realtime_${Math.random().toString(36).substring(7)}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const updatedProfile = payload.new as UserProfile
            setProfile(updatedProfile)
            setStoreProfile(updatedProfile as any)
          }
        )
        .subscribe()

      // Realtime KPI, Calls, Leads & Campaigns sync (Task 4.4)
      dataChannel = supabase
        .channel(`dashboard_data_realtime_${Math.random().toString(36).substring(7)}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'voice_calls',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            mutateOverview()
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
            mutateOverview()
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
            mutateOverview()
          }
        )
        .subscribe()
    }

    subscribeToRealtime()

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
      if (dataChannel) {
        supabase.removeChannel(dataChannel)
      }
    }
  }, [mutateOverview])

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* 1. Welcome Header */}
      <WelcomeHeader
        fullName={profile?.full_name}
        isOnboardingComplete={profile?.onboarding_complete}
        loading={profileLoading}
      />

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
      <QuickActions />

      {/* 4. KPI Cards Grid */}
      <KPICards
        stats={overviewData?.stats || null}
        loading={overviewLoading}
        error={overviewError?.message || (overviewData?.error ? overviewData.error : null)}
        onRetry={() => mutateOverview()}
      />

      {/* Comparison Scorecard Widget */}
      <AgentComparisonWidget
        agents={overviewData?.tools || []}
        loading={overviewLoading}
      />

      {/* 5. Main Content Section (Deployed Tools & Activity Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployed Tools (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
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
        <div className="space-y-4">
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
      <ProductTour
        page="overview"
        run={runProductTour}
        onTourComplete={() => setRunProductTour(false)}
      />
    </div>
  )
}
