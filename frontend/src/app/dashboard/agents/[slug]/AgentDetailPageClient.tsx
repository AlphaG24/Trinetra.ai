'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Bot, ArrowLeft, Copy, Check, LayoutDashboard, Mic, BookOpen, Brain, 
  PhoneIncoming, Users, BarChart3, Lock, AlertCircle, RefreshCw, Clock, Phone,
  CalendarClock, Settings2
} from 'lucide-react'
import { createClient } from '@/lib/client'
import { AgentCallbacksTab } from '../../../../components/agents/AgentCallbacksTab'
import { toast } from 'sonner'
import { useDashboardStore } from '@/store/dashboardStore'
import { mutate } from 'swr'

// Import Tab Components
import { AgentOverviewTab } from '@/src/components/agents/AgentOverviewTab'
import { AgentVoiceTab } from '@/src/components/agents/AgentVoiceTab'
import { AgentNumbersTab } from '../../../../components/agents/AgentNumbersTab'
import { AgentKnowledgeTab } from '@/src/components/agents/AgentKnowledgeTab'
import { AgentBehaviorTab } from '@/src/components/agents/AgentBehaviorTab'
import { AgentCallHistoryTab } from '@/src/components/agents/AgentCallHistoryTab'
import { AgentLeadsTab } from '@/src/components/agents/AgentLeadsTab'
import { AgentAnalyticsTab } from '@/src/components/agents/AgentAnalyticsTab'
import { AgentSettingsTab } from '../../../../components/agents/AgentSettingsTab'
import { AgentSetupGuide } from '@/src/components/agents/AgentSetupGuide'
import { AgentCallingStatus } from '@/src/components/agents/AgentCallingStatus'
import { ProductTour } from '@/src/components/onboarding/ProductTour'

interface CallLog {
  id: string
  duration_seconds: number
  sentiment: string | null
  transcript: string | null
  recording_url: string | null
  created_at: string
}

