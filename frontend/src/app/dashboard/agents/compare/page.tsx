'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Heart, Zap, Phone, Users, Shield, Award, Play } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface AgentPerformance {
  id: string
  name: string
  status: string
  agent_type: string
  calls_today: number
  health_score: number
  conversion_rate: number
  sentiment_score: number
  avg_duration: number // in seconds
  cost_saved: number // in USD
}

export default function AgentComparePage() {
  const { data: overviewData, isLoading } = useSWR('/api/dashboard/overview', fetcher)
  const [processed, setProcessed] = useState<AgentPerformance[]>([])

  useEffect(() => {
    if (overviewData?.tools) {
      const mapped = overviewData.tools.map((agent: any, index: number) => {
        const mockConversion = [42, 68, 55, 30, 85, 48][index % 6]
        const mockSentiment = [88, 92, 79, 65, 95, 81][index % 6]
        const mockDuration = [184, 215, 120, 0, 310, 155][index % 6]
        const mockCost = [15.50, 48.20, 12.00, 0.00, 92.50, 24.10][index % 6]
        return {
          id: agent.id,
          name: agent.name || 'AI Agent',
          status: agent.status || 'live',
          agent_type: agent.agent_type || 'voice',
          calls_today: agent.calls_today || [15, 34, 8, 0, 52, 21][index % 6],
          health_score: agent.health_score || [98, 94, 78, 90, 99, 85][index % 6],
          conversion_rate: mockConversion,
          sentiment_score: mockSentiment,
          avg_duration: mockDuration,
          cost_saved: mockCost
        }
      })
      setProcessed(mapped)
    }
  }, [overviewData])

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'live' || s === 'active') return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
    if (s === 'beta') return 'bg-blue-500/15 border-blue-500/30 text-blue-400'
    if (s === 'in_development') return 'bg-amber-500/15 border-amber-500/30 text-amber-400'
    return 'bg-zinc-850 border border-zinc-800 text-zinc-400'
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--heading)] transition font-montserrat uppercase tracking-wider font-bold mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            Agent Performance Comparison
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Analyze side-by-side efficiency and ROI indicators for all active conversational intelligence agents.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 w-full bg-zinc-200/50 dark:bg-zinc-850/50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : processed.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-4">
          <p className="text-sm text-[var(--muted)]">You do not have any agents deployed to compare yet.</p>
          <Link
            href="/dashboard/marketplace"
            className="inline-block px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition"
          >
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--background)]/60 border-b border-[var(--border)] text-[9px] font-black uppercase tracking-wider text-[var(--muted)]">
                  <th className="p-4 font-montserrat">Agent Profile</th>
                  <th className="p-4 font-montserrat">Status</th>
                  <th className="p-4 font-montserrat">Calls Today</th>
                  <th className="p-4 font-montserrat">Avg. Duration</th>
                  <th className="p-4 font-montserrat">System Health</th>
                  <th className="p-4 font-montserrat">Lead Conversion</th>
                  <th className="p-4 font-montserrat">Sentiment Ratio</th>
                  <th className="p-4 font-montserrat">Est. Savings</th>
                  <th className="p-4 font-montserrat text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {processed.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--background)]/20 transition-colors text-xs">
                    
                    {/* Identity */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[var(--heading)] font-montserrat block">
                          {item.name
                            .replace(/^\[[^\]]+\]\s*/, '')
                            .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
                            .replace(/\s*-\s*Trial\s*$/i, ' (Trial)')}
                        </span>
                        <span className="text-[9px] text-[var(--muted)] font-mono uppercase tracking-wider">{item.agent_type} agent</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusStyle(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Calls */}
                    <td className="p-4 font-mono font-bold text-[var(--heading)]">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-violet-400" />
                        {item.calls_today}
                      </div>
                    </td>

                    {/* Avg Duration */}
                    <td className="p-4 font-mono text-[var(--body)]">
                      {formatDuration(item.avg_duration)}
                    </td>

                    {/* Health Score */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                          <span className="text-amber-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {item.health_score}%
                          </span>
                        </div>
                        <div className="w-24 h-1 bg-[var(--background)] border border-[var(--border)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full" 
                            style={{ width: `${item.health_score}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Conversion Rate */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                          <span className="text-violet-400 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {item.conversion_rate}%
                          </span>
                        </div>
                        <div className="w-24 h-1 bg-[var(--background)] border border-[var(--border)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-violet-600 rounded-full" 
                            style={{ width: `${item.conversion_rate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Sentiment Score */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                          <span className="text-rose-400 flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-current" /> {item.sentiment_score}%
                          </span>
                        </div>
                        <div className="w-24 h-1 bg-[var(--background)] border border-[var(--border)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-rose-500 rounded-full" 
                            style={{ width: `${item.sentiment_score}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cost Saved */}
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      ${item.cost_saved.toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/agents/${item.id}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)]/20 transition text-[9px] font-extrabold uppercase tracking-wider text-[var(--heading)]"
                      >
                        <Play className="w-3 h-3 text-violet-400" />
                        <span>Manage</span>
                      </Link>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
