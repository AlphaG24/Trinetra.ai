'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  Building2,
  Phone,
  Landmark,
  ArrowUpRight,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface RevenueEventItem {
  id: string
  business_id: string
  call_id?: string | null
  quoted_amount?: number | null
  won_amount?: number | null
  deal_status: string
  service?: string | null
  source: string
  created_at: string
  organization?: { name?: string }
}

interface AdminRevenueStats {
  totalVerifiedGmv: number
  totalEstimatedPipeline: number
  totalWonDeals: number
  totalOpenQuotes: number
  realizationRate: number
  activeVaultsCount: number
}

export default function AdminRevenueHubPage() {
  const [stats, setStats] = useState<AdminRevenueStats>({
    totalVerifiedGmv: 0,
    totalEstimatedPipeline: 0,
    totalWonDeals: 0,
    totalOpenQuotes: 0,
    realizationRate: 0,
    activeVaultsCount: 0
  })
  const [events, setEvents] = useState<RevenueEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'won' | 'open'>('all')
  const [search, setSearch] = useState('')

  const fetchAdminRevenue = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/revenue')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats || {
          totalVerifiedGmv: 0,
          totalEstimatedPipeline: 0,
          totalWonDeals: 0,
          totalOpenQuotes: 0,
          realizationRate: 0,
          activeVaultsCount: 0
        })
        setEvents(data.events || [])
      }
    } catch (err) {
      console.error('Failed to load admin revenue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminRevenue()
  }, [])

  const filteredEvents = events.filter(ev => {
    if (filterStatus !== 'all' && ev.deal_status !== filterStatus) return false
    if (search) {
      const s = search.toLowerCase()
      const orgName = ev.organization?.name?.toLowerCase() || ''
      const srv = ev.service?.toLowerCase() || ''
      return orgName.includes(s) || srv.includes(s) || ev.id.includes(s)
    }
    return true
  })

  const exportCSV = () => {
    if (events.length === 0) {
      toast.error('No revenue data to export')
      return
    }

    const headers = ['Event ID', 'Organization', 'Call ID', 'Service', 'Status', 'Quoted (INR)', 'Won (INR)', 'Date']
    const rows = events.map(e => [
      e.id,
      e.organization?.name || e.business_id,
      e.call_id || '',
      `"${(e.service || '').replace(/"/g, '""')}"`,
      e.deal_status,
      e.quoted_amount || 0,
      e.won_amount || 0,
      new Date(e.created_at).toISOString()
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Vaakriti_Revenue_Ledger_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Revenue ledger exported')
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Call-to-Cash Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-montserrat tracking-tight">
            Revenue & GMV Hub
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Multi-tenant AI-settled realized cash, pipeline conversion, and CA reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminRevenue}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CA Ledger</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Verified GMV */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Realized Cash (Verified GMV)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            ₹{stats.totalVerifiedGmv.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-zinc-500">
            Backed by confirmed UTR / owner won deal receipts
          </p>
        </div>

        {/* Estimated Pipeline */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Estimated Pipeline Quotes
            </span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black font-mono text-zinc-200">
            ₹{stats.totalEstimatedPipeline.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-zinc-500">
            Verbal quotes extracted across {stats.totalOpenQuotes} active calls
          </p>
        </div>

        {/* Realization Rate */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Realization Rate
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-400">
            {stats.realizationRate.toFixed(1)}%
          </div>
          <p className="text-[10px] text-zinc-500">
            {stats.totalWonDeals} deals closed out of {stats.totalWonDeals + stats.totalOpenQuotes} quotes
          </p>
        </div>

        {/* Active Vaults */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Active Payout Vaults
            </span>
            <Landmark className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {stats.activeVaultsCount} Tenants
          </div>
          <p className="text-[10px] text-zinc-500">
            Configured non-custodial direct UPI / QR destinations
          </p>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              All Quotes ({events.length})
            </button>
            <button
              onClick={() => setFilterStatus('won')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'won'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Realized Won ({stats.totalWonDeals})
            </button>
            <button
              onClick={() => setFilterStatus('open')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'open'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Open Pipeline ({stats.totalOpenQuotes})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by tenant or service..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
        </div>

        {/* Table */}
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 space-y-2">
            <Info className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-xs">No revenue events matching your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="pb-3 pl-2">Tenant</th>
                  <th className="pb-3">Service / Deal</th>
                  <th className="pb-3">Quoted Amount</th>
                  <th className="pb-3">Realized Won</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Proof Receipt</th>
                  <th className="pb-3 pr-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredEvents.map(ev => {
                  const isWon = ev.deal_status === 'won'
                  return (
                    <tr key={ev.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 pl-2 font-semibold text-white whitespace-nowrap">
                        {ev.organization?.name || 'Purvi Roadlines'}
                      </td>
                      <td className="py-3.5 max-w-[200px] truncate text-zinc-400">
                        {ev.service || 'Commercial Order'}
                      </td>
                      <td className="py-3.5 font-mono text-zinc-300 font-bold whitespace-nowrap">
                        {ev.quoted_amount ? `₹${Number(ev.quoted_amount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3.5 font-mono font-bold whitespace-nowrap">
                        {isWon && (ev.won_amount || ev.quoted_amount) ? (
                          <span className="text-emerald-400">
                            ₹{Number(ev.won_amount || ev.quoted_amount).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                            isWon
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isWon ? 'Realized Won' : 'Open Quote'}
                        </span>
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        {ev.call_id ? (
                          <a
                            href={`/receipt/${ev.call_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold transition-all"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>View Proof</span>
                          </a>
                        ) : (
                          <span className="text-zinc-600 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-2 text-right font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
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
