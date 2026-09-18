'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target, Search, Phone, Mail, ChevronDown, Database,
  Sparkles, Download, Trash2, Eye, User, Building, Calendar,
  CheckCircle2, AlertCircle, RefreshCw, X, ArrowUpRight, Flame
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import { TranscriptModal } from '../modals/TranscriptModal'
import { cleanAgentName } from '@/src/utils/formatAgentName'

export interface Lead {
  id: string
  agent_id?: string | null
  full_name?: string | null
  contact_name?: string | null
  email?: string | null
  contact_email?: string | null
  phone?: string | null
  contact_phone?: string | null
  company_name?: string | null
  company?: string | null
  message?: string | null
  call_summary?: string | null
  status?: string | null
  stage?: string | null
  interest_level?: string | null
  budget_range?: string | null
  timeline?: string | null
  call_id?: string | null
  created_at: string
}

export interface UserAgent {
  id: string
  name: string
  agent_type?: string
  status?: string
}

export interface PlatformService {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  icon_url: string | null
  subdomain_url: string | null
  is_active: boolean
}

interface LeadsPageClientProps {
  initialLeads: Lead[]
  agents?: UserAgent[]
  services?: PlatformService[]
}

export function LeadsPageClient({ initialLeads, agents = [], services = [] }: LeadsPageClientProps) {
  const router = useRouter()

  const [selectedAgentId, setSelectedAgentId] = useState<string>('all')

  const [leads, setLeads] = useState<Lead[]>(initialLeads)

  // Sync state if initialLeads prop updates (e.g. after server revalidation or navigation)
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [interestFilter, setInterestFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)


  // Selected lead for detail modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Transcript Modal State
  const [showTranscriptModal, setShowTranscriptModal] = useState(false)
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null)
  const [selectedRecordingUrl, setSelectedRecordingUrl] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(undefined)
  const [transcriptCallerName, setTranscriptCallerName] = useState<string>('Prospect')
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null)

  const displayAgents = useMemo(() => {
    if (agents && agents.length > 0) return agents
    return (services || []).map(s => ({
      id: s.id,
      name: s.name,
      agent_type: s.type,
      status: s.is_active ? 'active' : 'inactive'
    }))
  }, [agents, services])

  const isVoiceAgent = true

  // Filter leads
  const filtered = useMemo(() => {
    return leads.filter(l => {
      // 1. Filter by selected agent
      if (selectedAgentId !== 'all' && l.agent_id && l.agent_id !== selectedAgentId) {
        return false
      }

      const name = (l.full_name || l.contact_name || '').toLowerCase()
      const email = (l.email || l.contact_email || '').toLowerCase()
      const phone = (l.phone || l.contact_phone || '').toLowerCase()
      const company = (l.company_name || l.company || '').toLowerCase()
      const summary = (l.call_summary || l.message || '').toLowerCase()
      const q = search.toLowerCase().trim()

      const matchesSearch = !q ||
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        company.includes(q) ||
        summary.includes(q)

      const effectiveStatus = (l.status || l.stage || 'new').toLowerCase()
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter.toLowerCase()

      const effectiveInterest = (l.interest_level || 'medium').toLowerCase()
      const matchesInterest = interestFilter === 'all' || effectiveInterest === interestFilter.toLowerCase()

      return matchesSearch && matchesStatus && matchesInterest
    })
  }, [leads, selectedAgentId, search, statusFilter, interestFilter])

  // KPIs
  const stats = useMemo(() => {
    const baseLeads = selectedAgentId === 'all'
      ? leads
      : leads.filter(l => l.agent_id === selectedAgentId)
    const total = baseLeads.length
    const qualified = baseLeads.filter(l => {
      const s = (l.status || l.stage || '').toLowerCase()
      const i = (l.interest_level || '').toLowerCase()
      return s === 'qualified' || i === 'high' || i === 'hot'
    }).length
    const contacted = baseLeads.filter(l => (l.status || l.stage || '').toLowerCase() === 'contacted').length
    const conversionRate = total > 0 ? Math.round((qualified / total) * 100) : 0
    return { total, qualified, contacted, conversionRate }
  }, [leads, selectedAgentId])

  // Refresh leads from DB
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setLeads(data)
        toast.success('Leads refreshed')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to refresh leads')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Update lead status
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, stage: newStatus } : l))
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus, stage: newStatus } : null)
    }

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, stage: newStatus })
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update status')
      }
      toast.success(`Lead marked as ${newStatus}`)
    } catch (err: any) {
      toast.error(err.message || 'Status update failed')
      handleRefresh()
    }
  }

  // Delete lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return

    setLeads(prev => prev.filter(l => l.id !== leadId))
    if (selectedLead?.id === leadId) setSelectedLead(null)

    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to delete')
      }
      toast.success('Lead deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lead')
      handleRefresh()
    }
  }

  // Trigger outbound call with AI Voice Agent
  const handleCallLead = async (lead: Lead) => {
    const phone = lead.phone || lead.contact_phone
    if (!phone) {
      toast.error('No phone number registered for this lead')
      return
    }
    const agentId = lead.agent_id || (agents && agents.length > 0 ? agents[0].id : null)
    if (!agentId) {
      toast.error('No voice agent available to place the call')
      return
    }

    setCallingLeadId(lead.id)
    const displayName = lead.full_name || lead.contact_name || phone
    const toastId = toast.loading(`Initiating AI call to ${displayName}...`)
    try {
      const res = await fetch('/api/telephony/outbound-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_phone: phone,
          agent_id: agentId,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger outbound call')
      }
      toast.success(`Call placed! AI Agent is dialing ${phone}.`, { id: toastId })
    } catch (err: any) {
      console.error('Call failed:', err)
      toast.error(err.message || 'Failed to place call', { id: toastId })
    } finally {
      setCallingLeadId(null)
    }
  }

  // View transcript
  const handleViewTranscript = async (callId: string, prospectName: string) => {
    try {
      setTranscriptCallerName(prospectName || 'Prospect')
      setSelectedTranscript(null)
      setSelectedRecordingUrl(null)
      setSelectedDuration(undefined)
      setShowTranscriptModal(true)

      const supabase = createClient()
      const { data } = await supabase
        .from('voice_calls')
        .select('transcript_text, transcript, recording_url, duration_seconds')
        .or(`id.eq.${callId},metadata->>provider_call_id.eq.${callId},metadata->>session_id.eq.${callId}`)
        .maybeSingle()

      if (data?.transcript_text || data?.transcript) {
        setSelectedTranscript(data.transcript_text || data.transcript)
      } else {
        setSelectedTranscript('No transcript record found for this call.')
      }
      if (data?.recording_url) {
        setSelectedRecordingUrl(data.recording_url)
      }
      if (data?.duration_seconds) {
        setSelectedDuration(data.duration_seconds)
      }
    } catch (err) {
      console.error(err)
      setSelectedTranscript('Failed to load call transcript.')
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No leads to export')
      return
    }

    const headers = ['Date', 'Name', 'Phone', 'Email', 'Company', 'Status', 'Interest Level', 'Summary']
    const rows = filtered.map(l => [
      new Date(l.created_at).toLocaleDateString(),
      `"${(l.full_name || l.contact_name || '').replace(/"/g, '""')}"`,
      `"${(l.phone || l.contact_phone || '').replace(/"/g, '""')}"`,
      `"${(l.email || l.contact_email || '').replace(/"/g, '""')}"`,
      `"${(l.company_name || l.company || '').replace(/"/g, '""')}"`,
      `"${(l.status || l.stage || 'new').replace(/"/g, '""')}"`,
      `"${(l.interest_level || 'medium').replace(/"/g, '""')}"`,
      `"${(l.call_summary || l.message || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${filtered.length} leads to CSV`)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--heading)] font-montserrat">
                Leads Captured
              </h1>
              <p className="text-sm text-[var(--muted)]">
                High-intent prospects and sales opportunities identified by your voice agents.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {displayAgents.length > 0 && (
            <div className="relative min-w-[220px]">
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-[var(--heading)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="all" className="bg-[var(--card-bg)] text-[var(--heading)]">
                  All Agents ({leads.length})
                </option>
                {displayAgents.map((agent) => {
                  const count = leads.filter(l => l.agent_id === agent.id).length
                  return (
                    <option key={agent.id} value={agent.id} className="bg-[var(--card-bg)] text-[var(--heading)]">
                      {cleanAgentName(agent.name)} {count > 0 ? `(${count})` : ''}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Export filtered leads to CSV"
          >
            <Download className="w-3.5 h-3.5 text-violet-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] rounded-xl text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Refresh leads list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-violet-500' : ''}`} />
          </button>
        </div>
      </div>

      {isVoiceAgent ? (
        <>
          {/* KPI Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Total Leads</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-[var(--heading)] font-mono">{stats.total}</span>
                <span className="text-xs text-violet-500 font-semibold">Captured</span>
              </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Qualified Prospects</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-500 font-mono">{stats.qualified}</span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-semibold">
                  <Flame className="w-3.5 h-3.5" /> High Intent
                </span>
              </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Contacted</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-500 font-mono">{stats.contacted}</span>
                <span className="text-xs text-amber-500 font-semibold">In Progress</span>
              </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Conversion Rate</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-indigo-500 font-mono">{stats.conversionRate}%</span>
                <span className="text-xs text-indigo-500 font-semibold">Qualified Ratio</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search by prospect name, phone, email, or summary..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] placeholder:text-[var(--muted)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--heading)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--heading)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={interestFilter}
                onChange={e => setInterestFilter(e.target.value)}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--heading)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">All Intent Levels</option>
                <option value="hot">Hot Intent</option>
                <option value="high">High Intent</option>
                <option value="medium">Medium Intent</option>
                <option value="low">Low Intent</option>
              </select>
            </div>
          </div>

          {/* Leads Table Container */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            {leads.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3 min-h-[300px]">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-1">
                  <Target className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-[var(--heading)]">No leads captured yet</h3>
                <p className="text-[var(--muted)] text-xs max-w-sm">
                  Your AI voice agents will automatically log qualified prospects here once they capture contact details during calls.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[250px]">
                <Search className="w-8 h-8 text-[var(--muted)] mb-1 opacity-50" />
                <p className="text-sm font-semibold text-[var(--heading)]">No matching leads</p>
                <p className="text-xs text-[var(--muted)]">Try adjusting your search query or status filter.</p>
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); setInterestFilter('all') }}
                  className="mt-2 text-xs font-bold text-violet-500 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--primary-bg)] border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Prospect Info</th>
                      <th className="px-5 py-3.5">Intent / Summary</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Quick Connect & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtered.map(lead => {
                      const name = lead.full_name || lead.contact_name || 'Prospect'
                      const phone = lead.phone || lead.contact_phone
                      const email = lead.email || lead.contact_email
                      const company = lead.company_name || lead.company
                      const status = (lead.status || lead.stage || 'new').toLowerCase()
                      const interest = (lead.interest_level || 'medium').toLowerCase()

                      return (
                        <tr key={lead.id} className="hover:bg-[var(--hover-bg)] transition-colors group">

                          {/* 1. Date */}
                          <td className="px-5 py-3.5 text-[var(--muted)] font-mono whitespace-nowrap">
                            {formatDate(lead.created_at)}
                          </td>

                          {/* 2. Prospect Info */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-[var(--heading)] text-sm">{name}</span>
                              <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] font-mono">
                                {phone && (
                                  <a
                                    href={`tel:${phone}`}
                                    className="hover:text-violet-500 hover:underline inline-flex items-center gap-1"
                                    title="Click to dial"
                                  >
                                    <Phone className="w-3 h-3 text-violet-500" />
                                    {phone}
                                  </a>
                                )}
                                {email && (
                                  <a
                                    href={`mailto:${email}`}
                                    className="hover:text-violet-500 hover:underline inline-flex items-center gap-1"
                                    title="Click to email"
                                  >
                                    <Mail className="w-3 h-3 text-violet-500" />
                                    {email}
                                  </a>
                                )}
                                {!phone && !email && (
                                  <span className="italic text-[var(--muted)]">No phone/email provided</span>
                                )}
                              </div>
                              {company && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)] font-medium">
                                  <Building className="w-2.5 h-2.5" /> {company}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Intent & Call Summary */}
                          <td className="px-5 py-3.5 max-w-sm">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${interest === 'hot' || interest === 'high'
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    : interest === 'medium'
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                      : 'bg-zinc-500/10 text-[var(--muted)] border border-[var(--border)]'
                                  }`}>
                                  {interest === 'hot' || interest === 'high' ? '🔥' : '⚡'} {interest} intent
                                </span>
                                {lead.budget_range && (
                                  <span className="text-[10px] text-[var(--muted)] font-mono">
                                    Budget: {lead.budget_range}
                                  </span>
                                )}
                              </div>
                              <p className="text-[var(--body)] line-clamp-2 leading-relaxed text-[11px]">
                                {lead.call_summary || lead.message || 'Call intent logged by agent.'}
                              </p>
                            </div>
                          </td>

                          {/* 4. Interactive Status */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <select
                              value={status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer focus:outline-none ${status === 'qualified'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : status === 'contacted'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : status === 'closed'
                                      ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                }`}
                            >
                              <option value="new" className="bg-[var(--card-bg)] text-[var(--heading)]">New</option>
                              <option value="contacted" className="bg-[var(--card-bg)] text-[var(--heading)]">Contacted</option>
                              <option value="qualified" className="bg-[var(--card-bg)] text-[var(--heading)]">Qualified</option>
                              <option value="closed" className="bg-[var(--card-bg)] text-[var(--heading)]">Closed</option>
                            </select>
                          </td>

                          {/* 5. Actions */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {phone && (
                                <button
                                  type="button"
                                  onClick={() => handleCallLead(lead)}
                                  disabled={callingLeadId === lead.id}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                                  title={`Call lead via AI Agent (${phone})`}
                                >
                                  {callingLeadId === lead.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                  ) : (
                                    <Phone className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {email && (
                                <a
                                  href={`mailto:${email}`}
                                  className="p-1.5 bg-[var(--primary-bg)] hover:bg-violet-500/20 text-violet-500 rounded-lg transition-colors"
                                  title={`Direct email: ${email}`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {lead.call_id && (
                                <button
                                  onClick={() => handleViewTranscript(lead.call_id!, name)}
                                  className="p-1.5 bg-[var(--primary-bg)] hover:bg-violet-500/20 text-violet-500 rounded-lg transition-colors"
                                  title="View Full Call Transcript"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="px-2 py-1 bg-[var(--primary-bg)] hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                title="View Lead Details"
                              >
                                Details
                              </button>

                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="p-1.5 bg-[var(--primary-bg)] hover:bg-red-500/20 text-red-500 rounded-lg transition-colors opacity-70 hover:opacity-100"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </>
      ) : (
        /* CRM Not Applicable Empty State */
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
          <Database className="w-10 h-10 text-[var(--muted)] mb-1 opacity-60" />
          <h3 className="text-lg font-bold text-[var(--heading)]">CRM Not Applicable</h3>
          <p className="text-[var(--muted)] text-xs max-w-md">
            This autonomous agent does not capture traditional CRM leads. Outputs are routed directly to connected webhooks or databases.
          </p>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--heading)]">
                    {selectedLead.full_name || selectedLead.contact_name || 'Prospect Details'}
                  </h3>
                  <p className="text-[11px] text-[var(--muted)]">
                    Captured on {formatDate(selectedLead.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Phone</span>
                <span className="font-semibold text-[var(--heading)] font-mono">
                  {selectedLead.phone || selectedLead.contact_phone || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Email</span>
                <span className="font-semibold text-[var(--heading)] font-mono truncate block">
                  {selectedLead.email || selectedLead.contact_email || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Company</span>
                <span className="font-semibold text-[var(--heading)]">
                  {selectedLead.company_name || selectedLead.company || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Interest Level</span>
                <span className="font-semibold capitalize text-amber-500">
                  {selectedLead.interest_level || 'Medium'}
                </span>
              </div>
            </div>

            {/* Call Summary */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
                AI Call Summary & Intent
              </span>
              <div className="p-3 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)] text-xs text-[var(--body)] leading-relaxed">
                {selectedLead.call_summary || selectedLead.message || 'No extended summary captured.'}
              </div>
            </div>

            {/* Actions in Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] gap-2">
              <div className="flex items-center gap-2">
                {selectedLead.call_id && (
                  <button
                    onClick={() => {
                      const cid = selectedLead.call_id!
                      const name = selectedLead.full_name || 'Prospect'
                      setSelectedLead(null)
                      handleViewTranscript(cid, name)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Transcript
                  </button>
                )}
                {selectedLead.phone && (
                  <button
                    type="button"
                    onClick={() => handleCallLead(selectedLead)}
                    disabled={callingLeadId === selectedLead.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {callingLeadId === selectedLead.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Phone className="w-3.5 h-3.5" />
                    )}
                    {callingLeadId === selectedLead.id ? 'Dialing...' : 'Call with AI Agent'}
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="px-3.5 py-1.5 bg-[var(--hover-bg)] text-[var(--heading)] rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={showTranscriptModal}
        onClose={() => {
          setShowTranscriptModal(false)
          setSelectedTranscript(null)
          setSelectedRecordingUrl(null)
          setSelectedDuration(undefined)
        }}
        transcript={selectedTranscript}
        recordingUrl={selectedRecordingUrl}
        callerName={transcriptCallerName}
      />
    </div>
  )
}