export function AgentDetailPageClient({ 
  agentId,
  initialAgent,
  initialProfile
}: { 
  agentId: string
  initialAgent?: any
  initialProfile?: any
}) {
  const router = useRouter()
  
  const cleanName = (name: string) => {
    return (name || '')
      .replace(/^\[[^\]]+\]\s*/, '')
      .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
      .replace(/\s*-\s*Trial\s*$/i, ' (Trial)')
  }

  const getInitialAgentState = () => {
    if (!initialAgent) return null;
    const rawName = initialAgent.name || '';
    const displayName = cleanName(rawName);
    const primaryAssigned = initialAgent.agent_phone_numbers?.find((ap: any) => ap.is_primary) || initialAgent.agent_phone_numbers?.[0];
    const assignedPhoneNumber = primaryAssigned?.phone_numbers?.phone_number || null;
    return {
      ...initialAgent,
      phone_number: assignedPhoneNumber,
      agent_name: displayName,
      raw_name: rawName,
    };
  };

  const [loading, setLoading] = useState(!initialAgent)
  const [agent, setAgent] = useState<any>(getInitialAgentState())
  const [profile, setProfile] = useState<any>(initialProfile || null)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [sysConfig, setSysConfig] = useState<Record<string, string>>({})
  
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)
  const [errorState, setErrorState] = useState<{ title: string; message: string; actionText?: string; actionLink?: string; type?: 'auth' | 'not_found' | 'error' } | null>(null)

  // Ref to stop the heartbeat poll once the session is detected as expired
  const sessionExpired = useRef(false)

  const handleCopyAgentId = () => {
    navigator.clipboard.writeText(agentId)
    setCopied(true)
    toast.success('Agent ID copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const { agents, setAgents, runProductTour, setRunProductTour } = useDashboardStore()

  useEffect(() => {
    if (profile && profile.tour_completed === false) {
      setRunProductTour(true)
    }
  }, [profile, setRunProductTour])

  const handleDeleteAgent = async () => {
    if (!window.confirm("Are you sure you want to delete this agent? All logs and configurations will be permanently removed.")) {
      return
    }

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      })

      // 404 means already deleted from DB — treat as success and clean up stale UI
      const isAlreadyGone = res.status === 404
      if (!res.ok && !isAlreadyGone) {
        const body = await res.json().catch(() => ({ error: 'Delete failed' }))
        throw new Error(body.error || 'Delete failed')
      }

      // Remove from Zustand store immediately so sidebar/overview update
      setAgents(agents.filter(a => a.id !== agentId))
      // Invalidate the SWR overview cache so the dashboard re-fetches fresh data
      mutate('/api/dashboard/overview')

      toast.success(isAlreadyGone ? "Agent removed from view." : "Agent deleted successfully.")
      // router.refresh() forces the Next.js Server Component (layout.tsx) to
      // re-run and re-fetch agents from DB, removing the deleted agent everywhere.
      router.refresh()
      router.push('/dashboard')
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to delete agent: " + err.message)
    }
  }

  // Fetch all necessary agent and profile metadata
  const fetchAgentData = useCallback(async (silent: boolean) => {
    // Don't attempt fetches if we already know the session is gone
    if (sessionExpired.current) return

    try {
      if (!silent) setLoading(true)
      const supabase = createClient()

      // SECURITY (SEC-003): Use getUser() which validates against the database.
      // Never use getSession() which trusts the cookie payload without verification.
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        // Stop the heartbeat from retrying to avoid console flood
        sessionExpired.current = true

        if (!silent) {
          console.error("AgentDetailPageClient error:", userError || "No user session found")
          setErrorState({
            title: 'Session Expired',
            message: 'Unable to load agent dashboard. Your authentication session has expired or is invalid.',
            type: 'auth'
          })
        }
        return
      }

      // 2. Fetch agent - selecting '*' to get behavior & voice configs, and join agent_phone_numbers to resolve phone number
      const { data: agentData, error: agentErr } = await supabase
        .from('agents')
        .select(`
          *,
          agent_phone_numbers (
            is_primary,
            phone_numbers (
              phone_number
            )
          )
        `)
        .or(`id.eq.${agentId},vapi_agent_id.eq.${agentId}`)
        .eq('user_id', user.id)
        .maybeSingle()

      if (agentErr) throw agentErr
      
      if (!agentData) {
        if (!silent) {
          setErrorState({
            title: 'Agent Not Found or Unauthorized',
            message: 'The requested agent could not be found, or you do not have permission to access it. If it was recently created, please wait a moment and refresh.',
            actionText: 'Return to Agents List',
            actionLink: '/dashboard/agents'
          })
        }
        return
      }

      // Strip internal [slug] dedup prefix from display name.
      // DB stores: "[appointment_agent] Appointment Booker - Demo"
      // Display:   "Appointment Booker (Demo)"
      const rawName = agentData.name || ''
      const displayName = rawName
        .replace(/^\[[^\]]+\]\s*/, '')           // remove [slug] prefix
        .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')  // prettify " - Demo" suffix
        .replace(/\s*-\s*Trial\s*$/i, ' (Trial)') // prettify " - Trial" suffix

      // Resolve phone number if assigned
      const primaryAssigned = agentData.agent_phone_numbers?.find((ap: any) => ap.is_primary) || agentData.agent_phone_numbers?.[0];
      const assignedPhoneNumber = primaryAssigned?.phone_numbers?.phone_number || null;

      setAgent({
        ...agentData,
        phone_number: assignedPhoneNumber,
        agent_name: displayName,     // clean display name
        raw_name: rawName,           // keep original for API/dedup use
      })

      // 3. Fetch call logs matching this agent
      const { data: logsData, error: logsErr } = await supabase
        .from('voice_calls')
        .select('id, duration_seconds, sentiment, transcript, recording_url, created_at')
        .eq('agent_id', agentData.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (logsErr) throw logsErr
      setCallLogs(logsData || [])

      // 4. Fetch user profile (for plan details and metrics)
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, plan_tier, trial_ends_at, demo_minutes_used, demo_minutes_limit, paid_minutes_used, paid_minutes_limit, tour_completed')
        .eq('id', user.id)
        .single()

      if (!profileErr && profileData) {
        setProfile(profileData)
      }

    } catch (err: any) {
      if (!silent) {
        console.error("Error loading agent details:", err)
        setErrorState({
          title: 'Error Loading Agent',
          message: err?.message || 'An unexpected error occurred while loading agent details.',
          actionText: 'Return to Dashboard',
          actionLink: '/dashboard'
        })
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [agentId, router])

  useEffect(() => {
    if (!agentId) return
    fetchAgentData(!!initialAgent)
  }, [agentId, fetchAgentData, initialAgent])

  // Fetch system config once (for trial_days, trial_minutes)
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/public/config')
        if (res.ok) {
          const data = await res.json()
          setSysConfig(data.configs || {})
        }
      } catch (err) {
        console.warn('Failed to load system config:', err)
      }
    }
    loadConfig()
  }, [])

  // Background polling heartbeat — silently refreshes every 30 seconds to conserve Supabase Disk IO
  // Stops automatically when sessionExpired ref is set to true
  useEffect(() => {
    if (!agentId) return
    const intervalId = setInterval(() => {
      if (!sessionExpired.current) {
        fetchAgentData(true)
      }
    }, 30000)
    return () => clearInterval(intervalId)
  }, [agentId, fetchAgentData])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        {/* Top bar skeleton */}
        <div className="h-16 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl" />
        {/* Tab bar skeleton */}
        <div className="h-12 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl" />
        {/* Body skeleton */}
        <div className="h-96 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl" />
      </div>
    )
  }

  if (errorState) {
    const handleSignOut = async () => {
      const supabaseClient = createClient()
      try {
        await supabaseClient.auth.signOut()
      } catch (err) {
        console.error('SignOut error:', err)
      }
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key === 'supabase.auth.token') {
            localStorage.removeItem(key)
          }
        })
      }
      router.push('/login')
      router.refresh()
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full shadow-lg">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--heading)] mb-2 font-display">{errorState.title}</h2>
          <p className="text-[var(--body)] text-sm mb-6 leading-relaxed">{errorState.message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {errorState.type === 'auth' ? (
              <>
                <button
                  onClick={handleSignOut}
                  className="px-6 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/30 font-montserrat font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Sign Out
                </button>
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 rounded-xl bg-[var(--primary-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                >
                  Go to Dashboard
                </Link>
              </>
            ) : errorState.actionLink ? (
              <Link
                href={errorState.actionLink}
                className="px-6 py-2.5 rounded-xl bg-[var(--primary-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all"
              >
                {errorState.actionText || 'Continue'}
              </Link>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl bg-[var(--primary-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all"
              >
                Refresh Page
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!agent) return null

  // Gating & Tier Calculations
  const getAgentTier = (agentData: any, profileData: any) => {
    // 1. Check agent's own config tier first
    if (agentData?.config?.plan_tier) {
      const aTier = agentData.config.plan_tier.toLowerCase()
      if (aTier === 'professional' || aTier === 'enterprise' || aTier === 'pro') return 'pro'
      return aTier
    }
    // 2. If agent is explicitly marked demo
    if (agentData?.is_demo) {
      return 'free_demo'
    }
    // 3. Fallback to profile plan tier
    if (profileData) {
      const pTier = (profileData.plan_tier || 'free_demo').toLowerCase()
      if (pTier === 'professional' || pTier === 'enterprise' || pTier === 'pro') return 'pro'
      if (pTier === 'starter') return 'starter'
      if (pTier === 'trial') return 'trial'
    }
    return 'free_demo'
  }

  const tier = getAgentTier(agent, profile)



  // Trial users are treated as fully paid for feature access
  const isPaid = tier === 'starter' || tier === 'pro' || tier === 'trial'

  const userTier = (profile?.plan_tier || 'free').toLowerCase()
  let demoMinutesLimit = 10
  if (tier === 'trial') {
    demoMinutesLimit = parseInt(sysConfig?.trial_minutes || '100', 10)
  } else if (tier === 'starter') {
    demoMinutesLimit = parseInt(sysConfig?.starter_minutes || '500', 10)
  } else if (tier === 'professional' || tier === 'pro') {
    demoMinutesLimit = parseInt(sysConfig?.professional_minutes || '2000', 10)
  } else {
    demoMinutesLimit = parseInt(sysConfig?.free_demo_minutes || '10', 10)
  }
  const demoMinutesUsed = profile?.demo_minutes_used ?? 0
  const remainingMinutes = Math.max(0, demoMinutesLimit - demoMinutesUsed)
  
  // Demo Agent Expiration: older than 5 days OR demo minutes used >= limit (10 minutes)
  const agentCreatedAt = agent?.created_at ? new Date(agent.created_at) : new Date()
  const daysActive = Math.ceil((Date.now() - agentCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
  const isDemoExpired = (tier === 'free_demo' || agent?.is_demo) && (daysActive > 5 || demoMinutesUsed >= demoMinutesLimit)
  const isPaused = agent?.status === 'paused' || agent?.status === 'Paused'
  const isExpired = isDemoExpired || isPaused

  // Trial expiry calculation (per-agent or fallback to global profile)
  const trialEndsAt = agent?.config?.trial_ends_at 
    ? new Date(agent.config.trial_ends_at)
    : (profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null)
  const isTrialExpired = tier === 'trial' && trialEndsAt && trialEndsAt < new Date()
  const trialDaysRemaining = trialEndsAt && !isTrialExpired
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0
  const trialMinutes = agent?.config?.minutes_limit ?? parseInt(sysConfig.trial_minutes || '100', 10)

  const isFeatureUnlocked = (featureId: string) => {
    // Expired free demo: only overview and settings visible
    if (isExpired) {
      return featureId === 'overview' || featureId === 'settings'
    }
    // Expired trial: only overview and settings visible (user should upgrade)
    if (isTrialExpired) {
      return featureId === 'overview' || featureId === 'settings'
    }
    // Free demo only gets overview, voice, calls, settings, documentation
    if (tier === 'free_demo') {
      return ['overview', 'voice', 'calls', 'settings', 'documentation'].includes(featureId)
    }
    // Trial AND all paid plans get FULL access to every tab
    return true
  }

  // Leads Count mapping
  const leadsCount = isFeatureUnlocked('leads') ? (callLogs.filter(l => l.sentiment === 'positive').length) : '—'

  // Tabs Definitions
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'documentation', label: 'Documentation', icon: BookOpen },
    { id: 'voice', label: 'Voice', icon: Mic },
    { 
      id: 'numbers', 
      label: 'Numbers', 
      icon: Phone,
      locked: userTier === 'free' || userTier === 'free_demo',
      lockedMessage: 'Upgrade to a paid plan to use phone numbers'
    },
    { 
      id: 'callbacks', 
      label: 'Callbacks', 
      icon: CalendarClock,
      locked: userTier === 'free' || userTier === 'free_demo',
      lockedMessage: 'Upgrade to a paid plan to use callback scheduling'
    },
    { id: 'knowledge', label: 'Knowledge', icon: Brain },
    { id: 'behavior', label: 'Behavior', icon: Settings2 },
    { id: 'calls', label: 'Calls', icon: PhoneIncoming },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings2 }
  ]

  const upgradeUrl = '/dashboard/billing'

  if (isExpired) {
    const daysActiveValue = (Date.now() - agentCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    const isLifespanExceeded = daysActiveValue > 5

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <Bot className="w-16 h-16 text-rose-500 mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-[var(--heading)] font-display">
            {isPaused ? 'Agent Paused' : 'Your Free Demo Has Ended'}
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            {isPaused 
              ? 'This agent has been paused. You cannot interact with it or make calls while it is paused.'
              : isLifespanExceeded
                ? 'This free demo agent has expired because its 5-day trial period has ended.' 
                : 'This free demo agent has expired because its calls minutes quota has been fully exhausted.'}
            {' '}
            {!isPaused && 'Please upgrade to a paid plan or purchase a bundle pack to reactivate settings and continue calling.'}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href={upgradeUrl}
              className="w-full py-3 bg-violet-600 hover:bg-violet-555 text-white font-bold text-xs uppercase rounded-xl tracking-wider shadow-md hover:scale-[1.02] transition-all block text-center cursor-pointer font-montserrat"
            >
              Upgrade Plan
            </Link>
            <Link
              href="/dashboard"
              className="w-full py-3 border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--heading)] font-bold text-xs uppercase rounded-xl tracking-wider transition-all block text-center cursor-pointer font-montserrat"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 min-h-screen text-left">
      
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-[var(--body)] hover:text-[var(--heading)] transition-colors text-xs font-mono group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>
      </div>

      {/* Trial Active Banner */}
      {tier === 'trial' && !isTrialExpired && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-xs font-sans font-medium text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              <span className="font-bold">Trial:</span> {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
              {' · '}{trialMinutes} minutes included
              {' · '}<span className="opacity-70">Full access to all features</span>
            </span>
          </div>
          <Link
            href={upgradeUrl}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-montserrat font-bold text-xs uppercase tracking-wider transition-all shrink-0"
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Top Bar (Sticky, always visible) */}
      <div className="sticky top-0 z-35 bg-[var(--card-bg)] border border-[var(--border)] p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--heading)] shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--heading)] font-display tracking-tight">{agent.agent_name}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[var(--muted)] font-mono">
              <span>ID: {agentId}</span>
              <button 
                onClick={handleCopyAgentId}
                className="p-1 hover:bg-[var(--hover-bg)] rounded text-[var(--body)] hover:text-[var(--heading)] transition-colors"
                title="Copy Agent ID"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Badges and Actions */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border font-montserrat ${
            agent.status === 'active' 
              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
              : agent.status === 'training'
              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
              : 'bg-[var(--hover-bg)] text-[var(--body)] border-[var(--border)]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              agent.status === 'active' ? 'bg-green-500 animate-pulse' : agent.status === 'training' ? 'bg-yellow-500' : 'bg-[var(--muted)]'
            }`} />
            {agent.status === 'active' ? 'ONLINE' : agent.status}
          </span>

          {/* Tier Badge */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-[var(--border)] bg-[var(--background)] text-[var(--heading)] font-montserrat tracking-wide">
            {tier === 'pro' ? 'Pro Plan' : tier === 'starter' ? 'Starter Plan' : tier === 'trial' ? 'Trial Plan' : 'Free Demo'}
          </span>

          {/* Minutes Remaining — only show for free demo */}
          {tier === 'free_demo' && (
            <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--background)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
              {remainingMinutes} min left
            </span>
          )}

          {/* Trial Days Remaining */}
          {tier === 'trial' && !isTrialExpired && (
            <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {trialDaysRemaining}d trial
            </span>
          )}

          {/* Upgrade Button — show for free_demo and trial (to encourage upgrade) */}
          {(tier === 'free_demo' || tier === 'trial') && (
            <Link
              href={upgradeUrl}
              className="px-4 py-2 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all shadow-md"
            >
              Upgrade
            </Link>
          )}

          {/* Delete Agent Button */}
          <button
            onClick={handleDeleteAgent}
            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-montserrat font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            Delete Agent
          </button>
        </div>
      </div>

      {isExpired || isTrialExpired ? (
        <div className="bg-[var(--card-bg)] border border-rose-500/30 rounded-2xl p-12 shadow-md flex flex-col items-center justify-center text-center min-h-[500px]">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--heading)] mb-3 font-display tracking-tight">
            {isTrialExpired ? "Your Trial Has Expired" : "Your Free Demo Has Ended"}
          </h2>
          <p className="text-[var(--body)] max-w-md mx-auto mb-8 leading-relaxed">
            {isTrialExpired 
              ? "Your trial period has ended. Please upgrade to a paid plan to unlock full access to this agent and all features."
              : "This demo agent has expired because it has been active for more than 5 days or has reached its minute limit. Please upgrade to a paid plan to unlock full access to this agent and all features."}
          </p>
          <Link
            href={upgradeUrl}
            className="px-8 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-montserrat font-bold text-sm uppercase tracking-wider transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            View Plans
          </Link>
        </div>
      ) : (
        <>
          {/* Tab Bar (Sticky below top bar) */}
          <div className="sticky top-24 z-30 bg-[var(--card-bg)] border border-[var(--border)] p-1 rounded-xl shadow-sm flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const unlocked = isFeatureUnlocked(tab.id)
              const isTabLocked = (tab as any).locked
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  data-tour={`tab-${tab.id}`}
                  onClick={() => {
                    if (isTabLocked) {
                      toast.error((tab as any).lockedMessage || 'Upgrade to a paid plan to access this feature')
                      return
                    }
                    if (!unlocked) {
                      toast.error('This feature is locked for Free Demo agents. Please upgrade to a paid plan to access it.')
                      return
                    }
                    setActiveTab(tab.id)
                  }}
                  title={isTabLocked ? (tab as any).lockedMessage : (!unlocked ? 'Locked for Free Demo agents' : undefined)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-montserrat font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--background)] text-[var(--heading)] border border-[var(--border)] shadow-inner'
                      : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]/10'
                  } ${(!unlocked || isTabLocked) ? 'opacity-50' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {isTabLocked && <Lock className="w-3 h-3 text-amber-500 ml-0.5" />}
                  {!isTabLocked && !unlocked && <Lock className="w-3 h-3 text-[var(--muted)] ml-0.5" />}
                </button>
              )
            })}
          </div>

      {/* Tab Content Body */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-md min-h-[400px]">
        {(!isFeatureUnlocked(activeTab) || 
          (activeTab === 'numbers' && (userTier === 'free' || userTier === 'free_demo')) || 
          (activeTab === 'callbacks' && (userTier === 'free' || userTier === 'free_demo'))) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center font-montserrat">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--heading)] mb-1 uppercase tracking-wider font-display">Feature Locked</h3>
            <p className="text-xs text-[var(--body)] mb-6 max-w-xs leading-relaxed mx-auto">
              {activeTab === 'numbers' 
                ? 'Phone numbers are only available on paid plans. Upgrade to the ₹99 Trial or a paid plan to buy and manage phone numbers.' 
                : activeTab === 'callbacks'
                ? 'Callback scheduling is only available on paid plans. Upgrade to the ₹99 Trial or a paid plan to schedule and track callbacks.'
                : 'This feature is locked for Free Demo agents. Please upgrade to a paid plan to gain full access.'}
            </p>
            <Link 
              href={upgradeUrl}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              Upgrade Now
            </Link>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <AgentOverviewTab 
                agent={agent}
                callLogs={callLogs}
                leadsCount={leadsCount}
                onTabChange={(tab) => setActiveTab(tab)}
                profile={profile}
                onProfileUpdate={(updated) => setProfile(updated)}
                sysConfig={sysConfig}
              />
            )}

            {activeTab === 'documentation' && (
              <AgentSetupGuide 
                agent={agent}
              />
            )}

            {activeTab === 'voice' && (
              <AgentVoiceTab 
                agent={agent}
                isPaid={isPaid}
                upgradeUrl={upgradeUrl}
              />
            )}

            {activeTab === 'numbers' && (
              <AgentNumbersTab 
                agentId={agent.id}
                organizationId={agent.organization_id || profile?.organization_id}
              />
            )}

            {activeTab === 'callbacks' && (
              <AgentCallbacksTab 
                agent={agent}
              />
            )}

            {activeTab === 'knowledge' && (
              <AgentKnowledgeTab 
                agent={agent}
                unlocked={isFeatureUnlocked('knowledge')}
                upgradeUrl={upgradeUrl}
              />
            )}

            {activeTab === 'behavior' && (
              <AgentBehaviorTab 
                agent={agent}
                unlocked={isFeatureUnlocked('behavior')}
                upgradeUrl={upgradeUrl}
              />
            )}

            {activeTab === 'calls' && (
              <AgentCallHistoryTab 
                agent={agent}
              />
            )}

            {activeTab === 'leads' && (
              <AgentLeadsTab 
                agent={agent}
                unlocked={isFeatureUnlocked('leads')}
                upgradeUrl={upgradeUrl}
              />
            )}

            {activeTab === 'analytics' && (
              <AgentAnalyticsTab 
                agent={agent}
                unlocked={isFeatureUnlocked('analytics')}
                upgradeUrl={upgradeUrl}
              />
            )}

            {activeTab === 'settings' && (
              <AgentSettingsTab 
                agent={agent}
                onDelete={handleDeleteAgent}
              />
            )}
          </>
        )}
      </div>
        </>
      )}
      <ProductTour 
        page="detail" 
        run={runProductTour} 
        onTourComplete={() => setRunProductTour(false)} 
      />
    </div>
  )
}
