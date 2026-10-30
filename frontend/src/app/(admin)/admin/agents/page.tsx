'use client'

import { useState, useEffect } from 'react'
import { 
  Bot, 
  Building2, 
  Phone, 
  FileText, 
  Copy, 
  Check, 
  Search, 
  RefreshCw, 
  Sparkles, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Link2,
  X,
  PhoneCall,
  Info,
  Save
} from 'lucide-react'
import toast from 'react-hot-toast'

interface KnowledgeDoc {
  id: string
  name: string
  content_excerpt: string
  status: string
  created_at: string
}

interface Agent {
  id: string
  name: string
  phone_number: string | null
  sarvam_agent_id: string | null
  greeting_message: string | null
  voice_id: string | null
  language: string | null
  system_prompt: string | null
  status: string | null
  knowledge_docs: KnowledgeDoc[]
}

interface PhoneNumber {
  id: string
  phone_number: string
  assigned_agent_id: string | null
  provider: string | null
  status: string | null
}

interface Tenant {
  id: string
  name: string
  legal_name: string | null
  primary_email: string | null
  company_name: string | null
  business_type: string | null
  business_description: string | null
  user_name: string | null
  user_id: string | null
  created_at: string
  agents: Agent[]
  phone_numbers: PhoneNumber[]
}

