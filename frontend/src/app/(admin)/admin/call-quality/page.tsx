'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { 
  ShieldCheck, Loader2, RefreshCw, Download, 
  Search, AlertTriangle, AlertCircle, Clock, Heart, Play, Eye
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface QualityLog {
  id: string
  created_at: string
  caller_phone: string
  duration_seconds: number
  agent_name: string
  sentiment: string
  outcome: string
  quality_score: number
  is_hallucinated: boolean
  duration_anomaly: 'none' | 'short_call' | 'long_call'
}

export default function CallQualityPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/call-quality', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [anomalyFilter, setAnomalyFilter] = useState('all')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const logs: QualityLog[] = data?.logs || []
  const summary = data?.summary || {
    total_calls: 0,
    avg_quality_score: 100,
    hallucination_alerts: 0,
    duration_anomalies: 0
  }

  // Filter Logic
  const filteredLogs = logs.filter((log) => {
    const agentName = log.agent_name.toLowerCase()
    const callerId = log.caller_phone.toLowerCase()
    const outcome = log.outcome.toLowerCase()
    const query = searchQuery.toLowerCase()

    if (query) {
      const match = agentName.includes(query) || callerId.includes(query) || outcome.includes(query)
      if (!match) return false
    }

    if (anomalyFilter === 'hallucination') {
      if (!log.is_hallucinated) return false
    } else if (anomalyFilter === 'short') {
      if (log.duration_anomaly !== 'short_call') return false
    } else if (anomalyFilter === 'long') {
      if (log.duration_anomaly !== 'long_call') return false
    }

    return true
  })

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs available to export.')
      return
    }

    const headers = ['Call ID', 'Date/Time', 'Agent Name', 'Caller ID', 'Duration (Sec)', 'Quality Score', 'Sentiment', 'Hallucination', 'Anomaly', 'Outcome']
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.created_at).toISOString(),
      l.agent_name,
      l.caller_phone,
      l.duration_seconds,
      l.quality_score,
      l.sentiment,
      l.is_hallucinated ? 'YES' : 'NO',
      l.duration_anomaly,
      l.outcome.replace(/"/g, '""')
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `admin_call_quality_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Call quality logs exported!')
  }

  return (
    <div className="space-y-6 text-left selection:bg-violet-500/30">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-violet-400" /> Call Quality Monitoring
          </h1>
          <p className="text-xs text-zinc-400">
            Real-time quality assessments, hallucination tracking, and conversation duration auditing.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => mutate()}
            className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-all cursor-pointer text-zinc-400 hover:text-white"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI summaries cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Quality Score */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-[50px] pointer-events-none rounded-full" />
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat">Average Quality Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{summary.avg_quality_score}%</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Excellent</span>
          </div>
          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-violet-500 rounded-full"
              style={{ width: `${summary.avg_quality_score}%` }}
            />
          </div>
        </div>

        {/* Total Monitored */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat">Monitored Calls</span>
          <div className="text-3xl font-extrabold text-white font-mono">{summary.total_calls}</div>
          <p className="text-[10px] text-zinc-500 font-medium">Automatic quality checks evaluated.</p>
        </div>

        {/* Hallucinations */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-[50px] pointer-events-none rounded-full" />
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat">Hallucination Alerts</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{summary.hallucination_alerts}</span>
            {summary.hallucination_alerts > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 uppercase font-black tracking-wider animate-pulse">Action Required</span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 font-medium">Failed consistency test.</p>
        </div>

        {/* Anomalies */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[50px] pointer-events-none rounded-full" />
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat">Duration Anomalies</span>
          <div className="text-3xl font-extrabold text-white font-mono">{summary.duration_anomalies}</div>
          <p className="text-[10px] text-zinc-500 font-medium">Calls too short (&lt;15s) or too long (&gt;5m).</p>
        </div>

      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat flex items-center gap-1">
            <Search className="w-3 h-3 text-violet-400" /> Filter Logs
          </label>
          <input
            type="text"
            placeholder="Filter by agent name, caller ID, outcome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        {/* Filter type */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-violet-400" /> Quality Filters
          </label>
          <select
            value={anomalyFilter}
            onChange={(e) => setAnomalyFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500 transition cursor-pointer"
          >
            <option value="all">All Audited Logs</option>
            <option value="hallucination">Hallucination Flags Only</option>
            <option value="short">Short Call Anomalies (&lt;15s)</option>
            <option value="long">Long Call Anomalies (&gt;5m)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-xs text-zinc-400">Loading call quality audits...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-24 text-center text-xs text-zinc-400">
            No call quality records matched your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-[10px] font-bold font-montserrat uppercase tracking-wider text-zinc-400">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Agent Name</th>
                  <th className="p-4">Caller ID</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Sentiment</th>
                  <th className="p-4">Quality Score</th>
                  <th className="p-4">Quality Flags</th>
                  <th className="p-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id
                  const score = log.quality_score

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`transition-colors hover:bg-zinc-900/40 cursor-pointer ${isExpanded ? 'bg-zinc-900/30' : ''}`}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <td className="p-4 text-xs font-bold text-white font-sans">
                          {formatCallDate(log.created_at)}
                        </td>
                        <td className="p-4 text-xs font-bold text-zinc-300 font-sans">
                          {log.agent_name}
                        </td>
                        <td className="p-4 text-xs font-mono text-zinc-400">
                          {log.caller_phone}
                        </td>
                        <td className="p-4 text-xs font-sans text-zinc-400">
                          {formatDuration(log.duration_seconds)}
                        </td>
                        <td className="p-4">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border font-montserrat ${
                            log.sentiment === 'positive' 
                              ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                              : log.sentiment === 'negative' 
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                          }`}>
                            {log.sentiment}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold ${
                              score >= 85 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-400'
                            }`}>{score}%</span>
                            <div className="w-12 h-1 bg-zinc-900 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {log.is_hallucinated && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-red-500/10 border border-red-500/20 text-red-400">
                                <AlertCircle className="w-2.5 h-2.5" /> Hallucination
                              </span>
                            )}
                            {log.duration_anomaly === 'short_call' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <Clock className="w-2.5 h-2.5" /> Short Call
                              </span>
                            )}
                            {log.duration_anomaly === 'long_call' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <Clock className="w-2.5 h-2.5" /> Long Call
                              </span>
                            )}
                            {!log.is_hallucinated && log.duration_anomaly === 'none' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                Normal
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-zinc-900/20">
                          <td colSpan={8} className="p-6 border-b border-zinc-800">
                            <div className="space-y-2">
                              <h4 className="text-[10px] uppercase tracking-wider font-montserrat font-bold text-zinc-500">Outcome Evaluation</h4>
                              <div className="bg-zinc-955 p-4 rounded-xl border border-zinc-800 text-xs font-sans text-zinc-300">
                                {log.outcome}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
