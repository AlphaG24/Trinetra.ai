'use client'

import { useState } from 'react'
import { Download, ChevronDown, ChevronUp, PhoneCall, Calendar, Clock, Sparkles } from 'lucide-react'

interface CallData {
  id: string
  created_at: string
  agent_name: string
  duration_seconds: number
  sentiment: string
  outcome: string
  is_lead: boolean
  caller_phone: string
  caller_name?: string | null
  transcript: string | null
  recording_url: string | null
}

interface RecentCallsTableProps {
  calls: CallData[]
}

export function RecentCallsTable({ calls }: RecentCallsTableProps) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedCallId(expandedCallId === id ? null : id)
  }

  const exportCSV = () => {
    if (calls.length === 0) return

    const headers = [
      'Date/Time',
      'Agent',
      'Duration (sec)',
      'Sentiment',
      'Outcome',
      'Is Lead',
      'Caller Phone',
    ]

    const rows = calls.map((c) => [
      new Date(c.created_at).toLocaleString(),
      c.agent_name,
      c.duration_seconds,
      c.sentiment,
      c.outcome,
      c.is_lead ? 'Yes' : 'No',
      c.caller_phone,
    ])

    const csvString = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `trinetra_calls_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getSentimentBadge = (sentiment: string) => {
    const s = sentiment.toLowerCase()
    let dotColor = 'var(--muted)'
    if (s === 'positive') dotColor = 'var(--heading)'
    if (s === 'negative') dotColor = 'var(--secondary)'

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-montserrat uppercase border border-[var(--border)] bg-[var(--background)] text-[var(--body)]">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        {sentiment}
      </span>
    )
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left w-full space-y-4">
      {/* Header and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
            Recent Call Activity
          </h3>
          <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">
            Detailed log of the last 50 processed calls
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={calls.length === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 border border-dashed border-[var(--border)] rounded-2xl">
          <PhoneCall className="w-8 h-8 text-[var(--muted)]" />
          <p className="text-xs text-[var(--muted)] font-merriweather">No recent call interactions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)] font-montserrat font-bold text-[var(--muted)] uppercase tracking-wider text-[10px]">
                <th className="p-4">Date / Time</th>
                <th className="p-4">Agent</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Sentiment</th>
                <th className="p-4">Outcome</th>
                <th className="p-4">Lead Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {calls.map((call) => {
                const isExpanded = expandedCallId === call.id
                return (
                  <tr key={call.id} className="group hover:bg-[var(--hover-bg)]/50 transition-colors">
                    <td colSpan={6} className="p-0">
                      <div
                        onClick={() => toggleExpand(call.id)}
                        className="grid grid-cols-6 p-4 cursor-pointer items-center w-full font-merriweather text-[var(--body)]"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                          <span className="truncate">{new Date(call.created_at).toLocaleString()}</span>
                        </div>
                        <div className="font-semibold text-[var(--heading)]">{call.agent_name}</div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                          <span>{formatDuration(call.duration_seconds)}</span>
                        </div>
                        <div>{getSentimentBadge(call.sentiment)}</div>
                        <div className="font-semibold capitalize text-[var(--heading)]">
                          {call.outcome === 'Callback Scheduled' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Callback Scheduled
                            </span>
                          ) : call.outcome === 'Lead Captured' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Lead Captured
                            </span>
                          ) : (
                            <span>{call.outcome}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {call.is_lead ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border border-[var(--border)] bg-[var(--primary-bg)] text-[var(--heading)]">
                              Lead Capture
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--muted)] font-mono">None</span>
                          )}
                          <span className="text-[var(--muted)] group-hover:text-[var(--heading)] transition-colors p-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Section (Transcript & Audio) */}
                      {isExpanded && (
                        <div className="border-t border-[var(--border)] bg-[var(--background)]/50 p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
                            <div className="flex flex-wrap items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[var(--muted)]" />
                              <span className="font-bold font-montserrat uppercase tracking-wider text-[10px] text-[var(--heading)]">
                                Call Details & Transcript Preview
                              </span>
                              {call.caller_phone && call.caller_phone !== 'Private' && (
                                <span className="text-[10px] text-[var(--muted)] font-mono ml-2">
                                  • Caller: <span className="text-[var(--heading)] font-semibold">{call.caller_name ? `${call.caller_name} (${call.caller_phone})` : call.caller_phone}</span>
                                </span>
                              )}
                            </div>
                            {call.recording_url && (
                              <div className="w-full sm:w-auto">
                                <audio
                                  src={call.recording_url}
                                  controls
                                  className="h-8 max-w-full sm:w-60 focus:outline-none"
                                />
                              </div>
                            )}
                          </div>

                          <div className="max-h-60 overflow-y-auto bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 font-mono text-[11px] leading-relaxed text-[var(--body)] text-left whitespace-pre-line custom-scrollbar">
                            {call.transcript ? (
                              call.transcript
                            ) : (
                              <span className="italic text-[var(--muted)] font-merriweather">
                                No transcript or operations logs generated for this call interaction.
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
