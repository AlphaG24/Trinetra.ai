import React, { useState, useEffect } from 'react'
import { PhoneIncoming, Download, FileText, ChevronDown, ChevronUp, Loader2, RefreshCw, Search, Calendar, Heart } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

interface CallLog {
  id: string
  created_at: string
  duration_seconds: number
  sentiment: string | null
  status: string | null
  caller_phone: string | null
  transcript?: string | null
  transcript_text?: string | null
  recording_url: string | null
  outcome?: string | null
}

interface AgentCallHistoryTabProps {
  agent: any
}

export function AgentCallHistoryTab({ agent }: AgentCallHistoryTabProps) {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const supabase = createClient()
  const agentId = agent.id
  const vapiAgentId = agent.vapi_agent_id

  const fetchCalls = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agents/${agentId}/calls`)
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data = await res.json()
      setCalls(data || [])
    } catch (err: any) {
      console.error('Failed to fetch call logs:', err)
      toast.error('Failed to load call history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (agentId) {
      fetchCalls()
    }
  }, [agentId, vapiAgentId])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatCallDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return dateString
    }
  }

  // Filter Logic
  const filteredCalls = calls.filter((call) => {
    const transcriptText = (call.transcript || call.transcript_text || '').toLowerCase()
    const callerPhone = (call.caller_phone || '').toLowerCase()
    const outcomeText = (call.outcome || '').toLowerCase()
    const sentimentText = (call.sentiment || 'neutral').toLowerCase()
    const query = searchQuery.toLowerCase()

    // 1. Text Search
    if (query) {
      const matchesText = 
        transcriptText.includes(query) ||
        callerPhone.includes(query) ||
        outcomeText.includes(query) ||
        sentimentText.includes(query)
      if (!matchesText) return false
    }

    // 2. Sentiment filter
    if (sentimentFilter !== 'all') {
      if (sentimentText !== sentimentFilter) return false
    }

    // 3. Date range filters
    if (startDate) {
      const callDate = new Date(call.created_at)
      const filterStart = new Date(startDate)
      filterStart.setHours(0, 0, 0, 0)
      if (callDate < filterStart) return false
    }

    if (endDate) {
      const callDate = new Date(call.created_at)
      const filterEnd = new Date(endDate)
      filterEnd.setHours(23, 59, 59, 999)
      if (callDate > filterEnd) return false
    }

    return true
  })

  const getHighlightSnippet = (text: string, query: string) => {
    if (!text || !query) return null
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return null
    
    const start = Math.max(0, idx - 40)
    const end = Math.min(text.length, idx + query.length + 40)
    let snippet = text.substring(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < text.length) snippet = snippet + '...'
    
    const parts = snippet.split(new RegExp(`(${query})`, 'gi'))
    return (
      <span className="text-[10px] text-zinc-400 mt-1 block italic leading-normal">
        Matched: &quot;
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="bg-violet-500/40 text-white px-0.5 rounded not-italic font-bold">{part}</mark>
            : part
        )}
        &quot;
      </span>
    )
  }

  const handleExportCSV = () => {
    if (filteredCalls.length === 0) {
      toast.error('No call logs match current filters to export.')
      return
    }

    const headers = ['Call ID', 'Date/Time', 'Caller Phone', 'Duration (Seconds)', 'Sentiment', 'Status', 'Outcome', 'Transcript']
    const rows = filteredCalls.map(c => [
      c.id,
      new Date(c.created_at).toISOString(),
      c.caller_phone || '',
      c.duration_seconds,
      c.sentiment || 'neutral',
      c.status || '',
      c.outcome || '',
      (c.transcript || c.transcript_text || '').replace(/"/g, '""')
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${agent.name || 'agent'}_call_logs_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Call history CSV exported!')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
            <PhoneIncoming className="w-5 h-5 text-violet-400" /> Complete Call History
          </h2>
          <p className="text-xs text-[var(--muted)] font-sans">
            Review detailed conversation logs, durations, sentiments, outcomes, and full voice recordings.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchCalls}
            className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)]/20 transition-all cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4 text-[var(--muted)]" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm">
        {/* Search */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat flex items-center gap-1">
            <Search className="w-3 h-3" /> Keyword Search
          </label>
          <input
            type="text"
            placeholder="Search transcripts, phones, outcomes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-550 transition"
          />
        </div>

        {/* Sentiment */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat flex items-center gap-1">
            <Heart className="w-3 h-3" /> Sentiment
          </label>
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-white focus:outline-none focus:border-violet-550 transition cursor-pointer"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat flex items-center gap-1">
            <Calendar className="w-3 h-3" /> From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-white focus:outline-none focus:border-violet-550 transition"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat flex items-center gap-1">
            <Calendar className="w-3 h-3" /> To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-white focus:outline-none focus:border-violet-550 transition"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-xs text-[var(--muted)]">Loading call history...</p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="py-24 text-center text-xs text-[var(--body)] font-sans">
            No call logs matched the current search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]/20 text-[10px] font-bold font-montserrat uppercase tracking-wider text-[var(--muted)]">
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Caller Phone</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Sentiment</th>
                  <th className="p-4">Outcome</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredCalls.map((call) => {
                  const isExpanded = expandedCallId === call.id
                  const sentiment = (call.sentiment || 'neutral').toLowerCase()
                  const sentimentBadge = sentiment === 'positive'
                    ? 'bg-green-500/10 border-green-500/20 text-green-500'
                    : sentiment === 'negative'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                      : 'bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)]'

                  const snippet = getHighlightSnippet(call.transcript || call.transcript_text || '', searchQuery)

                  return (
                    <React.Fragment key={call.id}>
                      <tr 
                        className={`transition-colors hover:bg-[var(--hover-bg)]/20 cursor-pointer ${isExpanded ? 'bg-[var(--hover-bg)]/10' : ''}`}
                        onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                      >
                        <td className="p-4 text-xs font-bold text-[var(--heading)] font-sans">
                          {formatCallDate(call.created_at)}
                        </td>
                        <td className="p-4 text-xs font-mono text-[var(--body)]">
                          {call.caller_phone || 'Web Demo'}
                          {snippet}
                        </td>
                        <td className="p-4 text-xs font-sans text-[var(--body)]">
                          {formatDuration(call.duration_seconds)}
                        </td>
                        <td className="p-4">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border font-montserrat ${sentimentBadge}`}>
                            {sentiment}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-sans text-[var(--body)] capitalize">
                          {call.outcome || 'N/A'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            {call.recording_url && (
                              <a
                                href={call.recording_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-zinc-400 hover:text-[var(--heading)] border border-transparent hover:border-[var(--border)] rounded-lg transition-colors cursor-pointer"
                                title="Download Recording"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                              className="p-1.5 text-zinc-400 hover:text-[var(--heading)] border border-transparent hover:border-[var(--border)] rounded-lg transition-colors cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[var(--background)]/20">
                          <td colSpan={6} className="p-6 border-b border-[var(--border)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <h4 className="text-[10px] uppercase tracking-wider font-montserrat font-bold text-[var(--muted)] flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" /> Conversation Transcript
                                </h4>
                                <div className="text-xs font-sans text-[var(--body)] leading-relaxed bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)] max-h-60 overflow-y-auto whitespace-pre-wrap">
                                  {call.transcript || call.transcript_text || 'No transcript text generated.'}
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <h4 className="text-[10px] uppercase tracking-wider font-montserrat font-bold text-[var(--muted)]">Call Outcomes & Logs</h4>
                                  <div className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)] text-xs font-sans text-[var(--body)] space-y-2">
                                    <div className="flex justify-between border-b border-[var(--border)] pb-2">
                                      <span className="text-[var(--muted)]">Call ID:</span>
                                      <span className="font-mono text-[10px]">{call.id}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-[var(--border)] pb-2">
                                      <span className="text-[var(--muted)]">Call Status:</span>
                                      <span className="font-mono text-[10px] uppercase font-bold">{call.status || 'completed'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)]">Outcome Analysis:</span>
                                      <span className="font-bold text-[var(--heading)]">{call.outcome || 'No outcome analyzed.'}</span>
                                    </div>
                                  </div>
                                </div>
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
