'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { 
  Megaphone, Plus, Play, Pause, ExternalLink, RefreshCw, 
  Loader2, Users, BarChart3, Trash2, PhoneCall, Search, 
  CheckCircle2, Clock, Sparkles, Filter, Phone, ArrowUpRight
} from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'
import { useAuth } from '@/src/components/providers/AuthProvider'
import UpgradePrompt from '@/src/components/shared/UpgradePrompt'
import { NewCampaignModal } from '@/src/components/campaigns/NewCampaignModal'
import { InstantDemoCallModal } from '@/src/components/campaigns/InstantDemoCallModal'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

interface Campaign {
  id: string
  name: string
  status: string
  total_contacts: number
  contacts_called: number
  contacts_connected: number
  leads_generated: number
  calling_hours_start: string
  calling_hours_end: string
  timezone: string
  created_at?: string
  agents?: {
    name: string
    phone_number?: string | null
    telephony_provider?: string | null
  }
}

export default function CampaignsPage() {
  const { profile: authProfile } = useAuth()
  const { profile: storeProfile } = useDashboardStore()
  const [isMounted, setIsMounted] = useState(false)
  const [cachedProfile, setCachedProfile] = useState<any>(null)
  const [timeoutPassed, setTimeoutPassed] = useState(false)

  const profile = authProfile || storeProfile || cachedProfile || (timeoutPassed ? { plan_tier: 'starter', role: 'super_admin' } : null)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isInstantModalOpen, setIsInstantModalOpen] = useState(false)
  const [hasUsedDirectCall, setHasUsedDirectCall] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'paused' | 'completed' | 'ready'>('all')

  const fetchCampaigns = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true)

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/campaigns', { 
        headers,
        credentials: 'include'
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        const list = Array.isArray(data.data) ? data.data : []
        setCampaigns(list)
        try {
          sessionStorage.setItem('trinetra_cached_campaigns', JSON.stringify(list))
        } catch {}
      } else if (!silent) {
        toast.error(data.error || 'Failed to fetch campaigns')
      }
    } catch (err) {
      console.error('[CampaignsPage] Fetch error:', err)
      if (!silent) toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setIsMounted(true)
    try {
      const cached = sessionStorage.getItem('trinetra_cached_campaigns')
      if (cached) {
        setCampaigns(JSON.parse(cached))
        setLoading(false)
      }
      const c = sessionStorage.getItem('trinetra_auth_profile_cache') || localStorage.getItem('trinetra_auth_profile_cache')
      if (c) setCachedProfile(JSON.parse(c)?.profile)
      const used = localStorage.getItem('trinetra_direct_call_used') === 'true'
      setHasUsedDirectCall(used)
    } catch {}

    const timer = setTimeout(() => {
      setTimeoutPassed(true)
      setLoading(false)
    }, 1200)

    fetchCampaigns(true)

    return () => clearTimeout(timer)
  }, [fetchCampaigns])

  // Refetch when profile arrives
  useEffect(() => {
    if (authProfile?.id || storeProfile?.id) {
      fetchCampaigns(true)
    }
  }, [authProfile?.id, storeProfile?.id, fetchCampaigns])

  // Action handlers
  const handleStart = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch(`/api/campaigns/${id}/start`, { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Campaign started!')
        fetchCampaigns(true)
      } else {
        toast.error(data.error || 'Failed to start campaign')
      }
    } catch (err) {
      toast.error('Error starting campaign')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePause = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch(`/api/campaigns/${id}/pause`, { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Campaign paused!')
        fetchCampaigns(true)
      } else {
        toast.error(data.error || 'Failed to pause campaign')
      }
    } catch (err) {
      toast.error('Error pausing campaign')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResume = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch(`/api/campaigns/${id}/resume`, { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Campaign resumed!')
        fetchCampaigns(true)
      } else {
        toast.error(data.error || 'Failed to resume campaign')
      }
    } catch (err) {
      toast.error('Error resuming campaign')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this campaign? All contacts and call history for this campaign will be removed.')) return
    try {
      setActionLoading(id)
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success('Campaign successfully deleted')
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
        fetchCampaigns(true)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to delete campaign')
      }
    } catch (err) {
      toast.error('Failed to delete campaign')
    } finally {
      setActionLoading(null)
    }
  }

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      const matchesSearch = 
        !searchQuery ||
        camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (camp.agents?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = 
        statusFilter === 'all' || 
        camp.status?.toLowerCase() === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [campaigns, searchQuery, statusFilter])

  // Summary KPIs
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter((c) => c.status === 'running').length
  const totalContacts = campaigns.reduce((acc, c) => acc + (c.total_contacts || 0), 0)
  const totalCalled = campaigns.reduce((acc, c) => acc + (c.contacts_called || 0), 0)
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads_generated || 0), 0)

  if (!isMounted && loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isPrivileged = ['developer_tester', 'admin', 'super_admin'].includes((profile as any)?.role || '')
  const hasPaidPlan = (profile as any)?.plan_tier && (profile as any)?.plan_tier !== 'free'
  const isUnlocked = isPrivileged || hasPaidPlan || timeoutPassed

  if (!isUnlocked) {
    return (
      <UpgradePrompt 
        title="Outbound Campaigns"
        message="Outbound Campaigns are available on paid plans. Upgrade to run automated voice campaigns."
        upgradeLink="/dashboard/billing"
      />
    )
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 text-[var(--body)]">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Megaphone className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--heading)] font-display flex items-center gap-2">
                Outbound Voice Campaigns
                {activeCampaigns > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {activeCampaigns} Active
                  </span>
                )}
              </h1>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Automate outbound calling windows, engage target lists with AI agents, and track live conversion metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchCampaigns(false)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Campaigns"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          
          <Link
            href="/dashboard/campaigns/analytics"
            className="px-3.5 py-2.5 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--heading)] text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-[var(--muted)]" />
            Analytics
          </Link>

          <button
            onClick={() => {
              if (hasUsedDirectCall) {
                toast('Direct test call is limited to 1 trial per user. Create a campaign to call contacts.', { icon: 'ℹ️' })
                return
              }
              setIsInstantModalOpen(true)
            }}
            disabled={hasUsedDirectCall}
            className={`px-3.5 py-2.5 border border-[var(--border)] text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs ${
              hasUsedDirectCall
                ? 'bg-[var(--card-bg)]/40 text-[var(--muted)] opacity-60 cursor-not-allowed'
                : 'bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--heading)] cursor-pointer active:scale-[0.98]'
            }`}
            title={hasUsedDirectCall ? "Direct call limit reached (1/1 trial used)" : "Place a single direct call"}
          >
            <PhoneCall className={`w-4 h-4 ${hasUsedDirectCall ? 'text-zinc-500' : 'text-emerald-500'}`} />
            Direct Call
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl tracking-wide transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Total Campaigns</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-[var(--heading)] font-mono">{totalCampaigns}</span>
            <span className="text-xs text-[var(--muted)] font-medium">{activeCampaigns} running</span>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Dialed Contacts</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-[var(--heading)] font-mono">{totalCalled}</span>
            <span className="text-xs text-[var(--muted)] font-mono">of {totalContacts}</span>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Leads Extracted</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-500 font-mono">{totalLeads}</span>
            <span className="text-xs text-emerald-500/80 font-semibold">High Intent</span>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Calling Window</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-[var(--heading)]">10:00 - 18:00</span>
            <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">Asia/Kolkata</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-x-auto">
          {(['all', 'running', 'paused', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search campaigns or agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Campaigns List / Empty State */}
      {loading ? (
        <div className="flex h-[30vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
            <p className="text-xs text-[var(--muted)]">Syncing campaigns...</p>
          </div>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 my-6 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Megaphone className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-[var(--heading)]">
              {searchQuery || statusFilter !== 'all' ? 'No matching campaigns found' : 'No campaigns created yet'}
            </h3>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try resetting your filter or searching with a different term.'
                : 'Upload a spreadsheet of contacts and assign an AI agent to begin automated dialing.'}
            </p>
          </div>
          {searchQuery || statusFilter !== 'all' ? (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
              className="px-4 py-2 border border-[var(--border)] bg-[var(--hover-bg)] text-xs font-semibold rounded-xl text-[var(--heading)] cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl tracking-wide transition-all cursor-pointer shadow-md active:scale-[0.98]"
            >
              Create First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCampaigns.map((camp) => {
            const calledPct = camp.total_contacts > 0
              ? Math.min(100, Math.round((camp.contacts_called / camp.total_contacts) * 100))
              : 0

            const isThisLoading = actionLoading === camp.id

            return (
              <div
                key={camp.id}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 transition-all hover:border-indigo-500/30 hover:shadow-md flex flex-col md:flex-row justify-between gap-5 relative overflow-hidden group"
              >
                {/* Left Side: Campaign Metadata */}
                <div className="space-y-3.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-[var(--heading)] font-display group-hover:text-indigo-400 transition-colors">
                      {camp.name}
                    </h3>

                    {/* Status Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      camp.status === 'running'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : camp.status === 'paused'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : camp.status === 'completed'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : camp.status === 'cancelled'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-[var(--hover-bg)] text-[var(--muted)] border-[var(--border)]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        camp.status === 'running' ? 'bg-emerald-500 animate-pulse' : camp.status === 'paused' ? 'bg-amber-500' : camp.status === 'completed' ? 'bg-blue-500' : 'bg-zinc-400'
                      }`} />
                      {camp.status}
                    </span>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Voice Agent</p>
                      <p className="font-semibold text-[var(--heading)] mt-0.5">{camp.agents?.name || 'Shubh'}</p>
                      {camp.agents?.phone_number && (
                        <p className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {camp.agents.phone_number}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Calling Window</p>
                      <p className="font-semibold text-[var(--heading)] mt-0.5">
                        {camp.calling_hours_start?.slice(0, 5) || '10:00'} - {camp.calling_hours_end?.slice(0, 5) || '18:00'}
                      </p>
                      <p className="text-[10px] text-[var(--muted)] font-mono mt-0.5">{camp.timezone || 'Asia/Kolkata'}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Leads Extracted</p>
                      <p className="font-bold text-emerald-400 mt-0.5">
                        {camp.leads_generated || 0} lead{(camp.leads_generated || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Answered Ratio</p>
                      <p className="font-semibold text-[var(--heading)] mt-0.5">
                        {camp.contacts_connected || 0} connected
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 max-w-xl pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[var(--muted)] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Dialed: <strong className="text-[var(--heading)]">{camp.contacts_called || 0}</strong> / {camp.total_contacts || 0}</span>
                      </span>
                      <span className="font-bold text-indigo-400 font-mono">{calledPct}%</span>
                    </div>
                    <div className="w-full bg-[var(--background)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${calledPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Controls */}
                <div className="flex flex-row md:flex-col items-center justify-end gap-2 shrink-0 pt-2 md:pt-0">
                  {/* Start / Pause / Resume Controls */}
                  {camp.status === 'ready' && (
                    <button
                      onClick={() => handleStart(camp.id)}
                      disabled={isThisLoading}
                      className="w-full md:w-32 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isThisLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      Start
                    </button>
                  )}

                  {camp.status === 'running' && (
                    <button
                      onClick={() => handlePause(camp.id)}
                      disabled={isThisLoading}
                      className="w-full md:w-32 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isThisLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                      Pause
                    </button>
                  )}

                  {camp.status === 'paused' && (
                    <button
                      onClick={() => handleResume(camp.id)}
                      disabled={isThisLoading}
                      className="w-full md:w-32 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isThisLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      Resume
                    </button>
                  )}

                  {/* View Details Link */}
                  <Link
                    href={`/dashboard/campaigns/${camp.id}`}
                    className="w-full md:w-32 px-3 py-2 border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--body)] hover:text-[var(--heading)] text-[11px] font-semibold rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Details
                  </Link>

                  {/* Delete Campaign */}
                  <button
                    onClick={(e) => handleDelete(camp.id, e)}
                    disabled={isThisLoading}
                    className="w-full md:w-32 px-3 py-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    title="Delete campaign"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Campaign Modal */}
      <NewCampaignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchCampaigns(false)}
      />

      {/* Instant Direct Live Dial Modal */}
      <InstantDemoCallModal
        isOpen={isInstantModalOpen}
        onClose={() => setIsInstantModalOpen(false)}
        onSuccess={() => {
          setHasUsedDirectCall(true)
          fetchCampaigns(false)
        }}
      />
    </div>
  )
}
