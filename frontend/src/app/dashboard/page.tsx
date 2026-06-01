'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  Activity, 
  Bot, 
  Clock, 
  Sparkles, 
  Phone, 
  ArrowUpRight, 
  ChevronRight, 
  Plus, 
  Volume2
} from 'lucide-react'
import { toast } from 'sonner'

interface UserAgent {
  id: string
  agent_name: string
  agent_type: string
  status: string
}

interface CallLog {
  id: string
  duration_seconds: number
  sentiment: string | null
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Commander')
  const [userAgents, setUserAgents] = useState<UserAgent[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // 1. Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/login')
          return
        }

        // Parse user name
        const name = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Commander'
        setUserName(name)

        // 2. Fetch real data from user_agents and agent_call_logs in parallel
        const [agentsRes, logsRes] = await Promise.all([
          supabase
            .from('user_agents')
            .select('id, agent_name, agent_type, status')
            .eq('user_id', user.id),
          supabase
            .from('agent_call_logs')
            .select('id, duration_seconds, sentiment, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ])

        if (agentsRes.error) throw agentsRes.error
        if (logsRes.error) throw logsRes.error

        setUserAgents(agentsRes.data || [])
        setCallLogs(logsRes.data || [])
      } catch (err) {
        console.error("Error fetching dashboard overview data:", err)
        toast.error("Failed to load real-time dashboard data.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  // Aggregate stats from real state arrays
  const totalInteractions = callLogs.length
  
  const activeAgentsCount = userAgents.filter(agent => agent.status === 'active').length

  const totalDurationSeconds = callLogs.reduce((acc, log) => acc + (log.duration_seconds || 0), 0)
  const avgSeconds = totalInteractions > 0 ? totalDurationSeconds / totalInteractions : 0
  const averageDurationStr = formatDuration(avgSeconds)

  const positiveOutcomesCount = callLogs.filter(log => log.sentiment?.toLowerCase() === 'positive').length

  // Render Premium Skeleton Loaders during mount phase
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-2 mb-2">
          <div className="h-9 w-64 bg-zinc-800 rounded-lg" />
          <div className="h-4 w-96 bg-zinc-800/60 rounded" />
        </div>

        {/* Stats Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-[#0f1117]/90 border border-white/5 rounded-2xl p-5" />
          ))}
        </div>

        {/* Two Column Layout Skeletons */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 h-[450px] bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6" />
          <div className="xl:col-span-2 h-[450px] bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">{userName}</span>
        </h1>
        <p className="text-gray-400 text-sm">Here is the latest live intel on your custom autonomous workforce.</p>
      </div>

      {/* Real-time calculated KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Interactions */}
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

        {/* Card 2: Active Agents */}
        <div className="bg-[#0f1117]/90 border border-green-500/10 rounded-2xl p-5 relative overflow-hidden group hover:border-green-500/20 transition-all duration-300 shadow-xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Active Agents</span>
            <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white font-mono">{activeAgentsCount}</span>
              <span className="text-xs font-semibold text-green-400">/ {userAgents.length}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Online & handling volume</p>
          </div>
        </div>

        {/* Card 3: Average Duration */}
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

        {/* Card 4: Positive Outcomes */}
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

      {/* Main Core Dashboard Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Left Column: Your AI Agents */}
        <div className="xl:col-span-3 bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-white">Your AI Agents</h2>
            </div>
            {userAgents.length > 0 && (
              <button 
                onClick={() => router.push('/dashboard/deploy')}
                className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Workforce
              </button>
            )}
          </div>

          {userAgents.length === 0 ? (
            <div className="h-[280px] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-400 mb-4 border border-white/5">
                <Bot className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-white font-semibold text-base">No agents deployed yet</h3>
              <p className="text-zinc-400 text-sm max-w-sm mt-1 mb-6">
                Tell us about your business goals. We will design a custom autonomous AI agent tailored to your exact workflows.
              </p>
              <button
                onClick={() => router.push('/dashboard/deploy')}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20 text-white font-semibold py-2 px-5 rounded-xl text-sm flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> Deploy Custom Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              {userAgents.map((agent) => (
                <div 
                  key={agent.id} 
                  className="bg-black/30 border border-white/[0.04] rounded-xl p-4 hover:border-amber-500/20 transition-all group flex flex-col justify-between h-[120px]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-white font-bold text-sm tracking-wide">{agent.agent_name}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 block">
                        {agent.agent_type || 'Voice'} Workforce
                      </span>
                    </div>
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                        agent.status === 'active' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : agent.status === 'training'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-white/10'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          agent.status === 'active' 
                            ? 'bg-green-500 animate-pulse' 
                            : agent.status === 'training'
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-zinc-500'
                        }`} />
                        {agent.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.03] pt-2.5">
                    <span className="text-zinc-500 text-[11px] font-mono">ID: {agent.id.slice(0, 8)}...</span>
                    <button 
                      onClick={() => router.push('/dashboard/demo')}
                      className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      Test Portal <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity / Interactions */}
        <div className="xl:col-span-2 bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Volume2 className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <span className="text-zinc-500 text-[10px] block font-mono uppercase mt-0.5">Top 5 Voice Sessions</span>
            </div>
          </div>

          {callLogs.length === 0 ? (
            <div className="h-[280px] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 text-center text-zinc-500 font-mono text-sm">
              No interactions yet. Start a test call in the Test Portal to begin logging activity!
            </div>
          ) : (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              {callLogs.slice(0, 5).map((log) => (
                <div 
                  key={log.id} 
                  className="p-3 bg-black/20 border border-white/[0.03] rounded-xl flex items-center justify-between hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-zinc-800/40 rounded-lg flex items-center justify-center border border-white/5 text-zinc-400 group-hover:text-amber-500 group-hover:border-amber-500/20 transition-all">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-white text-xs font-semibold block">{formatCreatedAt(log.created_at)}</span>
                      <span className="text-zinc-500 text-[10px] font-mono mt-0.5 block">
                        Duration: {formatDuration(log.duration_seconds || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Sentiment Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      log.sentiment?.toLowerCase() === 'positive'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : log.sentiment?.toLowerCase() === 'negative'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border border-white/5'
                    }`}>
                      {log.sentiment || 'Neutral'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
