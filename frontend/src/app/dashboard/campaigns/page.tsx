'use client'

import React, { useEffect, useState } from 'react'
import { Megaphone, Plus, Play, Pause, ExternalLink, RefreshCw, Loader2, Users, BarChart3 } from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'
import UpgradePrompt from '@/src/components/shared/UpgradePrompt'
import { NewCampaignModal } from '@/src/components/campaigns/NewCampaignModal'
import toast from 'react-hot-toast'
import Link from 'next/link'

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
  agents?: {
    name: string
  }
}

export default function CampaignsPage() {
  const { profile } = useDashboardStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      const userPlanTier = (profile as any)?.plan_tier?.toLowerCase() || 'free'
      if (userPlanTier !== 'free' && userPlanTier !== 'free_demo') {
        fetchCampaigns()
      }
    }
  }, [profile])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (res.ok) {
        setCampaigns(data.data || [])
      } else {
        toast.error(data.error || 'Failed to fetch campaigns')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Campaign started!')
        fetchCampaigns()
      } else {
        toast.error(data.error || 'Failed to start campaign')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error starting campaign')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePause = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Campaign paused!')
        fetchCampaigns()
      } else {
        toast.error(data.error || 'Failed to pause campaign')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error pausing campaign')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResume = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch(`/api/campaigns/${id}/resume`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Campaign resumed!')
        fetchCampaigns()
      } else {
        toast.error(data.error || 'Failed to resume campaign')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error resuming campaign')
    } finally {
      setActionLoading(null)
    }
  }

  if (!profile) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const userPlanTier = (profile as any)?.plan_tier?.toLowerCase() || 'free'
  if (userPlanTier === 'free' || userPlanTier === 'free_demo') {
    return (
      <UpgradePrompt 
        title="Outbound Campaigns"
        message="Outbound Campaigns are available on paid plans. Upgrade to the ₹99 Trial or a paid plan to run automated voice campaigns."
        upgradeLink="/dashboard/billing"
      />
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 text-[var(--body)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--heading)] font-display flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-violet-500" />
            Outbound Campaigns
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">Upload prospect lists, schedule calling windows, and view AI-dialing conversion metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCampaigns}
            className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer"
            title="Refresh Campaigns"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <Link
            href="/dashboard/campaigns/analytics"
            className="px-4 py-2.5 border border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/25 text-violet-400 text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            Compare
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex h-[40vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-xs text-[var(--muted)]">Loading campaigns...</p>
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--hover-bg)] border border-[var(--border)] flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6 text-[var(--muted)]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[var(--heading)]">No campaigns yet</h3>
            <p className="text-xs text-[var(--muted)] max-w-md mx-auto">Create your first campaign by uploading a spreadsheet of contacts and assigning an AI agent to handle the calls.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer"
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {campaigns.map((camp) => {
            const calledPercentage = camp.total_contacts > 0 
              ? Math.round((camp.contacts_called / camp.total_contacts) * 100) 
              : 0;

            const isActionLoading = actionLoading === camp.id;

            return (
              <div 
                key={camp.id}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden transition-all hover:shadow-lg flex flex-col md:flex-row justify-between gap-6"
              >
                {/* Left Side Info */}
                <div className="space-y-4 flex-1">
                  <div className="flex items-start justify-between md:justify-start gap-3">
                    <h3 className="text-base font-bold text-[var(--heading)] font-display">{camp.name}</h3>
                    
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border font-montserrat ${
                      camp.status === 'running'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : camp.status === 'paused'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : camp.status === 'completed'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        : camp.status === 'cancelled'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : 'bg-[var(--hover-bg)] text-[var(--muted)] border-[var(--border)]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        camp.status === 'running' ? 'bg-emerald-500 animate-pulse' : camp.status === 'paused' ? 'bg-amber-500' : camp.status === 'completed' ? 'bg-blue-500' : 'bg-[var(--muted)]'
                      }`} />
                      {camp.status}
                    </span>
                  </div>

                  {/* Calling Parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Agent Assigned</p>
                      <p className="font-semibold text-[var(--heading)] mt-0.5">{camp.agents?.name || 'Unknown Agent'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Calling Hours</p>
                      <p className="font-semibold text-[var(--heading)] mt-0.5">{camp.calling_hours_start} - {camp.calling_hours_end}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Timezone</p>
                      <p className="font-semibold text-[var(--heading)] mt-0.5">{camp.timezone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Leads Generated</p>
                      <p className="font-semibold text-emerald-500 mt-0.5">{camp.leads_generated} lead{camp.leads_generated !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Calling Progress Bar */}
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[var(--body)] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[var(--muted)]" />
                        Progress: {camp.contacts_called} / {camp.total_contacts} Dialed ({camp.contacts_connected} connected)
                      </span>
                      <span className="font-bold text-[var(--heading)] font-mono">{calledPercentage}%</span>
                    </div>
                    <div className="w-full bg-[var(--background)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
                      <div 
                        className="bg-violet-600 h-full rounded-full transition-all duration-550"
                        style={{ width: `${calledPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex flex-row md:flex-col items-center justify-end gap-2.5 shrink-0">
                  {/* Start / Pause / Resume */}
                  {camp.status === 'ready' && (
                    <button
                      onClick={() => handleStart(camp.id)}
                      disabled={isActionLoading}
                      className="w-full md:w-32 px-3 py-2 bg-emerald-555 hover:bg-emerald-666 text-white text-[10px] font-black uppercase rounded-lg tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start
                    </button>
                  )}

                  {camp.status === 'running' && (
                    <button
                      onClick={() => handlePause(camp.id)}
                      disabled={isActionLoading}
                      className="w-full md:w-32 px-3 py-2 bg-amber-555 hover:bg-amber-666 text-white text-[10px] font-black uppercase rounded-lg tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </button>
                  )}

                  {camp.status === 'paused' && (
                    <button
                      onClick={() => handleResume(camp.id)}
                      disabled={isActionLoading}
                      className="w-full md:w-32 px-3 py-2 bg-emerald-555 hover:bg-emerald-666 text-white text-[10px] font-black uppercase rounded-lg tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Resume
                    </button>
                  )}

                  {/* View Details */}
                  <Link
                    href={`/dashboard/campaigns/${camp.id}`}
                    className="w-full md:w-32 px-3 py-2 border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--body)] hover:text-[var(--heading)] text-[10px] font-black uppercase rounded-lg tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Details
                  </Link>
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
        onSuccess={fetchCampaigns}
      />
    </div>
  )
}
