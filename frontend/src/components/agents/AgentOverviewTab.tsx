import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PhoneIncoming, Clock, Users, Zap, Play, Copy, Lock, ChevronDown, ChevronUp,
  Loader2, Mic, MicOff, Square, Check, AlertTriangle, MessageSquare, X, PhoneCall, ShieldCheck, RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { useVoiceAgent } from '@/hooks/useVoiceAgent'
import { AgentCallingStatus } from './AgentCallingStatus'
import { PlanValidityTimer } from '@/src/components/shared/PlanValidityTimer'

interface CallLog {
  id: string
  duration_seconds: number
  sentiment: string | null
  transcript: string | null
  recording_url: string | null
  created_at: string
}

interface AgentOverviewTabProps {
  agent: any
  callLogs: CallLog[]
  leadsCount: number | string // '—' if locked
  onTabChange: (tab: string) => void
  profile: any
  onProfileUpdate?: (updatedProfile: any) => void
  sysConfig?: Record<string, string>
  onRefreshCalls?: () => void
}

export function AgentOverviewTab({ 
  agent, 
  callLogs, 
  leadsCount: initialLeadsCount, 
  onTabChange,
  profile,
  onProfileUpdate,
  sysConfig = {},
  onRefreshCalls
}: AgentOverviewTabProps) {
  const router = useRouter()
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)
  
  const [showCallModal, setShowCallModal] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [callActive, setCallActive] = useState(false)
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null)

  // Real KPI stats states
  const [stats, setStats] = useState({
    callsToday: 0,
    minutesUsed: 0,
    leadsGenerated: 0,
    avgDuration: 0.0,
    emergencyMinutes: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [resettingAll, setResettingAll] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  const handleRequestHomepagePlacement = async () => {
    setSubmittingRequest(true)
    try {
      const response = await fetch('/api/developer/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'set_homepage_agent',
          request_data: {
            agent_id: agent.id,
            agent_name: agent.name
          }
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to submit request.')
      }

      toast.success('Homepage placement request submitted for approval!')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmittingRequest(false)
    }
  }

  const [agentUsage, setAgentUsage] = useState<any>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [walletInfo, setWalletInfo] = useState<{
    emergency_minutes_available: number;
    reliability_score: number;
  }>({ emergency_minutes_available: 0, reliability_score: 85 })
  const [claimingEmergency, setClaimingEmergency] = useState(false)

  const supabase = createClient()
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const callActiveRef = useRef(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const {
    connectionState,
    isMuted,
    secondsConnected,
    transcripts,
    startCall,
    endCall,
    toggleMute,
    clearTranscripts,
  } = useVoiceAgent()

  const handleCloseCallModal = () => {
    if (connectionState === 'active' || connectionState === 'connecting') {
      endCall()
    }
    setShowCallModal(false)
    clearTranscripts()
  }

  const secondsConnectedRef = useRef(0)
  useEffect(() => {
    secondsConnectedRef.current = secondsConnected
  }, [secondsConnected])

  useEffect(() => {
    // Auto-scroll to latest message in real-time
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  const fetchWallet = useCallback(() => {
    fetch('/api/billing/wallet')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.wallet) {
          setWalletInfo({
            emergency_minutes_available: res.wallet.emergency_minutes_available || 0,
            reliability_score: res.wallet.reliability_score ?? 85
          })
        }
      })
      .catch(() => {})
  }, [])

  const fetchUsage = useCallback(() => {
    setUsageLoading(true)
    fetch(`/api/usage/agent/${agent.id}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) setAgentUsage(res.data)
        setUsageLoading(false)
      })
      .catch(() => setUsageLoading(false))
  }, [agent.id])

  useEffect(() => {
    fetchUsage()
    fetchWallet()
  }, [fetchUsage, fetchWallet])

  const handleClaimEmergency = async () => {
    setClaimingEmergency(true)
    try {
      const res = await fetch('/api/billing/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_emergency_minutes' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to claim emergency minutes')
      toast.success('50 Emergency Minutes buffer activated!')
      fetchUsage()
      fetchWallet()
    } catch (err: any) {
      toast.error(err.message || 'Could not claim emergency minutes')
    } finally {
      setClaimingEmergency(false)
    }
  }

  // Resolve agent-specific tier
  const getAgentTier = (agentData: any, profileData: any) => {
    if (agentData?.config?.plan_tier) {
      return agentData.config.plan_tier.toLowerCase()
    }
    if (agentData?.is_demo) {
      return 'free_demo'
    }
    if (profileData) {
      const pTier = (profileData.plan_tier || '').toLowerCase()
      if (pTier === 'professional' || pTier === 'enterprise' || pTier === 'pro') return 'pro'
      if (pTier === 'starter') return 'starter'
      if (pTier === 'trial') return 'trial'
    }
    return 'free_demo'
  }

  const agentTier = getAgentTier(agent, profile)
  const isDemo = agent.is_demo === true

  // Per-agent quota resolution: prioritize agent's own custom limit over shared tier default
  let limit = 10
  let used = 0
  
  if (isDemo) {
    limit = parseInt(sysConfig?.free_demo_minutes || '10', 10)
    used = profile?.demo_minutes_used ?? 0
  } else {
    const customAgentLimit = agent?.config?.minutes_limit ?? agent?.minutes_limit
    if (customAgentLimit && Number(customAgentLimit) > 0) {
      limit = Number(customAgentLimit)
    } else if (agentTier === 'trial') {
      limit = parseInt(sysConfig?.trial_minutes || '100', 10)
    } else if (agentTier === 'starter') {
      limit = parseInt(sysConfig?.starter_minutes || '500', 10)
    } else if (agentTier === 'professional' || agentTier === 'pro') {
      limit = parseInt(sysConfig?.professional_minutes || '2000', 10)
    } else if (agentTier === 'enterprise') {
      limit = parseInt(sysConfig?.enterprise_minutes || '10000', 10)
    } else {
      limit = parseInt(sysConfig?.free_demo_minutes || '10', 10)
    }
    used = statsLoading ? 0 : stats.minutesUsed
  }

  const emergencyMinutes = agentUsage?.emergency_minutes_available || stats.emergencyMinutes || 0

  const handleResetAll = async () => {
    if (!window.confirm("WARNING: This will reset ALL settings of the agent (including voice configs, greeting messages, fallbacks, and behavioral prompts) back to factory defaults. Your entire custom modifications will be overwritten. Do you want to proceed?")) {
      return
    }
    setResettingAll(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_type: 'all' })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Agent settings successfully reset to factory defaults!")
      window.location.reload()
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to reset agent: " + err.message)
    } finally {
      setResettingAll(false)
    }
  }

  // Fetch real KPI stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const res = await fetch(`/api/agents/${agent.id}/stats`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error("Failed to fetch agent stats:", err)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    if (agent.id) {
      fetchStats()
    }
  }, [agent.id])

  // Listen for call-completed events from the voice hook to refresh dashboard
  useEffect(() => {
    const handleCallCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.agentId === agent.id) {
        // Refresh call stats and call list when a recording is uploaded
        fetchStats()
        fetchUsage()
        onRefreshCalls?.()
        // Staggered retries to catch backend-side async operations (lead extraction, transcript saving)
        setTimeout(() => onRefreshCalls?.(), 2000)
        setTimeout(() => onRefreshCalls?.(), 5000)
        setTimeout(() => { fetchStats(); fetchUsage() }, 3000)
      }
    }
    window.addEventListener('trinetra:call_completed', handleCallCompleted)
    return () => window.removeEventListener('trinetra:call_completed', handleCallCompleted)
  }, [agent.id, onRefreshCalls])

  // Initialize remaining seconds when modal opens — use backend agentUsage as single source of truth
  useEffect(() => {
    if (showCallModal) {
      clearTranscripts()
      let remainingSecs = 0
      const effectiveLimit = (agentUsage && agentUsage.effective_limit)
        ? agentUsage.effective_limit
        : (limit + emergencyMinutes)

      if (agentUsage && agentUsage.limit === 0) {
        // unlimited plan
        remainingSecs = 99999 * 60
      } else if (effectiveLimit > 0) {
        remainingSecs = Math.max(0, (effectiveLimit - used) * 60)
      } else {
        remainingSecs = Math.max(0, (limit - used) * 60)
      }
      setRemainingSeconds(remainingSecs)
      setMicPermissionError(null)
      if (remainingSecs <= 0) {
        setShowUpgradeModal(true)
      }
    }
  }, [showCallModal, agentUsage, limit, used, emergencyMinutes])

  // Track call connection state transitions
  useEffect(() => {
    if (connectionState === 'active') {
      setCallActive(true)
      callActiveRef.current = true
      // Start remaining seconds countdown
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            handleExhaustedTime()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (connectionState === 'ended' || connectionState === 'error' || connectionState === 'idle') {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      if (callActiveRef.current) {
        callActiveRef.current = false
        setCallActive(false)
        saveCallMinutes()
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      if (callActiveRef.current) {
        callActiveRef.current = false
        saveCallMinutes()
      }
    }
  }, [connectionState])

  const handleExhaustedTime = () => {
    endCall()
    setShowUpgradeModal(true)
    toast.error("Call minutes exhausted. Upgrade to continue.")
  }

  const saveCallMinutes = async () => {
    const secs = secondsConnectedRef.current
    if (secs <= 0) return
    const minsUsed = Math.ceil(secs / 60)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch fresh profile state to update accurately
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!freshProfile) return

      // The backend voice agent handles authoritative voice_calls creation,
      // full speech-to-text transcript saving, lead extraction, and audio recording attachment.
      // We do not insert a duplicate client-side placeholder record here.

      // 1. Save minutes limits updates
      const updates: any = {}
      if (agent.is_demo) {
        const currentDemoUsed = freshProfile.demo_minutes_used || 0
        const newDemoUsed = Math.min(limit, currentDemoUsed + minsUsed)
        updates.demo_minutes_used = newDemoUsed

        if ('demo_usage' in freshProfile) {
          const usage = (freshProfile as any).demo_usage || {}
          const toolKey = agent.agent_type || 'anika-voice'
          const toolUsage = usage[toolKey] || { minutes_used: 0, limit: limit }
          toolUsage.minutes_used = Math.min(toolUsage.limit || limit, (toolUsage.minutes_used || 0) + minsUsed)
          updates.demo_usage = {
            ...usage,
            [toolKey]: toolUsage
          }
        }
      } else {
        const agentTier = agent.config?.plan_tier || (freshProfile.plan_tier || 'free_demo').toLowerCase()
        if (agentTier === 'trial') {
          const currentConfig = agent.config || {}
          const currentUsed = currentConfig.minutes_used || 0
          const newConfig = {
            ...currentConfig,
            minutes_used: currentUsed + minsUsed
          }
          await supabase
            .from('agents')
            .update({ config: newConfig })
            .eq('id', agent.id)
        } else {
          const currentPaidUsed = freshProfile.paid_minutes_used || 0
          const newPaidUsed = Math.min(limit, currentPaidUsed + minsUsed)
          updates.paid_minutes_used = newPaidUsed
        }
      }

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (updatedProfile && onProfileUpdate) {
        onProfileUpdate(updatedProfile)
      }
      
      fetchUsage()
      fetchStats()
      onRefreshCalls?.()
      setTimeout(() => onRefreshCalls?.(), 2500)
      setTimeout(() => onRefreshCalls?.(), 5000)
      toast.success(`Call session completed (+${minsUsed} mins)`)
    } catch (err) {
      console.error("Failed to save call minutes:", err)
    }
  }

  const handleStartCall = async () => {
    if (remainingSeconds <= 0) {
      setShowUpgradeModal(true)
      return
    }

    // FIX 6: Pre-check microphone permission prior to starting LiveKit connection
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errMsg = "Your browser does not support microphone access. Please try a different browser."
      setMicPermissionError(errMsg)
      toast.error(errMsg)
      return
    }

    setMicPermissionError(null)
    clearTranscripts()
    const roomName = `room-${agent.id}-${Date.now().toString().slice(-6)}`

    try {
      toast.success(`Launching browser sandbox call...`)
      await startCall(roomName, 'ConsoleTester', agent.id)
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        const errMsg = "Microphone access is required to test voice calls. Please enable permission in your browser settings."
        setMicPermissionError(errMsg)
        toast.error("Microphone permission denied.")
      } else {
        toast.error("Failed to start call: " + err.message)
      }
    }
  }

  const getTranscriptString = (transcript: any): string => {
    if (!transcript) return ''
    if (typeof transcript === 'string') return transcript
    if (Array.isArray(transcript)) {
      return transcript
        .map((t: any) => {
          if (typeof t === 'string') return t
          if (t && typeof t === 'object') {
            const role = t.role || t.speaker || ''
            const text = t.content || t.text || ''
            return role ? `${role}: ${text}` : text
          }
          return String(t)
        })
        .join('\n')
    }
    if (typeof transcript === 'object') {
      try {
        return JSON.stringify(transcript)
      } catch {
        return String(transcript)
      }
    }
    return String(transcript)
  }

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format Duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format Date
  const formatCallDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return dateString
    }
  }

  const handleCopyPhone = () => {
    if (!agent.phone_number) return
    navigator.clipboard.writeText(agent.phone_number)
    toast.success('Phone number copied to clipboard')
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calls Today */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3 text-left">
          <div className="flex justify-between items-center text-[var(--muted)]">
            <span className="text-xs font-sans font-medium">Calls Today</span>
            <PhoneIncoming className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold font-display text-[var(--heading)]">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : stats.callsToday}
          </div>
        </div>

        {/* Minutes Used */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3 text-left">
          <div className="flex justify-between items-center text-[var(--muted)]">
            <span className="text-xs font-sans font-medium">Minutes Used (Month)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-display text-[var(--heading)]">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : `${stats.minutesUsed} min`}
          </div>
        </div>

        {/* Leads Generated */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3 text-left">
          <div className="flex justify-between items-center text-[var(--muted)]">
            <span className="text-xs font-sans font-medium">Leads Generated</span>
            <Users className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold font-display text-[var(--heading)]">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : stats.leadsGenerated}
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3 text-left">
          <div className="flex justify-between items-center text-[var(--muted)]">
            <span className="text-xs font-sans font-medium">Avg Call Duration</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-display text-[var(--heading)]">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : `${stats.avgDuration} min`}
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Recent Calls) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold font-display text-[var(--heading)] text-left">Recent Conversations</h2>
            <button 
              onClick={() => onTabChange('calls')} 
              className="text-xs font-montserrat font-bold text-violet-500 hover:text-violet-600 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            {callLogs.length === 0 ? (
              <div className="py-12 text-center text-xs font-sans text-[var(--body)]">
                No recent calls recorded.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] text-left">
                {callLogs.slice(0, 10).map((log) => {
                  const isExpanded = expandedCallId === log.id
                  const sentiment = (log.sentiment || 'neutral').toLowerCase()
                  const sentimentBadge = sentiment === 'positive' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                    : sentiment === 'negative' 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                      : 'bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)]'

                  return (
                    <div key={log.id} className="transition-all hover:bg-[var(--hover-bg)]/20">
                      <div 
                        onClick={() => setExpandedCallId(isExpanded ? null : log.id)}
                        className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-[var(--heading)] font-sans">
                            {formatCallDate(log.created_at)}
                          </div>
                          <div className="text-[10px] text-[var(--muted)] font-mono">
                            ID: {log.id.slice(0, 8)}...
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-sans text-[var(--body)] font-medium">
                            {formatDuration(log.duration_seconds)}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border font-montserrat ${sentimentBadge}`}>
                            {sentiment}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-[var(--background)]/30 border-t border-[var(--border)] space-y-2">
                          <h4 className="text-[10px] uppercase tracking-wider font-montserrat font-bold text-[var(--muted)]">Transcript:</h4>
                          <p className="text-xs font-sans text-[var(--body)] leading-relaxed bg-[var(--card-bg)] p-3 rounded-lg border border-[var(--border)] max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {getTranscriptString(log.transcript) || 'No transcript generated for this call.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Actions & Usage) */}
        <div className="space-y-6">
          {/* Calling Status Card */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold font-display text-[var(--heading)] text-left">Calling Status</h2>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4 text-left">
              <AgentCallingStatus 
                phoneNumber={agent.phone_number} 
                providerType={agent.telephony_provider} 
              />
              
              <div className="pt-3 border-t border-[var(--border)] space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider font-montserrat font-bold text-[var(--muted)]">Requirements for Real Calls:</h4>
                <ul className="text-xs text-[var(--body)] space-y-2 font-sans">
                  <li className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.phone_number ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={agent.phone_number ? 'text-[var(--heading)]' : 'text-[var(--muted)]'}>
                      Virtual Number Assigned {agent.phone_number ? '✅' : '❌'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.telephony_provider && agent.telephony_provider !== 'simulated' && agent.telephony_provider !== 'sandbox' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={agent.telephony_provider && agent.telephony_provider !== 'simulated' && agent.telephony_provider !== 'sandbox' ? 'text-[var(--heading)]' : 'text-[var(--muted)]'}>
                      Telephony Provider Active {agent.telephony_provider && agent.telephony_provider !== 'simulated' && agent.telephony_provider !== 'sandbox' ? '✅' : '❌'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold font-display text-[var(--heading)] text-left">Agent Usage</h2>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4 text-left">
              <div className="pb-3 border-b border-[var(--border)]">
                <span className="text-xs font-montserrat font-bold text-[var(--heading)] uppercase block mb-2">Plan Validity</span>
                <PlanValidityTimer
                  createdAt={agent.created_at}
                  expiresAt={agent.subscription_expires_at || agent.renewal_date}
                  validityDays={agent.validity_days || 30}
                  size="sm"
                  showProgress={true}
                />
              </div>
              {usageLoading ? (
                <div className="flex justify-center p-2"><Loader2 className="w-5 h-5 animate-spin text-[var(--muted)]" /></div>
              ) : agentUsage ? (
                (() => {
                  const availableEmergency = agentUsage.emergency_minutes_available || walletInfo.emergency_minutes_available || 0;
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-montserrat font-bold text-[var(--heading)] uppercase">Monthly Minutes</span>
                        <span className="text-xs font-mono text-[var(--muted)]">
                          {agentUsage.used} / {agentUsage.limit === 0 ? '∞' : agentUsage.limit} mins
                          {availableEmergency > 0 ? (
                            <span className="text-emerald-400 font-semibold ml-1">
                              (+{availableEmergency}m buffer)
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--background)] border border-[var(--border)] rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            agentUsage.status === 'exceeded' && availableEmergency === 0 ? 'bg-red-500' :
                            agentUsage.status === 'warning' ? 'bg-amber-500' : 'bg-violet-500'
                          }`}
                          style={{ width: `${Math.min(100, agentUsage.percent || 0)}%` }}
                        />
                      </div>

                      {/* 50-Min Emergency Minutes Subsystem (Section 18.9) */}
                      {availableEmergency > 0 ? (
                        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold text-[11px]">
                              50m Emergency Buffer Active
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-400/80 font-mono font-semibold">
                            {availableEmergency} mins remaining
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between text-xs">
                          <div className="flex flex-col text-left">
                            <span className="text-[11px] font-bold text-[var(--heading)] flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-400" /> Free Emergency Buffer
                            </span>
                            <span className="text-[10px] text-[var(--muted)]">
                              50m overdraft protection (Score: {walletInfo.reliability_score}/100)
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={claimingEmergency || walletInfo.reliability_score <= 80}
                            onClick={handleClaimEmergency}
                            className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition shadow-sm cursor-pointer disabled:opacity-40 shrink-0"
                          >
                            {claimingEmergency ? 'Claiming...' : 'Claim 50m'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-[var(--muted)]">Usage data unavailable.</div>
              )}
            </div>
          </div>

          <h2 className="text-lg font-bold font-display text-[var(--heading)] text-left">Quick Actions</h2>
          
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4 text-left">
            {/* Make Test Call */}
            <button 
              onClick={() => {
                clearTranscripts()
                setShowCallModal(true)
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 hover:bg-[var(--hover-bg)]/20 transition-all font-montserrat font-bold text-xs uppercase tracking-wider text-[var(--heading)] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4 text-violet-400" /> 
                {agent.phone_number && agent.telephony_provider && agent.telephony_provider !== 'simulated' && agent.telephony_provider !== 'sandbox' 
                  ? 'Make Call' 
                  : 'Test Call (Simulated)'}
              </span>
            </button>

            {/* Copy Phone Number */}
            {agent.phone_number ? (
              <button 
                onClick={handleCopyPhone}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 hover:bg-[var(--hover-bg)]/20 transition-all font-montserrat font-bold text-xs uppercase tracking-wider text-[var(--heading)] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-400" /> Copy Phone Number
                </span>
                <span className="text-[10px] font-mono text-[var(--muted)] lowercase">{agent.phone_number}</span>
              </button>
            ) : (
              <div 
                className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/20 opacity-60 font-montserrat font-bold text-xs uppercase tracking-wider text-[var(--muted)] select-none"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--muted)]" /> No Phone Assigned
                </span>
              </div>
            )}

            {/* Request Homepage Demo Placement (For Developers only) */}
            {profile?.role === 'developer_tester' && (
              <button 
                onClick={handleRequestHomepagePlacement}
                disabled={submittingRequest}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all font-montserrat font-bold text-xs uppercase tracking-wider text-violet-400 cursor-pointer animate-pulse"
              >
                <span className="flex items-center gap-2">
                  {submittingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Request Homepage Demo Placement
                </span>
              </button>
            )}

            {/* Reset Entire Agent */}
            <button 
              onClick={handleResetAll}
              disabled={resettingAll}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all font-montserrat font-bold text-xs uppercase tracking-wider text-red-500 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {resettingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Reset Entire Agent
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Test Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCloseCallModal} />
          <div className="relative w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left z-10">
            <button
              onClick={handleCloseCallModal}
              disabled={connectionState === 'active' || connectionState === 'connecting'}
              className="absolute top-4 right-4 p-2 text-[var(--muted)] hover:text-[var(--heading)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-30 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--heading)] font-display flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-violet-400" />
                  Browser Call Sandbox: {agent.agent_name}
                </h3>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Test your voice agent live in the browser using WebRTC audio and your microphone.
                </p>
              </div>

              {/* Remaining Quota indicator */}
              <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--body)] font-medium">Remaining Plan Minutes:</span>
                  {emergencyMinutes > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      +{emergencyMinutes} Claimed Emergency Mins Buffer
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${remainingSeconds < 120 ? 'text-amber-500 animate-pulse' : 'text-violet-500'}`}>
                    {formatTime(remainingSeconds)}
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    (Quota: {limit}m{emergencyMinutes > 0 ? ` + ${emergencyMinutes}m buffer` : ''} • Used: {used}m)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Controller (Left 2 cols) */}
                <div className="md:col-span-2 bg-[var(--background)]/40 border border-[var(--border)] rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-4 min-h-[200px] relative overflow-hidden">
                  {micPermissionError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[10px] text-red-500 font-sans leading-relaxed max-w-[180px] text-center mb-2">
                      <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                      {micPermissionError}
                    </div>
                  )}

                  {connectionState === 'idle' && (
                    <>
                      <button
                        onClick={handleStartCall}
                        className="w-16 h-16 rounded-full bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] flex items-center justify-center transition-all duration-305 shadow-md border border-[var(--border)] active:scale-[0.95] cursor-pointer"
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--heading)] font-montserrat">Start Call</h4>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5 leading-normal max-w-[120px] mx-auto">
                          Requires microphone permissions.
                        </p>
                      </div>
                    </>
                  )}

                  {connectionState === 'connecting' && (
                    <>
                      <div className="w-16 h-16 rounded-full border-4 border-[var(--border)] border-t-violet-405 animate-spin flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-[var(--muted)] animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--heading)] font-montserrat">Connecting...</h4>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">Initializing WebRTC...</p>
                      </div>
                    </>
                  )}

                  {connectionState === 'active' && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 w-16 h-16 bg-red-500/20 rounded-full animate-ping pointer-events-none scale-105" />
                        <button
                          onClick={() => {
                            endCall()
                            clearTranscripts()
                          }}
                          className="w-16 h-16 rounded-full bg-red-650 hover:bg-red-550 text-white flex items-center justify-center transition-all duration-300 shadow-md border-4 border-red-500/20 relative z-10 active:scale-[0.95] cursor-pointer"
                        >
                          <Square className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Connected: {formatTime(secondsConnected)}
                        </div>
                        <button
                          onClick={toggleMute}
                          className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border cursor-pointer ${
                            isMuted 
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                              : 'bg-[var(--background)] border-[var(--border)] text-[var(--body)] hover:text-[var(--heading)]'
                          }`}
                        >
                          {isMuted ? 'Unmute Mic' : 'Mute Mic'}
                        </button>
                      </div>
                    </>
                  )}

                  {connectionState === 'ended' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--heading)]">Call Ended</h4>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">Session logs synced.</p>
                        <button
                          onClick={handleStartCall}
                          className="mt-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] transition-all cursor-pointer"
                        >
                          Start New Call
                        </button>
                      </div>
                    </>
                  )}

                  {connectionState === 'error' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--heading)]">Connection Error</h4>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">Please try again.</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Live Transcripts (Right 3 cols) */}
                <div className="md:col-span-3 bg-[var(--background)]/20 border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-3 h-[200px]">
                  <h4 className="text-[10px] uppercase tracking-widest font-montserrat font-bold text-[var(--heading)] flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                    Live Conversation Feed
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {connectionState === 'active' && transcripts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                        <span className="text-[10px] font-mono text-[var(--muted)] animate-pulse">
                          Connecting to AI agent...
                        </span>
                      </div>
                    ) : transcripts.length === 0 ? (
                      <div className="text-center text-[var(--muted)] font-mono text-[10px] py-12">
                        Start call to stream transcript.
                      </div>
                    ) : (
                      transcripts.map((t, idx) => {
                        const isAgent = t.speaker.toLowerCase() === 'agent' || t.speaker.toLowerCase() === 'system'
                        return (
                          <div
                            key={t.id || idx}
                            className={`flex flex-col ${!isAgent ? 'items-end' : 'items-start'}`}
                          >
                            <span className="text-[9px] text-[var(--muted)] font-semibold uppercase tracking-wider px-1 mb-1">
                              {!isAgent ? 'You' : (agent?.name || 'Agent')}
                            </span>
                            <div
                              className={`max-w-[85%] rounded-xl px-3 py-1.5 text-[11px] leading-normal border border-[var(--border)] ${
                                !isAgent
                                  ? 'bg-[var(--primary-bg)] text-[var(--heading)] rounded-tr-none'
                                  : 'bg-[var(--card-bg)] text-[var(--body)] rounded-tl-none'
                              }`}
                            >
                              <p>{t.text}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quota Expired Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center space-y-6 z-20">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[var(--heading)] font-display">Demo Limit Reached</h3>
              <p className="text-xs text-[var(--body)] leading-relaxed">
                You have exhausted your free sandbox quota for this agent. Start a subscription trial to continue.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  clearTranscripts()
                  setShowUpgradeModal(false)
                  setShowCallModal(false)
                  router.push('/dashboard/billing')
                }}
                className="flex-1 py-3 bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Upgrade Plan
              </button>
              <button
                onClick={() => {
                  clearTranscripts()
                  setShowUpgradeModal(false)
                  setShowCallModal(false)
                }}
                className="px-5 py-3 bg-transparent border border-[var(--border)] text-[var(--body)] hover:text-[var(--heading)] font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
