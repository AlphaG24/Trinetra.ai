'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Phone, Globe, Shield, Send, CheckCircle2, AlertTriangle, XCircle, Clock, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface RequestData {
  id: string
  request_type: 'set_homepage_agent' | 'bypass_limits' | 'custom_voice_activation'
  request_data: any
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
}

interface Agent {
  id: string
  name: string
}

export default function RequestsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requestType, setRequestType] = useState<'set_homepage_agent' | 'bypass_limits' | 'custom_voice_activation'>('set_homepage_agent')
  
  // Form fields
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [limitType, setLimitType] = useState<'agents' | 'phone_numbers'>('agents')
  const [limitValue, setLimitValue] = useState(1)
  const [justification, setJustification] = useState('')

  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR('/api/developer/requests', fetcher)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Fetch role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .single()

          if (profile) {
            setUserRole(profile.role)

            // Fetch agents for dropdown
            const { data: userAgents } = await supabase
              .from('agents')
              .select('id, name')
              .eq('organization_id', profile.organization_id)
              .neq('status', 'deleted')
            
            if (userAgents) {
              setAgents(userAgents)
              if (userAgents.length > 0) {
                setSelectedAgentId(userAgents[0].id)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading request data:', err)
      }
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let requestPayloadData: any = {}

    if (requestType === 'set_homepage_agent') {
      const agent = agents.find(a => a.id === selectedAgentId)
      requestPayloadData = {
        agent_id: selectedAgentId,
        agent_name: agent ? agent.name : 'Unknown Agent'
      }
    } else if (requestType === 'bypass_limits') {
      requestPayloadData = {
        limit_type: limitType,
        value: limitValue
      }
    } else if (requestType === 'custom_voice_activation') {
      requestPayloadData = {
        justification
      }
    }

    try {
      const response = await fetch('/api/developer/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: requestType,
          request_data: requestPayloadData
        })
      })

      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to submit request.')
      }

      toast.success('Request submitted for approval!')
      setIsModalOpen(false)
      // Clear form
      setJustification('')
      setLimitValue(1)
      mutate()
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending
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
      return `Designate "${payload.agent_name || 'Agent'}" as homepage demo voice.`
    }
    if (type === 'bypass_limits') {
      return `Request +${payload.value || 1} extra slots for "${payload.limit_type || 'agents'}".`
    }
    if (type === 'custom_voice_activation') {
      return `Justification: "${payload.justification || 'No description'}"`
    }
    return JSON.stringify(payload)
  }

  const requestsList: RequestData[] = data?.data || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-500 animate-pulse" /> Marketing Portal & Controls
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-xl">
            Submit and track compliance requests for homepage demo configurations, objection prompts, and telephony resource expansion.
          </p>
        </div>

        {userRole === 'developer_tester' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-750 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-violet-500/10"
          >
            <Plus className="w-4 h-4" /> New Compliance Request
          </button>
        )}
      </div>

      {/* Requests List */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Submitted Requests
          </h3>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <span className="text-xs text-zinc-400">Loading requests...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400">
            Failed to load requests. Please try again.
          </div>
        ) : requestsList.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-3">
            <Shield className="w-10 h-10 text-zinc-600/40" />
            No marketing compliance requests submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-zinc-400 bg-black/10">
                  <th className="p-4 font-bold uppercase tracking-wider">Date</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Request Type</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Target Details</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Admin Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {requestsList.map((req) => (
                  <tr key={req.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4 text-zinc-400 font-medium">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-white font-bold">
                      {getRequestTypeLabel(req.request_type)}
                    </td>
                    <td className="p-4 text-zinc-300 font-sans max-w-sm truncate">
                      {getRequestSummary(req.request_type, req.request_data)}
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="p-4 text-zinc-400 leading-relaxed max-w-xs font-sans">
                      {req.admin_notes || <span className="text-zinc-600 italic">No notes</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- SUBMISSION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0C0118]/95 border border-white/10 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl text-left">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>

            {/* Header */}
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Submit Compliance Request
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Obtain a double-authorization ticket to deploy homepage modifications or override platform restrictions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Request Area
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-[#130224] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer appearance-none"
                >
                  <option value="set_homepage_agent">Homepage Agent Designation</option>
                  <option value="bypass_limits">Override Resource Quota Limits</option>
                  <option value="custom_voice_activation">Premium Custom Voice Activation</option>
                </select>
              </div>

              {/* Conditional Inputs */}
              {requestType === 'set_homepage_agent' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Designate Custom Agent
                  </label>
                  {agents.length === 0 ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium">
                      You haven&apos;t created any agents in your workspace yet. Please create an agent first.
                    </div>
                  ) : (
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#130224] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {requestType === 'bypass_limits' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Limit Metric
                    </label>
                    <select
                      value={limitType}
                      onChange={(e) => setLimitType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-[#130224] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                    >
                      <option value="agents">Agent slots</option>
                      <option value="phone_numbers">Phone number slots</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Amount Requested
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={limitValue}
                      onChange={(e) => setLimitValue(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
              )}

              {requestType === 'custom_voice_activation' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Justification
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Provide a business case (e.g. require ElevenLabs Rachel model integration for a US-UK real estate demo)."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none font-sans"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (requestType === 'set_homepage_agent' && agents.length === 0)}
                className="w-full mt-2 py-3 bg-violet-600 hover:bg-violet-750 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-lg shadow-violet-500/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
