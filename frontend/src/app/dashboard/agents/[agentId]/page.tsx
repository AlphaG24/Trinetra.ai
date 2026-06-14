'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { 
  ArrowLeft, 
  Activity, 
  Bot, 
  Clock, 
  Sparkles, 
  Phone, 
  ChevronRight, 
  Volume2,
  Calendar,
  Copy,
  Check,
  Play,
  Pause
} from 'lucide-react'
import { toast } from 'sonner'
import { TranscriptModal } from '@/src/components/modals/TranscriptModal'
import { QuotaBanner } from '@/src/components/dashboard/QuotaBanner'

interface UserAgent {
  id: string
  agent_name: string
  agent_type: string
  status: string
  vapi_agent_id: string
}

interface CallLog {
  id: string
  duration_seconds: number
  sentiment: string | null
  transcript: string | null
  recording_url: string | null
  created_at: string
}

export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params?.agentId as string

  const [loading, setLoading] = useState(true)
  const [agent, setAgent] = useState<UserAgent | null>(null)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [copied, setCopied] = useState(false)
  const [paidUsed, setPaidUsed] = useState<number | null>(null)
  const [paidLimit, setPaidLimit] = useState<number | null>(null)
  
  // Transcript modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null)

  // Audio playing state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  const formatCreatedAt = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString

      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      
      const yesterday = new Date()
      yesterday.setDate(now.getDate() - 1)
      const isYesterday = date.toDateString() === yesterday.toDateString()

      const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
      const timeStr = date.toLocaleTimeString('en-US', options)

      if (isToday) {
        return `Today, ${timeStr}`
      } else if (isYesterday) {
        return `Yesterday, ${timeStr}`
      } else {
        const monthOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
        const dateStr = date.toLocaleDateString('en-US', monthOptions)
        return `${dateStr}, ${timeStr}`
      }
    } catch {
      return dateString
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCopyAgentId = () => {
    if (!agentId) return
    navigator.clipboard.writeText(agentId)
    setCopied(true)
    toast.success('Agent ID copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePlayAudio = (logId: string, url: string) => {
    if (playingAudioId === logId) {
      if (audioElement) {
        audioElement.pause()
        setPlayingAudioId(null)
      }
    } else {
      if (audioElement) {
        audioElement.pause()
      }
      const newAudio = new Audio(url)
      newAudio.play()
      newAudio.onended = () => setPlayingAudioId(null)
      setAudioElement(newAudio)
      setPlayingAudioId(logId)
    }
  }

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause()
      }
    }
  }, [audioElement])

  // Core data-fetching logic extracted into a reusable callback.
  // `silent` = true skips the loading spinner (used for background polls).
  const fetchAgentData = useCallback(async (silent: boolean) => {
    try {
      if (!silent) setLoading(true)
      const supabase = createClient()

      // 1. Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        if (!silent) router.push('/login')
        return
      }

      // 2. Fetch agent from user_agents
      const { data: agentData, error: agentErr } = await supabase
        .from('user_agents')
        .select('id, agent_name, agent_type, status, vapi_agent_id')
        .eq('vapi_agent_id', agentId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (agentErr) throw agentErr
      
      if (!agentData) {
        if (!silent) {
          toast.error("Agent not found or unauthorized access.")
          router.push('/dashboard')
        }
        return
      }

      setAgent(agentData)

      // 3. Fetch call logs matching this agent
      const { data: logsData, error: logsErr } = await supabase
        .from('agent_call_logs')
        .select('id, duration_seconds, sentiment, transcript, recording_url, created_at')
        .eq('vapi_agent_id', agentId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (logsErr) throw logsErr
      setCallLogs(logsData || [])

      // 4. Fetch paid quota from profiles
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('paid_minutes_used, paid_minutes_limit')
        .eq('id', user.id)
        .single()

      if (!profileErr && profileData) {
        setPaidUsed(profileData.paid_minutes_used ?? 0)
        setPaidLimit(profileData.paid_minutes_limit ?? 100)
      }

    } catch (err) {
      // Only surface errors on the initial (non-silent) load.
      // Background polls fail silently to avoid spamming the user.
      if (!silent) {
        console.error("Error loading agent details:", err)
        toast.error("Failed to load agent metrics and history.")
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [agentId, router])

  // Initial data fetch on mount
  useEffect(() => {
    if (!agentId) return
    fetchAgentData(false)
  }, [agentId, fetchAgentData])

  // Background polling heartbeat — silently refreshes every 5 seconds
  useEffect(() => {
    if (!agentId) return

    const intervalId = setInterval(() => {
      fetchAgentData(true)
    }, 5000)

    return () => clearInterval(intervalId)
  }, [agentId, fetchAgentData])

  // Aggregate stats
  const totalInteractions = callLogs.length
  const totalDurationSeconds = callLogs.reduce((acc, log) => acc + (log.duration_seconds || 0), 0)
  const avgSeconds = totalInteractions > 0 ? totalDurationSeconds / totalInteractions : 0
  const averageDurationStr = formatDuration(avgSeconds)
  const positiveOutcomesCount = callLogs.filter(log => log.sentiment?.toLowerCase() === 'positive').length

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-6 w-32 bg-zinc-800 rounded mb-6" />
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-zinc-800 rounded-full" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-zinc-800 rounded" />
            <div className="h-4 w-32 bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-[#0f1117] border border-white/5 rounded-2xl p-5" />
          ))}
        </div>
        <div className="h-96 bg-[#0f1117] border border-white/5 rounded-2xl" />
      </div>
    )
  }

  if (!agent) return null

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-2">
      {/* Back to Overview */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-mono group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>
      </div>

      {/* Agent Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1117]/60 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display">{agent.agent_name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-1.5">
                <span>ID: {agentId}</span>
                <button 
                  onClick={handleCopyAgentId}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border ${
            agent.status === 'active' 
              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
              : agent.status === 'training'
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              : 'bg-zinc-500/10 text-zinc-400 border-white/10'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              agent.status === 'active' 
                ? 'bg-green-500 animate-pulse' 
                : agent.status === 'training'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-zinc-500'
            }`} />
            {agent.status === 'active' ? 'ONLINE' : agent.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Quota Banner */}
      <QuotaBanner />

      {/* Quota Progress Bar */}
      {paidUsed !== null && paidLimit !== null && (
        <div className="bg-[#0f1117]/80 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col gap-3 shadow-xl min-h-[78px] justify-center animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase tracking-widest font-bold">
              Usage Quota
            </span>
            <span className="text-white font-semibold">
              {paidUsed.toFixed(1)} / {paidLimit} Minutes Used
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                paidLimit > 0 && (paidUsed / paidLimit) >= 0.8
                  ? 'bg-gradient-to-r from-red-500 to-pink-600'
                  : paidLimit > 0 && (paidUsed / paidLimit) >= 0.5
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600'
              }`}
              style={{ width: `${paidLimit > 0 ? Math.min(100, (paidUsed / paidLimit) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Total Interactions */}
        <div className="bg-[#0f1117]/90 border border-amber-500/10 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300 shadow-xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Total Interactions</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white font-mono">{totalInteractions}</span>
            <p className="text-xs text-zinc-500 mt-1">Live voice calls connected</p>
          </div>
        </div>

        {/* KPI 2: Average Duration */}
        <div className="bg-[#0f1117]/90 border border-purple-500/10 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/20 transition-all duration-300 shadow-xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Average Duration</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white font-mono">{averageDurationStr}</span>
            <p className="text-xs text-zinc-500 mt-1">M:SS average conversation</p>
          </div>
        </div>

        {/* KPI 3: Positive Outcomes */}
        <div className="bg-[#0f1117]/90 border border-emerald-500/10 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300 shadow-xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Positive Outcomes</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white font-mono">{positiveOutcomesCount}</span>
            <p className="text-xs text-zinc-500 mt-1">Highly cooperative sentiments</p>
          </div>
        </div>
      </div>

      {/* Call History */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <Volume2 className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold text-white">Call History</h2>
            <span className="text-zinc-500 text-[10px] block font-mono uppercase mt-0.5">Recent log sessions for this agent</span>
          </div>
        </div>

        {callLogs.length === 0 ? (
          <div className="h-[280px] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 text-center text-zinc-500 font-mono text-sm">
            No call records registered under this agent yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 text-xs font-mono uppercase tracking-wider">
                  <th className="pb-3 pt-1 pl-2 font-medium">Session Time</th>
                  <th className="pb-3 pt-1 font-medium">Duration</th>
                  <th className="pb-3 pt-1 font-medium">Sentiment</th>
                  <th className="pb-3 pt-1 font-medium">Audio</th>
                  <th className="pb-3 pt-1 pr-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-sm">
                {callLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="py-4 pl-2 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {formatCreatedAt(log.created_at)}
                      </div>
                    </td>
                    <td className="py-4 font-mono text-zinc-300">
                      {formatDuration(log.duration_seconds || 0)}
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.sentiment?.toLowerCase() === 'positive'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : log.sentiment?.toLowerCase() === 'negative'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border border-white/5'
                      }`}>
                        {log.sentiment || 'Neutral'}
                      </span>
                    </td>
                    <td className="py-4">
                      {log.recording_url ? (
                        <button
                          onClick={() => handlePlayAudio(log.id, log.recording_url!)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer animate-in fade-in"
                        >
                          {playingAudioId === log.id ? (
                            <>
                              <Pause className="w-3 h-3 text-amber-500 animate-pulse" />
                              Playing
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              Play Audio
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-zinc-600 text-xs font-mono italic">No Audio</span>
                      )}
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log)
                          setIsModalOpen(true)
                        }}
                        className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer"
                      >
                        View Transcript
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transcript Expansion Modal */}
      {selectedLog && (
        <TranscriptModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedLog(null)
          }}
          log={selectedLog}
        />
      )}
    </div>
  )
}
