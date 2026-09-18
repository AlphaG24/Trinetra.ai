'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Megaphone, ArrowLeft, Play, Pause, RefreshCw, 
  Search, ChevronLeft, ChevronRight, AlertCircle, 
  Bot, Clock, Globe, ShieldAlert, Phone, PhoneCall, CheckCircle, 
  XOctagon, Ban, Hourglass, Trash2, HelpCircle, Loader2, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { AgentCallingStatus } from '../agents/AgentCallingStatus'
import { createClient } from '@/utils/supabase/client'
import { TranscriptModal } from '../modals/TranscriptModal'

interface Contact {
  id: string
  full_name: string
  phone: string
  company_name: string
  notes: string
  call_status: string
  call_attempts: number
  last_attempt_at: string
  call_id: string | null
  lead_id: string | null
}

interface CampaignDetail {
  id: string
  name: string
  status: string
  total_contacts: number
  contacts_called: number
  contacts_connected: number
  leads_generated: number
  contacts_dnd?: number
  calling_hours_start: string
  calling_hours_end: string
  timezone: string
  contact_list_url?: string | null
  agent_id?: string
  agents?: {
    name: string
    phone_number?: string | null
    telephony_provider?: string | null
  }
}

interface CampaignDetailClientProps {
  campaignId: string
}

