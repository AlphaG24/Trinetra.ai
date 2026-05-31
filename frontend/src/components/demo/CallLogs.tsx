'use client'

import { useState, useEffect } from 'react'
import { Phone, Clock, FileText, TrendingUp } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { TranscriptModal } from '../modals/TranscriptModal'
import { toast } from 'sonner'

interface CallLog {
  id: string
  duration_seconds: number
  sentiment: string | null
  transcript: string | null
  recording_url: string | null
  created_at: string
  caller_name?: string | null
}

export default function CallLogs() {
  const [logs, setLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function fetchCallLogs() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // 1. Resolve current authenticated user session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          toast.error("Authentication required to load analytics data.")
          return
        }

        // 2. Query latest 20 logs from agent_call_logs table
        const { data, error } = await supabase
          .from('agent_call_logs')
          .select('id, duration_seconds, sentiment, transcript, recording_url, created_at, caller_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        setLogs(data || [])
      } catch (err: any) {
        console.error("Error fetching call logs:", err)
        toast.error("Failed to load real-time telemetry data.")
      } finally {
        setLoading(false)
      }
    }

    fetchCallLogs()
  }, [])

  // Human-readable Date/Time UI formatter
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return dateString
    }
  }

  // Double-digit padding helper for talk durations (MM:SS)
  const formatMMSS = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Real-time telemetry calculations
  const totalCalls = logs.length
  const totalTalkTimeSeconds = logs.reduce((acc, log) => acc + (log.duration_seconds || 0), 0)
  const totalTalkTime = formatMMSS(totalTalkTimeSeconds)

  const leadConversionCount = logs.filter(log => log.sentiment?.toLowerCase() === 'positive').length
  const leadConversionRate = totalCalls > 0 ? ((leadConversionCount / totalCalls) * 100).toFixed(1) : '0.0'

  const handleOpenTranscript = (log: CallLog) => {
    setSelectedLog(log)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6 text-zinc-100">
      {/* Premium Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Card 1: Total Calls */}
        <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-black/40 hover:border-indigo-500/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">Total Calls</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Phone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-9 w-20 bg-zinc-800/60 animate-pulse rounded-lg" />
            ) : (
              <span className="text-3xl font-bold font-mono text-white">{totalCalls}</span>
            )}
            <p className="text-xs text-zinc-500 mt-1">Total sandbox calls logged</p>
          </div>
        </div>

        {/* Metric Card 2: Total Talk Time */}
        <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-black/40 hover:border-purple-500/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">Total Talk Time</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-9 w-28 bg-zinc-800/60 animate-pulse rounded-lg" />
            ) : (
              <span className="text-3xl font-bold font-mono text-white">{totalTalkTime}</span>
            )}
            <p className="text-xs text-zinc-500 mt-1">Formatted talk time duration (MM:SS)</p>
          </div>
        </div>

        {/* Metric Card 3: Lead Conversion Rate */}
        <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-black/40 hover:border-emerald-500/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">Lead Conversion Rate</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-9 w-24 bg-zinc-800/60 animate-pulse rounded-lg" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold font-mono text-white">{leadConversionRate}%</span>
                <span className="text-xs font-semibold text-emerald-400">({leadConversionCount} / {totalCalls})</span>
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-1">Positive sentiment capture rate</p>
          </div>
        </div>
      </div>

      {/* Telemetry Log Table */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="text-xl">🗂️</span> Enterprise Call Ledger
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border bg-black/40 border-white/10 text-zinc-400">
            Latest 20 Records
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs font-mono uppercase tracking-widest text-zinc-400 bg-white/[0.02]">
                <th className="py-4 px-6 font-bold">Date & Time</th>
                <th className="py-4 px-6 font-bold">Duration</th>
                <th className="py-4 px-6 font-bold">Call Outcome</th>
                <th className="py-4 px-6 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                // Custom skeleton loading states
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.02]">
                    <td className="py-4 px-6"><div className="h-4 w-40 bg-zinc-800/60 animate-pulse rounded" /></td>
                    <td className="py-4 px-6"><div className="h-4 w-16 bg-zinc-800/60 animate-pulse rounded" /></td>
                    <td className="py-4 px-6"><div className="h-6 w-28 bg-zinc-800/60 animate-pulse rounded-full" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 w-28 bg-zinc-800/60 animate-pulse rounded-xl inline-block" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 px-6 text-center text-zinc-500 font-mono text-sm">
                    No active call logs found. Deploy and talk to an agent to populate logs.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isPositive = log.sentiment?.toLowerCase() === 'positive'
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 text-sm font-semibold text-zinc-300">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-4 px-6 text-sm font-mono text-zinc-400">
                        {formatMMSS(log.duration_seconds || 0)}
                      </td>
                      <td className="py-4 px-6">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Lead Captured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800/40 text-zinc-400 border border-zinc-700/60 select-none">
                            Standard Call
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenTranscript(log)}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700/80 text-zinc-300 hover:text-white font-semibold text-xs rounded-xl shadow-md transition-all duration-300 cursor-pointer flex items-center gap-1.5 ml-auto font-mono"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Transcript
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Transcript Modal Overlay integration */}
      {selectedLog && (
        <TranscriptModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedLog(null)
          }}
          log={{
            duration_seconds: selectedLog.duration_seconds,
            transcript: selectedLog.transcript,
            recording_url: selectedLog.recording_url,
            caller_name: selectedLog.caller_name || 'Voice Sandbox Call'
          }}
        />
      )}
    </div>
  )
}
