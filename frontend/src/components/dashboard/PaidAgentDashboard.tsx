'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  vapi_agent_id: string
}

interface CallLog {
  id: string
  duration_seconds: number
  sentiment: string | null
  created_at: string
}

interface PaidAgentDashboardProps {
  userName: string
  userAgents: UserAgent[]
  callLogs: CallLog[]
  formatCreatedAt: (dateString: string) => string
  formatDuration: (seconds: number) => string
}

export function PaidAgentDashboard({
  userName,
  userAgents,
  callLogs,
  formatCreatedAt,
  formatDuration
}: PaidAgentDashboardProps) {
  const router = useRouter()

  // Aggregate stats from call history arrays
  const totalInteractions = callLogs.length
  const activeAgentsCount = userAgents.filter(agent => agent.status === 'active').length
  const totalDurationSeconds = callLogs.reduce((acc, log) => acc + (log.duration_seconds || 0), 0)
  const avgSeconds = totalInteractions > 0 ? totalDurationSeconds / totalInteractions : 0
  const averageDurationStr = formatDuration(avgSeconds)
  const positiveOutcomesCount = callLogs.filter(log => log.sentiment?.toLowerCase() === 'positive').length

  const topupUrl = "https://wa.me/919452045499?text=Hi,%20my%20AI%20agents%20are%20paused%20due%20to%20usage%20limits.%20I%20would%20like%20to%20purchase%20more%20minutes"

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Dynamic Header */}
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-white font-display">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">{userName}</span>
        </h1>
        <p className="text-gray-400 text-sm">Here is the latest live intel on your custom production agents.</p>
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
      <div className="w-full bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
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
              <Plus className="w-4 h-4" /> Deploy Agent
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {userAgents.map((agent) => (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.vapi_agent_id}`}
              className="bg-black/30 border border-white/[0.04] rounded-xl p-4 hover:border-amber-500/20 transition-all group flex flex-col justify-between h-[120px] cursor-pointer animate-in fade-in"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-bold text-sm tracking-wide group-hover:text-amber-500 transition-colors">{agent.agent_name}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 block">
                    Live Deployment
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
                <span className="text-zinc-500 text-[11px] font-mono">ID: {agent.vapi_agent_id ? agent.vapi_agent_id.slice(0, 8) : agent.id.slice(0, 8)}...</span>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push('/dashboard/demo');
                  }}
                  className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors relative z-10"
                >
                  Test Portal <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
