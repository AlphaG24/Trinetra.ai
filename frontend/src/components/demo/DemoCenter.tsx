'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, FileText, Bot, FlaskConical, AlertTriangle, Loader2 } from 'lucide-react'
import { VoiceDemo } from './VoiceDemo'
import { TranscriptModal } from '../modals/TranscriptModal'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"

interface Agent {
  agent_type: string
  vapi_id?: string | null
  [key: string]: unknown
}

interface CallLog {
  id: string
  duration_seconds: number
  transcript: string | null
  recording_url: string | null
  sentiment: string | null
  created_at: string
}

interface DemoCenterProps {
  agents: Agent[]
}

export function DemoCenter({ agents }: DemoCenterProps) {
  const [minutesUsed, setMinutesUsed] = useState<number>(0)
  const [minutesLimit, setMinutesLimit] = useState<number>(20)
  const [assignedVapiAgentId, setAssignedVapiAgentId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Real Call History States
  const [demoHistory, setDemoHistory] = useState<CallLog[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null)

  const warned50Ref = useRef(false)
  const warned80Ref = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch demo quota
  const fetchQuota = async (activeUserId?: string) => {
    try {
      const targetUserId = activeUserId || userId
      if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('demo_minutes_used, demo_minutes_limit, assigned_vapi_agent_id')
        .eq('id', targetUserId)
        .single()

      if (data && !error) {
        setMinutesUsed(data.demo_minutes_used ?? 0)
        setMinutesLimit(data.demo_minutes_limit ?? 20)
        setAssignedVapiAgentId(data.assigned_vapi_agent_id ?? null)
      }
    } catch (err) {
      console.error('Error fetching demo quota:', err)
    }
  }

  // Fetch Call History logs from backend
  const fetchHistory = async (activeUserId?: string) => {
    try {
      setIsLoadingHistory(true)
      const targetUserId = activeUserId || userId
      if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
        setIsLoadingHistory(false)
        return
      }

      const response = await fetch(`${FASTAPI_URL}/api/voice/history/${targetUserId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`)
      }

      const resData = await response.json()
      console.log("DEBUG: Test History Data Received:", resData)

      let historyList: CallLog[] = []
      if (Array.isArray(resData)) {
        historyList = resData
      } else if (resData && Array.isArray(resData.data)) {
        historyList = resData.data
      } else if (resData && Array.isArray(resData.calls)) {
        historyList = resData.calls
      } else if (resData && resData.status === 'success' && Array.isArray(resData.data)) {
        historyList = resData.data
      }

      setDemoHistory(historyList)
    } catch (err) {
      console.error("Error fetching call history:", err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Fetch quota and history on load and listen to auth changes
  useEffect(() => {
    const supabase = createClient()
    
    // Fetch immediately
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        setUserId(user.id)
        fetchQuota(user.id)
        fetchHistory(user.id)
      }
    }
    checkUser()

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id)
        fetchQuota(session.user.id)
        fetchHistory(session.user.id)
      } else {
        setUserId(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Trigger toast warnings
  useEffect(() => {
    if (minutesLimit <= 0) return
    const percentage = (minutesUsed / minutesLimit) * 100

    if (percentage >= 80 && !warned80Ref.current) {
      toast.warning(`Warning: You have used ${percentage.toFixed(0)}% of your demo minutes (${minutesUsed.toFixed(1)}/${minutesLimit} min used).`, {
        description: "Please consider upgrading or booking a call to increase your limit."
      })
      warned80Ref.current = true
    } else if (percentage >= 50 && !warned50Ref.current) {
      toast.info(`Notice: You have used ${percentage.toFixed(0)}% of your demo minutes (${minutesUsed.toFixed(1)}/${minutesLimit} min used).`, {
        description: "Your session quota is running low."
      })
      warned50Ref.current = true
    }
  }, [minutesUsed, minutesLimit])

  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const isLimitReached = minutesUsed >= minutesLimit

  // Format created_at to a human readable UI format (e.g., "Today, 2:30 PM" or "May 1, 10:15 AM")
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

  // Convert duration_seconds to M:SS (e.g. 125 seconds -> 2:05)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Map backend string sentiments to styled emojis
  const getSentimentEmoji = (sentiment: string | null) => {
    if (!sentiment) return "😐 Neutral"
    const lower = sentiment.toLowerCase()
    if (lower.includes("positive") || lower.includes("good") || lower.includes("happy")) {
      return "😊 Positive"
    }
    if (lower.includes("negative") || lower.includes("bad") || lower.includes("sad") || lower.includes("angry")) {
      return "😢 Negative"
    }
    return `😐 ${sentiment}`
  }

  // Play call recording audio via browser Audio class
  const handlePlayRecording = (id: string, url: string | null) => {
    if (!url) {
      toast.error("No recording URL available for this call.")
      return
    }

    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      audioRef.current = new Audio(url)
      audioRef.current.play().catch((err: any) => {
        console.error("Audio playback error:", err)
        toast.error("Failed to play recording audio.")
        setPlayingId(null)
      })
      setPlayingId(id)
      audioRef.current.onended = () => {
        setPlayingId(null)
      }
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          {assignedVapiAgentId ? (
            <>
              <Bot className="w-6 h-6 text-violet-400 shrink-0" /> Your Active AI Workforce
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Status: Online
              </span>
            </>
          ) : (
            <>
              <FlaskConical className="w-6 h-6 text-amber-400 shrink-0" /> Test Your AI Agent
            </>
          )}
        </h1>
        <p className="text-gray-400 text-sm">
          {assignedVapiAgentId 
            ? "Your enterprise voice agents are active, online, and connected to your custom workflows."
            : "Hear and see your AI agent in action before sharing with customers"
          }
        </p>
      </div>

      {/* Demo Quota Progress Bar (Hidden for Paid Users) */}
      {!assignedVapiAgentId && (
        <div className="bg-[#0f1117]/80 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase tracking-widest font-bold">Demo Quota</span>
            <span className="text-white font-semibold">
              {minutesUsed.toFixed(1)} / {minutesLimit} Minutes Used
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (minutesUsed / (minutesLimit || 20)) >= 0.8
                  ? 'bg-gradient-to-r from-red-500 to-pink-600'
                  : (minutesUsed / (minutesLimit || 20)) >= 0.5
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600'
              }`}
              style={{ width: `${Math.min(100, (minutesUsed / (minutesLimit || 20)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Trial Complete Overlay Banner (Hidden for Paid Users) */}
      {!assignedVapiAgentId && isLimitReached && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-950/40 to-amber-950/40 border border-red-500/20 backdrop-blur-md rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Trial Complete</h3>
              <p className="text-zinc-400 text-sm max-w-lg mt-0.5">
                Ready to deploy your own autonomous agent? Upgrade or schedule an onboarding call to continue testing without limits.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-start md:justify-end">
            <a
              href="/dashboard/billing"
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-purple-500/20 text-center flex-1 md:flex-initial"
            >
              Upgrade & Deploy
            </a>
            <a
              href="/appointments"
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white font-semibold text-sm rounded-xl transition-all text-center flex-1 md:flex-initial"
            >
              Book Appointment
            </a>
          </div>
        </div>
      )}

      <VoiceDemo 
        agentPhone="+1 (341) 441-8499" 
        disabled={!assignedVapiAgentId && isLimitReached}
        assignedVapiAgentId={assignedVapiAgentId}
        onCallStarted={(used: number, limit: number) => {
          setMinutesUsed(used)
          setMinutesLimit(limit)
        }}
        onCallEnded={fetchHistory}
      />

      {/* Recent Test History Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Recent Test History</h2>
        <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-white/50 uppercase bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date/Time</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Sentiment</th>
                  <th className="px-6 py-4 font-semibold">Key Action</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-mono text-sm">
                      <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block text-zinc-500" /> Ingesting call logs...
                    </td>
                  </tr>
                ) : demoHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-mono text-sm">
                      No test calls yet. Start a call above to begin!
                    </td>
                  </tr>
                ) : (
                  demoHistory.map((demo) => (
                    <tr key={demo.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        {formatCreatedAt(demo.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400">
                          Voice
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {formatDuration(demo.duration_seconds || 0)}
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {getSentimentEmoji(demo.sentiment)}
                      </td>
                      <td className="px-6 py-4 text-white/70 font-mono text-xs">
                        Voice Sandbox Call
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Play / Pause audio recording */}
                          <button 
                            onClick={() => handlePlayRecording(demo.id, demo.recording_url)}
                            className={`p-1.5 rounded transition-colors ${
                              playingId === demo.id 
                                ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' 
                                : 'text-white/40 hover:text-white hover:bg-white/10'
                            }`}
                            title={playingId === demo.id ? "Pause Recording" : "Play Recording"}
                            disabled={!demo.recording_url}
                          >
                            {playingId === demo.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>

                          {/* View transcript popup */}
                          <button 
                            onClick={() => setSelectedCall(demo)}
                            className={`p-1.5 rounded transition-colors ${
                              demo.transcript 
                                ? 'text-white/40 hover:text-white hover:bg-white/10' 
                                : 'text-zinc-600 cursor-not-allowed'
                            }`}
                            title="View Transcript"
                            disabled={!demo.transcript}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>


      {/* Full Call Transcript Terminal Modal */}
      <TranscriptModal
        isOpen={selectedCall !== null}
        onClose={() => setSelectedCall(null)}
        transcript={selectedCall?.transcript || null}
        recordingUrl={selectedCall?.recording_url || null}
        callerName="Voice Sandbox Call"
      />
    </div>
  )
}