export default function TenantVoiceAgentsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all')

  // Inspection Modal State
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isInspectOpen, setIsInspectOpen] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  // Linking Dialog State
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [linkingTenant, setLinkingTenant] = useState<Tenant | null>(null)
  const [linkingAgent, setLinkingAgent] = useState<Agent | null>(null)
  const [sarvamAppIdInput, setSarvamAppIdInput] = useState('')
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('')
  const [submittingLink, setSubmittingLink] = useState(false)

  const fetchTenantAgents = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/tenant-agents')
      const json = await res.json()
      if (json.success && json.tenants) {
        setTenants(json.tenants)
      } else {
        toast.error(json.error || 'Failed to load tenant agents')
      }
    } catch (err: any) {
      toast.error('Network error loading tenant voice agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenantAgents()
  }, [])

  // Compile full prompt and knowledge base formatted for Sarvam Console
  const compileSarvamPrompt = (tenant: Tenant, agent: Agent): string => {
    const compName = tenant.company_name || tenant.name || 'Our Company'
    const bizType = tenant.business_type || 'Business Services'
    const bizDesc = tenant.business_description || ''
    const greeting = agent.greeting_message || `Hello, main ${agent.name} bol raha hoon ${compName} se.`
    const prompt = agent.system_prompt || ''

    let kbSection = ''
    if (agent.knowledge_docs && agent.knowledge_docs.length > 0) {
      const docSnippets = agent.knowledge_docs.map((doc, idx) => {
        return `--- Document ${idx + 1}: ${doc.name} ---\n${doc.content_excerpt || '(Uploaded business document content)'}`
      })
      kbSection = `\n\n=== VERIFIED BUSINESS KNOWLEDGE BASE ===\n${docSnippets.join('\n\n')}\n========================================\n`
    }

    return `You are ${agent.name}, an AI assistant for ${compName}.

## BUSINESS CONTEXT
- Company Name: ${compName}
- Industry / Type: ${bizType}
- Description: ${bizDesc || 'Professional enterprise services.'}

## OPENING GREETING
${greeting}

## OPERATIONAL INSTRUCTIONS & PERSONA
${prompt}
${kbSection}
## COMPLIANCE MANDATE (SEC-011)
- Always identify yourself as an AI assistant for ${compName}.
- Always disclose that calls may be recorded for quality and service.`
  }

  const handleCopyPrompt = (tenant: Tenant, agent: Agent) => {
    const text = compileSarvamPrompt(tenant, agent)
    navigator.clipboard.writeText(text)
    setCopiedPrompt(true)
    toast.success('Complete prompt & knowledge base copied to clipboard!')
    setTimeout(() => setCopiedPrompt(false), 3000)
  }

  const openInspectModal = (tenant: Tenant, agent: Agent) => {
    setSelectedTenant(tenant)
    setSelectedAgent(agent)
    setIsInspectOpen(true)
  }

  const openLinkModal = (tenant: Tenant, agent: Agent) => {
    setLinkingTenant(tenant)
    setLinkingAgent(agent)
    setSarvamAppIdInput(agent.sarvam_agent_id || '')
    // Default to agent's current phone number or first available tenant number
    setSelectedPhoneNumber(agent.phone_number || tenant.phone_numbers[0]?.phone_number || '')
    setIsLinkOpen(true)
  }

  const handleSaveLink = async () => {
    if (!linkingTenant || !linkingAgent) return
    if (!sarvamAppIdInput.trim()) {
      toast.error('Please enter the Sarvam App ID created in your Sarvam console')
      return
    }

    try {
      setSubmittingLink(true)
      const res = await fetch('/api/admin/tenant-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: linkingAgent.id,
          sarvam_agent_id: sarvamAppIdInput.trim(),
          phone_number: selectedPhoneNumber.trim(),
          organization_id: linkingTenant.id,
          agent_name: linkingAgent.name
        })
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Agent successfully linked and provisioned!')
        setIsLinkOpen(false)
        fetchTenantAgents()
      } else {
        toast.error(json.error || 'Failed to link Sarvam agent')
      }
    } catch (err: any) {
      toast.error('Network error updating Sarvam agent link')
    } finally {
      setSubmittingLink(false)
    }
  }

  // Filter tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.company_name && t.company_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.primary_email && t.primary_email.toLowerCase().includes(search.toLowerCase())) ||
      t.agents.some(a => a.name.toLowerCase().includes(search.toLowerCase()) || (a.phone_number && a.phone_number.includes(search)))

    if (!matchesSearch) return false

    if (filter === 'linked') {
      return t.agents.some(a => Boolean(a.sarvam_agent_id))
    }
    if (filter === 'unlinked') {
      return t.agents.some(a => !a.sarvam_agent_id) || t.agents.length === 0
    }
    return true
  })

  // KPI calculations
  const totalTenants = tenants.length
  const totalAgents = tenants.reduce((acc, t) => acc + t.agents.length, 0)
  const linkedAgents = tenants.reduce((acc, t) => acc + t.agents.filter(a => Boolean(a.sarvam_agent_id)).length, 0)
  const unlinkedAgents = totalAgents - linkedAgents
  const totalKbDocs = tenants.reduce((acc, t) => acc + t.agents.reduce((kAcc, a) => kAcc + a.knowledge_docs.length, 0), 0)

  return (
    <div className="min-h-screen bg-[#080010] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Tenant Voice Agent Provisioning Hub</h1>
              <p className="text-sm text-gray-400">
                Inspect customer knowledge bases, copy compiled Sarvam prompts, and link live Indian phone numbers to tenants.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a 
            href="https://apps.sarvam.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <span>Open Sarvam Console</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>

          <button
            onClick={fetchTenantAgents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Tenants</span>
          <div className="text-2xl font-bold text-white mt-1">{totalTenants}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Voice Agents</span>
          <div className="text-2xl font-bold text-white mt-1">{totalAgents}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Linked to Sarvam</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{linkedAgents}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Needs Sarvam App ID</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{unlinkedAgents}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">Knowledge Documents</span>
          <div className="text-2xl font-bold text-purple-300 mt-1">{totalKbDocs}</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenant, company, agent or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            All Tenants ({tenants.length})
          </button>
          <button
            onClick={() => setFilter('unlinked')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'unlinked' ? 'bg-amber-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Unlinked ({unlinkedAgents})
          </button>
          <button
            onClick={() => setFilter('linked')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'linked' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Linked ({linkedAgents})
          </button>
        </div>
      </div>

      {/* Tenants & Agents Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
            <p className="text-gray-400 text-sm">Loading tenant configurations and knowledge bases...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Bot className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-gray-300 font-medium">No tenant voice agents found</p>
            <p className="text-gray-500 text-xs">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Tenant & Company</th>
                  <th className="py-3.5 px-4 font-semibold">Agent Name</th>
                  <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                  <th className="py-3.5 px-4 font-semibold">Sarvam App ID</th>
                  <th className="py-3.5 px-4 font-semibold">Knowledge Base</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Fulfillment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTenants.map((tenant) => {
                  if (tenant.agents.length === 0) {
                    return (
                      <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{tenant.company_name || tenant.name}</div>
                          <div className="text-xs text-gray-500">{tenant.primary_email}</div>
                        </td>
                        <td colSpan={4} className="py-4 px-4 text-gray-500 italic text-xs">
                          No agent created in dashboard yet
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-xs text-gray-500 bg-white/5 px-2.5 py-1 rounded-md">
                            Pending Client Setup
                          </span>
                        </td>
                      </tr>
                    )
                  }

                  return tenant.agents.map((agent, aIdx) => {
                    const isLinked = Boolean(agent.sarvam_agent_id)
                    const activePhone = agent.phone_number || tenant.phone_numbers[0]?.phone_number || 'None'
                    const kbCount = agent.knowledge_docs.length

                    return (
                      <tr key={agent.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-medium text-white flex items-center gap-2">
                            <span>{tenant.company_name || tenant.name}</span>
                            {tenant.business_type && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {tenant.business_type}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{tenant.primary_email}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-200">{agent.name}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            Voice: {agent.voice_id || 'shubh'} ({agent.language || 'hi'})
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {activePhone !== 'None' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs">
                              <Phone className="w-3 h-3" />
                              <span>{activePhone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                              No Phone Attached
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {isLinked ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{agent.sarvam_agent_id}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              <span>Unlinked in Sarvam</span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-md border ${
                              kbCount > 0 
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                                : 'bg-white/5 text-gray-400 border-white/10'
                            }`}>
                              {kbCount} file{kbCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => openInspectModal(tenant, agent)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-200 hover:text-white transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-400" />
                            <span>Inspect & Copy Prompt</span>
                          </button>

                          <button
                            onClick={() => openLinkModal(tenant, agent)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isLinked 
                                ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10' 
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                            }`}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>{isLinked ? 'Change App ID' : 'Link Sarvam App'}</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT KNOWLEDGE & PROMPT MODAL */}
      {isInspectOpen && selectedTenant && selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f041c] border border-white/15 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedTenant.company_name || selectedTenant.name}</span>
                  <span className="text-gray-400 font-normal">/</span>
                  <span className="text-purple-400">{selectedAgent.name}</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Compiled configuration, business details, and verified knowledge base text for Sarvam.
                </p>
              </div>

              <button 
                onClick={() => setIsInspectOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-sm">
              {/* Business Summary */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="text-xs font-semibold uppercase text-purple-400 tracking-wider">Tenant Business Profile</div>
                <div className="text-white font-medium">{selectedTenant.company_name || selectedTenant.name} ({selectedTenant.business_type || 'General'})</div>
                <div className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                  {selectedTenant.business_description || 'No description provided by client.'}
                </div>
              </div>

              {/* Greeting */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="text-xs font-semibold uppercase text-purple-400 tracking-wider">Custom Greeting</div>
                <div className="text-xs font-mono text-emerald-300 bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                  {selectedAgent.greeting_message || `Hello, main ${selectedAgent.name} bol raha hoon ${selectedTenant.company_name || selectedTenant.name} se.`}
                </div>
              </div>

              {/* Knowledge Base Uploads */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="text-xs font-semibold uppercase text-purple-400 tracking-wider flex items-center justify-between">
                  <span>Client Knowledge Base Files ({selectedAgent.knowledge_docs.length})</span>
                  <span className="text-[10px] text-gray-400">Extracted & appended to prompt</span>
                </div>

                {selectedAgent.knowledge_docs.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Client has not uploaded any documents yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAgent.knowledge_docs.map((doc, idx) => (
                      <div key={doc.id} className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium text-purple-300">
                          <span>{idx + 1}. {doc.name}</span>
                          <span className="text-[10px] text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono line-clamp-3 bg-white/[0.02] p-1.5 rounded">
                          {doc.content_excerpt || 'No excerpt available'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Compiled Prompt Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-purple-400 tracking-wider">
                    Full Compiled Sarvam System Prompt
                  </span>
                  <span className="text-xs text-gray-500">Ready to copy & paste into Sarvam Console</span>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={compileSarvamPrompt(selectedTenant, selectedAgent)}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/30">
              <div className="text-xs text-gray-400 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-purple-400" />
                <span>Copy this prompt and paste it into the Sarvam App Prompt editor.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsInspectOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleCopyPrompt(selectedTenant, selectedAgent)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                >
                  {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPrompt ? 'Copied to Clipboard!' : 'Copy for Sarvam Console'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LINK SARVAM AGENT DIALOG */}
      {isLinkOpen && linkingTenant && linkingAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f041c] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-purple-400" />
                  <span>Link Sarvam Voice Agent</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tenant: <strong className="text-white">{linkingTenant.company_name || linkingTenant.name}</strong>
                </p>
              </div>

              <button 
                onClick={() => setIsLinkOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
                Step 1: Open <a href="https://apps.sarvam.ai" target="_blank" rel="noopener noreferrer" className="underline font-bold text-white">apps.sarvam.ai</a> and create the App for <strong>{linkingTenant.company_name || linkingTenant.name}</strong>.<br />
                Step 2: Paste the resulting Sarvam App ID below.
              </div>

              {/* Sarvam App ID Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Sarvam App ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purvi-Roadlines-14e3b2eb"
                  value={sarvamAppIdInput}
                  onChange={(e) => setSarvamAppIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Phone Number Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Assigned Phone Number (Inbound & Outbound Caller ID)
                </label>
                <select
                  value={selectedPhoneNumber}
                  onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select Phone Number --</option>
                  {linkingTenant.phone_numbers.map(p => (
                    <option key={p.id} value={p.phone_number}>
                      {p.phone_number} ({p.provider || 'sarvam'})
                    </option>
                  ))}
                  {/* Allow entering or keeping existing agent number */}
                  {linkingAgent.phone_number && !linkingTenant.phone_numbers.some(p => p.phone_number === linkingAgent.phone_number) && (
                    <option value={linkingAgent.phone_number}>{linkingAgent.phone_number} (Current)</option>
                  )}
                </select>
                <p className="text-[11px] text-gray-500">
                  This number will be bound to this agent in Trinetra and used as the outgoing Caller ID.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLinkOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLink}
                disabled={submittingLink}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors disabled:opacity-50"
              >
                {submittingLink ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{submittingLink ? 'Linking...' : 'Save & Link to Tenant'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
