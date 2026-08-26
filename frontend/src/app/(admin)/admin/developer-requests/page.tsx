'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare,
  Globe,
  Settings,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface DeveloperRequest {
  id: string
  developer_id: string
  request_type: 'set_homepage_agent' | 'bypass_limits' | 'custom_voice_activation'
  request_data: any
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
  developer_email?: string
}

export default function AdminDeveloperRequestsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/developer/requests', fetcher)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  const handleResolve = async (requestId: string, status: 'approved' | 'rejected') => {
    setResolvingId(requestId)
    try {
      const response = await fetch('/api/admin/developer-requests/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status,
          adminNotes: notesInput
        })
      })

      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to resolve request.')
      }

      toast.success(`Request successfully ${status === 'approved' ? 'approved' : 'rejected'}!`)
      setNotesInput('')
      mutate()
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setResolvingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider animate-pulse">
            Pending
          </span>
        )
    }
  }

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'set_homepage_agent':
        return 'Homepage Agent Designation'
      case 'bypass_limits':
        return 'Quota Limit Expansion'
      case 'custom_voice_activation':
        return 'Custom Voice Activation'
      default:
        return type
    }
  }

  const getRequestSummary = (type: string, payload: any) => {
    if (type === 'set_homepage_agent') {
      return `Assign agent "${payload.agent_name || 'Agent'}" to homepage button.`
    }
    if (type === 'bypass_limits') {
      return `Add +${payload.value || 1} extra slots for "${payload.limit_type || 'agents'}".`
    }
    if (type === 'custom_voice_activation') {
      return `Justification: "${payload.justification || 'No description'}"`
    }
    return JSON.stringify(payload)
  }

  const requests: DeveloperRequest[] = data?.data || []

  // Filter requests
  const filteredRequests = requests.filter(req => {
    // Tab filter
    if (activeTab === 'pending' && req.status !== 'pending') return false
    if (activeTab === 'resolved' && req.status === 'pending') return false
    
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const typeMatch = getRequestTypeLabel(req.request_type).toLowerCase().includes(q)
      const summaryMatch = getRequestSummary(req.request_type, req.request_data).toLowerCase().includes(q)
      return typeMatch || summaryMatch
    }
    return true
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-zinc-100 selection:bg-violet-500/30">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2 uppercase">
          <ShieldCheck className="w-6 h-6 text-violet-500" /> Developer & Marketing Requests
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed font-sans max-w-xl">
          Approve or reject developer compliance tickets to update homepage demo lines or override account resource limits.
        </p>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800/60">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-zinc-900 text-white border border-zinc-850'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pending Requests
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'resolved'
                ? 'bg-zinc-900 text-white border border-zinc-850'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-zinc-900 text-white border border-zinc-850'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Tickets
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Main List */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <span className="text-xs text-zinc-500">Loading compliance tickets...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400">
            Failed to load compliance requests. Please try again.
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-3">
            <ShieldCheck className="w-12 h-12 text-zinc-800" />
            No developer requests match this filter.
          </div>
        ) : (
          <div className="divide-y divide-zinc-850">
            {filteredRequests.map((req) => (
              <div key={req.id} className="p-6 hover:bg-white/1 transition-colors space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-white">
                        {getRequestTypeLabel(req.request_type)}
                      </span>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      {getRequestSummary(req.request_type, req.request_data)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
                    <User className="w-3.5 h-3.5" />
                    <span>Developer ID: {req.developer_id.substring(0, 8)}...</span>
                  </div>
                </div>

                {/* Admin notes input (Only for pending requests) */}
                {req.status === 'pending' ? (
                  <div className="space-y-3 pt-2">
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        type="text"
                        value={resolvingId === req.id ? notesInput : ''}
                        onChange={(e) => {
                          setResolvingId(req.id)
                          setNotesInput(e.target.value)
                        }}
                        placeholder="Add admin feedback notes or reason for approval/rejection..."
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleResolve(req.id, 'approved')}
                        disabled={resolvingId !== null && resolvingId !== req.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-500/5"
                      >
                        Approve Request
                      </button>
                      <button
                        onClick={() => handleResolve(req.id, 'rejected')}
                        disabled={resolvingId !== null && resolvingId !== req.id}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-md shadow-rose-500/5"
                      >
                        Reject Request
                      </button>
                    </div>
                  </div>
                ) : (
                  req.admin_notes && (
                    <div className="p-3 bg-zinc-900 border border-zinc-850/50 rounded-xl text-xs leading-relaxed text-zinc-400 font-sans">
                      <strong className="text-zinc-300">Admin Remarks:</strong> {req.admin_notes}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
