'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts'
import { 
  ArrowLeft, RefreshCw, Loader2, BarChart3, Target, 
  TrendingUp, Award, Layers, ShieldAlert, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface ComparisonCampaign {
  id: string
  name: string
  status: string
  total_contacts: number
  contacts_called: number
  answer_rate: number
  conversion_rate: number
  leads_generated: number
}

// Custom tooltip for comparison charts
const CompareTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 shadow-lg text-left">
      <p className="text-white text-xs font-bold font-montserrat mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <p className="text-[11px] text-zinc-300 font-sans">
            {p.name}: <span className="font-mono text-white font-semibold">{p.value}%</span>
          </p>
        </div>
      ))}
    </div>
  )
}

const ChartTooltip = ({ active, payload, label, suffix = 'leads' }: any) => {
  if (!active || !payload?.length) return null
  const name = payload[0].name || label
  const value = payload[0].value
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 shadow-lg text-left">
      {label && <p className="text-zinc-500 text-[10px] font-mono mb-0.5">{label}</p>}
      <p className="text-xs font-semibold text-white font-montserrat">
        {name}: <span className="font-mono text-violet-400">{value} {suffix}</span>
      </p>
    </div>
  )
}

export function CampaignsComparisonClient() {
  const [campaigns, setCampaigns] = useState<ComparisonCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const fetchComparison = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch('/api/campaigns/analytics/compare')
      const json = await res.json()
      if (res.ok) {
        setCampaigns(json.data?.campaigns || [])
      } else {
        toast.error(json.error || 'Failed to load campaigns comparison')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error fetching comparison data')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchComparison()
  }, [])

  if (!mounted || (loading && campaigns.length === 0)) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          <p className="text-xs text-[var(--muted)]">Comparing campaigns data...</p>
        </div>
      </div>
    )
  }

  // Derived KPI metrics
  const totalCampaigns = campaigns.length
  
  const bestAnswerRateCampaign = campaigns.length > 0 
    ? campaigns.reduce((prev, current) => (prev.answer_rate > current.answer_rate) ? prev : current)
    : null;
    
  const bestConversionCampaign = campaigns.length > 0 
    ? campaigns.reduce((prev, current) => (prev.conversion_rate > current.conversion_rate) ? prev : current)
    : null;

  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads_generated, 0)

  // Chart data mapping
  const chartData = campaigns.map(c => ({
    name: c.name,
    'Connection Rate': c.answer_rate,
    'Conversion Rate': c.conversion_rate,
    leads: c.leads_generated
  }))

  const PIPELINE_COLORS = [
    'var(--primary-bg)',
    'var(--secondary)',
    'var(--muted)',
    'var(--body)',
    'var(--heading)'
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 text-[var(--body)]">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--body)] hover:text-[var(--heading)] transition-all"
            title="Back to Campaigns List"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--heading)] font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              Campaigns Comparison Dashboard
            </h1>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Cross-campaign analytics and lead pipeline conversion statistics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchComparison(true)}
            className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--hover-bg)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--muted)]">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[var(--heading)]">No Campaigns to Compare</h3>
            <p className="text-xs text-[var(--muted)] max-w-md mx-auto">Create and run campaigns to see side-by-side comparative analysis of connection rates and captured leads.</p>
          </div>
          <Link
            href="/dashboard/campaigns"
            className="inline-block px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer"
          >
            Go to Campaigns
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Comparison KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Card 1: Active Campaigns */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Total Campaigns</p>
                <Layers className="w-4 h-4 text-violet-400" />
              </div>
              <p className="text-3xl font-extrabold text-[var(--heading)] font-mono">{totalCampaigns}</p>
              <p className="text-[10px] text-[var(--muted)] font-sans">Active in organization</p>
            </div>

            {/* Card 2: Top Connected Campaign */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Best Answer Rate</p>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-blue-400 truncate max-w-[200px]" title={bestAnswerRateCampaign?.name}>
                {bestAnswerRateCampaign ? `${bestAnswerRateCampaign.answer_rate}%` : '—'}
              </p>
              <p className="text-[10px] text-[var(--muted)] font-sans truncate">
                {bestAnswerRateCampaign ? bestAnswerRateCampaign.name : 'No active campaign'}
              </p>
            </div>

            {/* Card 3: Top Converting Campaign */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Highest Conversion</p>
                <Award className="w-4 h-4 text-violet-400" />
              </div>
              <p className="text-2xl font-extrabold text-violet-400 truncate max-w-[200px]" title={bestConversionCampaign?.name}>
                {bestConversionCampaign ? `${bestConversionCampaign.conversion_rate}%` : '—'}
              </p>
              <p className="text-[10px] text-[var(--muted)] font-sans truncate">
                {bestConversionCampaign ? bestConversionCampaign.name : 'No active campaign'}
              </p>
            </div>

            {/* Card 4: Total Cumulative Leads */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Total Leads Generated</p>
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-400 font-mono">{totalLeads}</p>
              <p className="text-[10px] text-[var(--muted)] font-sans">Across all outbound dialing</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Rates Comparison Chart */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-96 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
                    Performance Rates Comparison
                  </h3>
                  <p className="text-[10px] text-[var(--muted)] font-sans mt-0.5">
                    Answer rates and conversion rates compared side by side
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted)"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip content={<CompareTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                    <Bar dataKey="Connection Rate" fill="var(--heading)" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar dataKey="Conversion Rate" fill="var(--primary-bg)" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Absolute Leads Bar Chart */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-96 lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
                    Leads Extracted By Campaign
                  </h3>
                  <p className="text-[10px] text-[var(--muted)] font-sans mt-0.5">
                    Absolute counts of identified customer leads
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                  <Target className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted)"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip suffix="leads" />} />
                    <Bar dataKey="leads" fill="var(--body)" radius={[4, 4, 0, 0]} barSize={16}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Comparison Table */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--background)]/20">
              <h3 className="text-sm font-bold text-[var(--heading)]">All Campaigns Comparison Grid</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]/35 text-[10px] text-[var(--muted)] font-black uppercase tracking-wider font-montserrat">
                    <th className="px-6 py-4">Campaign Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Contacts</th>
                    <th className="px-6 py-4 text-center">Dialed</th>
                    <th className="px-6 py-4 text-center">Answer Rate</th>
                    <th className="px-6 py-4 text-center">Conversion</th>
                    <th className="px-6 py-4 text-center">Leads</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs">
                  {campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-[var(--hover-bg)]/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[var(--heading)]">{camp.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border font-montserrat ${
                          camp.status === 'running'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : camp.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : camp.status === 'completed'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-[var(--hover-bg)] text-[var(--muted)] border-[var(--border)]'
                        }`}>
                          {camp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-[var(--body)]">{camp.total_contacts}</td>
                      <td className="px-6 py-4 text-center font-mono text-[var(--body)]">{camp.contacts_called}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-blue-400">{camp.answer_rate}%</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-violet-400">{camp.conversion_rate}%</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-500">{camp.leads_generated}</td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/campaigns/${camp.id}/analytics`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[10px] font-black uppercase tracking-wider transition-all text-[var(--body)] hover:text-[var(--heading)] cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Metrics
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
