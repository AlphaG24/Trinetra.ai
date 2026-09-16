'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Phone, Search, Filter, Play, FileText, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { TranscriptModal } from '../modals/TranscriptModal'

const sentimentColors: Record<string, string> = {
  positive: 'text-green-500 bg-green-500/10 border-green-500/30',
  neutral: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  negative: 'text-red-500 bg-red-500/10 border-red-500/30',
}

const sentimentEmojis: Record<string, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😟',
}

export function CallsPageClient({ agents }: { agents: any[] }) {
  const [calls, setCalls] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedCall, setSelectedCall] = useState<any | null>(null)
  const perPage = 25

  const supabase = createClient()

  useEffect(() => {
    const fetchCalls = async () => {
      setIsLoading(true)
      let query = supabase
        .from('voice_calls')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1)

      if (sentimentFilter !== 'all') {
        query = query.eq('sentiment', sentimentFilter)
      }
      if (search) {
        query = query.ilike('caller_name', `%${search}%`)
      }

      const { data, count } = await query
      setCalls(data || [])
      setTotal(count || 0)
      setIsLoading(false)
    }
    fetchCalls()
  }, [page, sentimentFilter, search])

  const totalPages = Math.ceil(total / perPage)

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by caller name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-[var(--muted)]"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <select
            value={sentimentFilter}
            onChange={e => { setSentimentFilter(e.target.value); setPage(1) }}
            className="pl-10 pr-8 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] text-sm focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-violet-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <Phone className="w-10 h-10 text-[var(--muted)] mb-3 opacity-40" />
            <p className="text-[var(--heading)] font-medium opacity-80">No calls found</p>
            <p className="text-[var(--muted)] text-sm mt-1">Try adjusting your filters or wait for calls to come in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--muted)] uppercase bg-[var(--background)]/50 border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Caller</th>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Sentiment</th>
                  <th className="px-6 py-4 font-semibold">Outcome</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {calls.map((call) => {
                  const sentiment = call.sentiment || 'neutral'
                  return (
                    <tr key={call.id} className="hover:bg-[var(--hover-bg)] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--heading)]">{call.caller_name || 'Unknown Caller'}</div>
                        <div className="text-xs text-[var(--muted)] mt-0.5">{call.caller_phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-[var(--body)]">
                        {call.created_at ? new Date(call.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                      </td>
                      <td className="px-6 py-4 text-[var(--body)]">{formatDuration(call.duration_seconds || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded border text-xs font-medium ${sentimentColors[sentiment]}`}>
                          {sentimentEmojis[sentiment]} {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--body)]">{call.outcome || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedCall(call)}
                            className={`p-1.5 rounded transition-colors ${
                              call.recording_url 
                                ? 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]' 
                                : 'text-[var(--muted)] opacity-30 cursor-not-allowed'
                            }`}
                            title="Play Recording"
                            disabled={!call.recording_url}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setSelectedCall(call)}
                            className={`p-1.5 rounded transition-colors ${
                              call.transcript 
                                ? 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]' 
                                : 'text-[var(--muted)] opacity-30 cursor-not-allowed'
                            }`}
                            title="View Transcript"
                            disabled={!call.transcript}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {call.recording_url ? (
                            <a 
                              href={call.recording_url} 
                              download 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] rounded transition-colors" 
                              title="Download Recording"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          ) : (
                            <button 
                              className="p-1.5 text-[var(--muted)] opacity-30 cursor-not-allowed rounded" 
                              title="Download Unavailable" 
                              disabled
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--heading)] disabled:opacity-30 hover:bg-[var(--hover-bg)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--heading)] disabled:opacity-30 hover:bg-[var(--hover-bg)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={selectedCall !== null}
        onClose={() => setSelectedCall(null)}
        transcript={selectedCall?.transcript_text || selectedCall?.transcript || null}
        recordingUrl={selectedCall?.recording_url || null}
        callerName={selectedCall?.caller_name || 'Customer'}
      />
    </div>
  )
}