export function CampaignDetailClient({ campaignId }: CampaignDetailClientProps) {
  const router = useRouter()
  
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [campaignLoading, setCampaignLoading] = useState(true)
  
  // Agent details for calling status
  const [agentPhone, setAgentPhone] = useState<string | null>(null)
  const [agentProvider, setAgentProvider] = useState<string | null>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  
  // Contacts pagination & search state
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsCount, setContactsCount] = useState(0)
  const [contactsLoading, setContactsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [searchVal, setSearchVal] = useState('') // input value
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [actionLoading, setActionLoading] = useState(false)
  const [retryingContactId, setRetryingContactId] = useState<string | null>(null)
  const [showTranscriptModal, setShowTranscriptModal] = useState(false)
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null)
  const [selectedRecordingUrl, setSelectedRecordingUrl] = useState<string | null>(null)
  const [selectedCallerName, setSelectedCallerName] = useState<string>('Contact')
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(undefined)

  const handleOpenTranscript = async (callId: string, contactName: string, contactId?: string) => {
    try {
      setSelectedCallerName(contactName || 'Contact')
      setSelectedTranscript(null)
      setSelectedRecordingUrl(null)
      setSelectedDuration(undefined)
      setShowTranscriptModal(true)

      const supabase = createClient()
      let query = supabase
        .from('voice_calls')
        .select('transcript_text, transcript, recording_url, duration_seconds')

      if (callId && contactId) {
        query = query.or(`id.eq.${callId},metadata->>provider_call_id.eq.${callId},metadata->>session_id.eq.${callId},metadata->>contact_id.eq.${contactId}`)
      } else if (callId) {
        query = query.or(`id.eq.${callId},metadata->>provider_call_id.eq.${callId},metadata->>session_id.eq.${callId}`)
      } else if (contactId) {
        query = query.eq('metadata->>contact_id', contactId)
      }

      const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()

      if (data?.recording_url) {
        setSelectedRecordingUrl(data.recording_url)
      }
      if (data?.duration_seconds !== undefined) {
        setSelectedDuration(data.duration_seconds)
      }

      if (data?.transcript_text || data?.transcript) {
        setSelectedTranscript(data.transcript_text || data.transcript)
      } else {
        setSelectedTranscript('No transcript registered for this call yet.')
      }
    } catch (err) {
      console.error('Error loading transcript:', err)
      setSelectedTranscript('Failed to load transcript.')
    }
  }
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch agent details once campaign is loaded
  useEffect(() => {
    if (campaign?.agents) {
      if (campaign.agents.phone_number) setAgentPhone(campaign.agents.phone_number)
      if (campaign.agents.telephony_provider) setAgentProvider(campaign.agents.telephony_provider)
    }
    if (campaign?.agent_id) {
      fetchAgentInfo(campaign.agent_id)
    }
  }, [campaign?.agent_id, campaign?.agents])

  const fetchAgentInfo = async (agentId: string) => {
    try {
      setAgentLoading(true)
      const res = await fetch(`/api/agents/${agentId}`)
      const data = await res.json()
      if (res.ok && data.success && data.data) {
        setAgentPhone(data.data.phone_number || null)
        setAgentProvider(data.data.telephony_provider || (data.data.phone_number ? 'twilio' : null))
      }
    } catch (err) {
      console.error("Failed to fetch agent info for campaign:", err)
    } finally {
      setAgentLoading(false)
    }
  }

  const isSimulated = !agentPhone || !agentProvider || agentProvider === 'simulated' || agentProvider === 'sandbox'

  // Fetch campaign info
  const fetchCampaignInfo = async (silent = false) => {
    try {
      if (!silent) setCampaignLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}`)
      const data = await res.json()
      if (res.ok) {
        setCampaign(data.data)
      } else {
        toast.error(data.error || 'Failed to fetch campaign details')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load campaign info')
    } finally {
      if (!silent) setCampaignLoading(false)
    }
  }

  // Fetch campaign contacts
  const fetchCampaignContacts = async (silent = false) => {
    try {
      if (!silent) setContactsLoading(true)
      let url = `/api/campaigns/${campaignId}/contacts?page=${page}&limit=${limit}`
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }
      if (statusFilter !== 'all') {
        url += `&status=${encodeURIComponent(statusFilter)}`
      }
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setContacts(data.data || [])
        setContactsCount(data.count || 0)
      } else {
        toast.error(data.error || 'Failed to fetch contacts')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load contacts list')
    } finally {
      if (!silent) setContactsLoading(false)
    }
  }

  // Load initially
  useEffect(() => {
    fetchCampaignInfo()
  }, [campaignId])

  // Load contacts when page/search changes
  useEffect(() => {
    fetchCampaignContacts()
  }, [campaignId, page, search, statusFilter])

  // Poll progress: only as a slow fallback (every 20s) when campaign is actively running/dialing
  // Supabase Realtime below already pushes instant changes without exhausting Disk IO budget
  useEffect(() => {
    const isActive = campaign?.status === 'running' || campaign?.status === 'dialing'
    if (!isActive) return

    pollIntervalRef.current = setInterval(() => {
      fetchCampaignInfo(true)
      fetchCampaignContacts(true)
    }, 20000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [campaign?.status, page, search, statusFilter])

  // Setup Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    
    const campaignChannel = supabase
      .channel(`campaign_detail_${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`
        },
        (payload) => {
          setCampaign(payload.new as CampaignDetail)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_contacts',
          filter: `campaign_id=eq.${campaignId}`
        },
        () => {
          fetchCampaignContacts(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(campaignChannel)
    }
  }, [campaignId, page, search, statusFilter])

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchVal)
  }

  // Handle start
  const handleStart = async () => {
    try {
      setActionLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/start`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Campaign calling loop started in the background!')
        fetchCampaignInfo()
        fetchCampaignContacts()
      } else {
        toast.error(data.error || 'Failed to start campaign')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error starting campaign')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle pause
  const handlePause = async () => {
    try {
      setActionLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/pause`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Campaign paused!')
        fetchCampaignInfo()
        fetchCampaignContacts()
      } else {
        toast.error(data.error || 'Failed to pause campaign')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error pausing campaign')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle resume
  const handleResume = async () => {
    try {
      setActionLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/resume`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Campaign calling loop resumed in the background!')
        fetchCampaignInfo()
        fetchCampaignContacts()
      } else {
        toast.error(data.error || 'Failed to resume campaign')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error resuming campaign')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle campaign delete
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this campaign? All contacts and call history for this campaign will be removed.")) return
    try {
      setActionLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Campaign successfully deleted')
        router.push('/dashboard/campaigns')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete campaign')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error deleting campaign')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle manual contact retry
  const handleRetryContact = async (contactId: string) => {
    try {
      setRetryingContactId(contactId)
      const res = await fetch(`/api/campaigns/${campaignId}/contacts/${contactId}/retry`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Calling contact...')
        await fetchCampaignInfo(true)
        await fetchCampaignContacts(true)
      } else {
        toast.error(data.error || 'Failed to reset contact')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error resetting contact')
    } finally {
      setRetryingContactId(null)
    }
  }

  if (campaignLoading && !campaign) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          <p className="text-xs text-[var(--muted)]">Loading campaign details...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto mt-12">
        <ShieldAlert className="w-12 h-12" />
        <h3 className="text-sm font-bold">Campaign Not Found</h3>
        <p className="text-xs text-[var(--muted)] text-center">We couldn't locate this campaign. It may have been deleted or organization constraints apply.</p>
        <Link href="/dashboard/campaigns" className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider transition-all">
          Back to Overview
        </Link>
      </div>
    )
  }

  const completedCount = contacts.filter(c => ['answered', 'completed', 'no_answer', 'busy', 'failed', 'dnd'].includes((c.call_status || '').toLowerCase())).length;
  const pendingCount = contacts.filter(c => (c.call_status || '').toLowerCase() === 'pending').length;
  const dialingCount = contacts.filter(c => (c.call_status || '').toLowerCase() === 'dialing').length;

  const calledPercentage = campaign.status === 'completed' 
    ? 100 
    : (contactsCount > 0 ? Math.min(100, Math.round((completedCount / contactsCount) * 100)) : 0);

  const totalPages = Math.ceil(contactsCount / limit) || 1;

  // Status rendering helper
  const getCallStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-[var(--background)] text-[var(--muted)] border-[var(--border)]'
      case 'dialing': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse'
      case 'answered': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'no_answer': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'busy': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'failed': return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      case 'dnd': return 'border-red-500/20 bg-zinc-800 text-red-400'
      default: return 'bg-[var(--hover-bg)] text-[var(--body)] border-[var(--border)]'
    }
  }

  const getCallStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Hourglass className="w-3.5 h-3.5" />
      case 'dialing': return <PhoneCall className="w-3.5 h-3.5" />
      case 'answered': return <CheckCircle className="w-3.5 h-3.5" />
      case 'no_answer': return <Clock className="w-3.5 h-3.5" />
      case 'busy': return <Clock className="w-3.5 h-3.5" />
      case 'failed': return <XOctagon className="w-3.5 h-3.5" />
      case 'dnd': return <Ban className="w-3.5 h-3.5" />
      default: return <HelpCircle className="w-3.5 h-3.5" />
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 text-[var(--body)]">
      
      {/* Top Bar Navigation & Actions */}
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
              {campaign.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-[var(--muted)]">Campaign ID: {campaign.id}</span>
              <span className="text-[10px] text-[var(--muted)]">•</span>
              <AgentCallingStatus 
                phoneNumber={agentPhone} 
                providerType={agentProvider} 
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Controls */}
          {campaign.status === 'ready' && (
            <button
              onClick={handleStart}
              disabled={actionLoading || isSimulated}
              className="px-4 py-2 text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#059669', color: '#ffffff' }}
              title={isSimulated ? "Outbound calling requires real number and provider connected" : undefined}
            >
              <Play className="w-4 h-4 fill-white" />
              Start Campaign
            </button>
          )}

          {campaign.status === 'running' && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#d97706', color: '#ffffff' }}
            >
              <Pause className="w-4 h-4 fill-white" />
              Pause Calling
            </button>
          )}

          {campaign.status === 'paused' && (
            <button
              onClick={handleResume}
              disabled={actionLoading || isSimulated}
              className="px-4 py-2 text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#059669', color: '#ffffff' }}
              title={isSimulated ? "Outbound calling requires real number and provider connected" : undefined}
            >
              <Play className="w-4 h-4 fill-white" />
              Resume Calling
            </button>
          )}

          {/* Analytics Link */}
          <Link
            href={`/dashboard/campaigns/${campaignId}/analytics`}
            className="px-4 py-2 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Link>

          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="px-4 py-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {isSimulated && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl p-4 text-xs flex items-start gap-2.5 text-left">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-[var(--heading)]">Outbound Calling Disabled (Simulation Mode)</p>
            <p className="text-[var(--body)]">
              This campaign's voice agent is in Test/Simulated Mode (or has no active phone number assigned). 
              Outbound automated dialing requires a real telephony number and active provider. 
              Please assign a real phone number to this agent to run campaigns.
            </p>
          </div>
        </div>
      )}

      {/* Main Campaign Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Progress Card */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Campaign Status</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                campaign.status === 'running' ? 'bg-emerald-500 animate-pulse' : campaign.status === 'paused' ? 'bg-amber-500' : campaign.status === 'completed' ? 'bg-blue-500' : 'bg-[var(--muted)]'
              }`} />
              <span className="text-base font-bold text-[var(--heading)] capitalize">{campaign.status}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-[var(--muted)]">
              <span>PROGRESS</span>
              <span>{calledPercentage}%</span>
            </div>
            <div className="w-full bg-[var(--background)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
              <div 
                className="bg-violet-600 h-full rounded-full transition-all duration-550"
                style={{ width: `${calledPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Contacts Card */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2">
          <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Dialing Quota</p>
          <p className="text-3xl font-extrabold text-[var(--heading)] font-mono">{contactsCount || campaign.total_contacts}</p>
          <p className="text-[10px] text-[var(--muted)] font-sans">{contactsCount || campaign.total_contacts} total contacts ({pendingCount} pending{dialingCount > 0 ? `, ${dialingCount} dialing` : ''})</p>
        </div>

        {/* Connected Calls Card */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2">
          <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Answered Ratio</p>
          <p className="text-3xl font-extrabold text-blue-500 font-mono">
            {campaign.contacts_connected} 
            <span className="text-xs text-[var(--muted)] font-sans font-bold ml-1.5">
              ({campaign.contacts_called > 0 ? Math.min(100, Math.round((campaign.contacts_connected / campaign.contacts_called) * 100)) : 0}% connected)
            </span>
          </p>
          <p className="text-[10px] text-[var(--muted)] font-sans">Total calls answered by active customer contacts</p>
        </div>

        {/* Leads Extracted Card */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2">
          <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Leads Extracted</p>
          <p className="text-3xl font-extrabold text-emerald-500 font-mono">
            {campaign.leads_generated}
            <span className="text-xs text-[var(--muted)] font-sans font-bold ml-1.5">
              ({campaign.contacts_connected > 0 ? Math.round((campaign.leads_generated / campaign.contacts_connected) * 100) : 0}% conversion)
            </span>
          </p>
          <p className="text-[10px] text-[var(--muted)] font-sans">High-intent prospects identified by AI agent</p>
        </div>

        {/* Skipped DND Card */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2">
          <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">DND Skipped</p>
          <p className="text-3xl font-extrabold text-rose-400 font-mono">
            {campaign.contacts_dnd || 0}
          </p>
          <p className="text-[10px] text-[var(--muted)] font-sans">Numbers automatically skipped (DND)</p>
        </div>
      </div>

      {/* Meta configuration settings */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-violet-500" />
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Voice Agent</p>
            <p className="font-semibold text-[var(--heading)] mt-0.5">{campaign.agents?.name || 'Unknown Agent'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-500" />
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Calling Window</p>
            <p className="font-semibold text-[var(--heading)] mt-0.5">{campaign.calling_hours_start} - {campaign.calling_hours_end}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-violet-500" />
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Timezone</p>
            <p className="font-semibold text-[var(--heading)] mt-0.5">{campaign.timezone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-violet-500" />
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Contact List URL</p>
            {campaign.contact_list_url ? (
              <a 
                href={campaign.contact_list_url} 
                target="_blank" 
                rel="noreferrer" 
                className="font-semibold text-violet-500 hover:underline mt-0.5 block truncate max-w-[180px]"
              >
                Download Spreadsheet
              </a>
            ) : (
              <p className="font-semibold text-[var(--muted)] mt-0.5">Not available</p>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Contacts Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        
        {/* Table Filter / Search bar */}
        <div className="p-5 border-b border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--background)]/20">
          <h3 className="text-sm font-bold text-[var(--heading)]">Campaign Contacts List</h3>
          
          <div className="flex w-full sm:w-auto items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1)
                setStatusFilter(e.target.value)
              }}
              className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--body)] focus:outline-none focus:border-violet-500 transition-all font-sans"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="dialing">Dialing</option>
              <option value="answered">Answered</option>
              <option value="no_answer">No Answer</option>
              <option value="busy">Busy</option>
              <option value="failed">Failed</option>
              <option value="dnd">DND Skipped</option>
            </select>

            <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input 
                type="text"
                placeholder="Search contacts..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 transition-all font-sans"
              />
            </form>
          </div>
        </div>

        {/* Contacts Table List */}
        {contactsLoading && contacts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            <p className="text-xs text-[var(--muted)]">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-[var(--muted)]">
            <AlertCircle className="w-8 h-8" />
            <p className="text-xs font-bold text-[var(--heading)]">No contacts found</p>
            <p className="text-[10px]">No records match your query or have been imported yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]/35 text-[10px] text-[var(--muted)] font-black uppercase tracking-wider font-montserrat">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Dial Status</th>
                  <th className="px-6 py-4 text-center">Attempts</th>
                  <th className="px-6 py-4">Linked Records</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {contacts.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--hover-bg)]/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[var(--heading)]">{item.full_name || '—'}</td>
                    <td className="px-6 py-4 font-mono text-[var(--body)]">{item.phone}</td>
                    <td className="px-6 py-4 text-[var(--body)]">{item.company_name || '—'}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isDialing = campaign.status === 'running' && item.call_status.toLowerCase() === 'dialing';
                        const effectiveStatus = (!isDialing && item.call_status.toLowerCase() === 'dialing')
                          ? (item.call_attempts > 0 ? 'answered' : 'pending')
                          : item.call_status;
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border font-montserrat ${getCallStatusBadgeClass(effectiveStatus)}`}>
                            {getCallStatusIcon(effectiveStatus)}
                            {effectiveStatus}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-[var(--body)]">{item.call_attempts}</td>
                    <td className="px-6 py-4 space-y-1">
                      {(item.call_id || item.call_attempts > 0) && (
                        <button
                          type="button"
                          onClick={() => handleOpenTranscript(item.call_id || '', item.full_name, item.id)}
                          className="block text-[10px] text-violet-500 hover:text-violet-400 font-bold hover:underline cursor-pointer text-left"
                        >
                          View Call Transcript
                        </button>
                      )}
                      {item.lead_id && (
                        <Link 
                          href="/dashboard/leads" 
                          className="block text-[10px] text-emerald-500 font-bold hover:underline"
                        >
                          View Extracted Lead
                        </Link>
                      )}
                      {!item.call_id && !item.lead_id && item.call_attempts === 0 && <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(() => {
                        const isDialing = campaign.status === 'running' && item.call_status.toLowerCase() === 'dialing' && (!item.last_attempt_at || (Date.now() - new Date(item.last_attempt_at).getTime()) < 35000);
                        const isRetrying = retryingContactId === item.id;
                        return (
                          <button
                            onClick={() => handleRetryContact(item.id)}
                            disabled={isRetrying || item.call_status.toLowerCase() === 'dnd' || isDialing}
                            className="px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ml-auto shadow-sm"
                            title={item.call_status.toLowerCase() === 'dnd' ? "DND numbers cannot be retried" : "Retry/Dial this contact"}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isDialing || isRetrying ? 'animate-spin text-amber-500' : ''}`} />
                            {isRetrying ? 'Connecting...' : (isDialing ? 'Dialing...' : 'Retry Call')}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-[var(--border)] flex items-center justify-between text-xs bg-[var(--background)]/20">
            <span className="font-semibold text-[var(--muted)]">
              Showing page {page} of {totalPages} ({contactsCount} total contacts)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--hover-bg)] transition-all cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--hover-bg)] transition-all cursor-pointer disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
        callerName={selectedCallerName}
      />
    </div>
  )
}
