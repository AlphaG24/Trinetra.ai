'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Phone, Search, Filter, Play, FileText, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { TranscriptModal } from '../modals/TranscriptModal'

const sentimentColors: Record<string, string> = {
  positive: 'text-green-400 bg-green-500/10 border-green-500/30',
  neutral: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  negative: 'text-red-400 bg-red-500/10 border-red-500/30',
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
        .from('calls')
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

  // Stats summary
  const positiveCalls = calls.filter(c => c.sentiment === 'positive').length
  const positivePct = calls.length > 0 ? Math.round((positiveCalls / calls.length) * 100) : 0
  const totalDuration = calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0)
  const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0
  const formatDuration = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Phone className="w-8 h-8 text-purple-400" /> Voice Calls
        </h1>
        <p className="text-gray-400 text-sm">Complete history of all AI-handled voice interactions</p>
      </div>

      {/* Stats Strip */}
      <div className="flex flex-wrap gap-2 text-sm text-white/60 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
        <span>Showing <strong className="text-white">{calls.length}</strong> calls</span>
        <span className="text-white/20">|</span>
        <span>Total duration: <strong className="text-white">{formatDuration(totalDuration)}</strong></span>
        <span className="text-white/20">|</span>
        <span>Avg: <strong className="text-white">{formatDuration(avgDuration)}</strong></span>
        <span className="text-white/20">|</span>
        <span className="text-green-400"><strong>{positivePct}%</strong> positive</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by caller name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <select
            value={sentimentFilter}
            onChange={e => { setSentimentFilter(e.target.value); setPage(1) }}
            className="pl-10 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-purple-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <Phone className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-white/50 font-medium">No calls found</p>
            <p className="text-white/30 text-sm mt-1">Try adjusting your filters or wait for calls to come in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-white/50 uppercase bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold">Caller</th>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Sentiment</th>
                  <th className="px-6 py-4 font-semibold">Outcome</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {calls.map((call) => {
                  const sentiment = call.sentiment || 'neutral'
                  return (
                    <tr key={call.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{call.caller_name || 'Unknown Caller'}</div>
                        <div className="text-xs text-white/40 mt-0.5">{call.caller_phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {call.created_at ? new Date(call.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                      </td>
                      <td className="px-6 py-4 text-white/70">{formatDuration(call.duration_seconds || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded border text-xs font-medium ${sentimentColors[sentiment]}`}>
                          {sentimentEmojis[sentiment]} {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/70">{call.outcome || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedCall(call)}
                            className={`p-1.5 rounded transition-colors ${
                              call.recording_url 
                                ? 'text-white/40 hover:text-white hover:bg-white/10' 
                                : 'text-zinc-600 cursor-not-allowed'
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
                                ? 'text-white/40 hover:text-white hover:bg-white/10' 
                                : 'text-zinc-600 cursor-not-allowed'
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
                              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" 
                              title="Download Recording"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          ) : (
                            <button 
                              className="p-1.5 text-zinc-600 cursor-not-allowed rounded" 
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
          <p className="text-sm text-white/50">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
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
        transcript={selectedCall?.transcript || null}
        recordingUrl={selectedCall?.recording_url || null}
        callerName={selectedCall?.caller_name || 'Customer'}
      />
    </div>
  )
}
