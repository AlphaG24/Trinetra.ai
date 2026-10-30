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
import { toast } from 'sonner'

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
  const [mounted, setMounted] = useState(false)
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

  useEffect(() => {
    setMounted(true)
  }, [])

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
    } catch {
      toast.error('Network error loading tenant voice agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mounted) {
      fetchTenantAgents()
    }
  }, [mounted])

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
    } catch {
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

  // SSR Skeleton to guarantee 0 hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-6 font-[family-name:var(--font-montserrat)] text-left animate-pulse" suppressHydrationWarning>
        <div className="pb-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-80 bg-[var(--card-bg)] rounded-xl mb-2" />
            <div className="h-4 w-96 bg-[var(--card-bg)] rounded-xl" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-36 bg-[var(--card-bg)] rounded-xl" />
            <div className="h-10 w-28 bg-[var(--card-bg)] rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
          ))}
        </div>
        <div className="h-12 bg-[var(--card-bg)] rounded-xl border border-[var(--border)]" />
        <div className="h-96 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 font-[family-name:var(--font-montserrat)] text-left" suppressHydrationWarning>
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-500 shadow-2xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-playfair text-[var(--heading)] flex items-center gap-2">
              Tenant Voice Agent Provisioning Hub
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1 font-merriweather">
              Inspect customer knowledge bases, copy compiled Sarvam prompts, and link live Indian phone numbers to tenants.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a 
            href="https://apps.sarvam.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--secondary)] text-[var(--heading)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
          >
            <span>Open Sarvam Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)]" />
          </a>

          <button
            type="button"
            suppressHydrationWarning
            onClick={fetchTenantAgents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-violet-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Total Tenants</span>
          <div className="text-2xl font-black font-heading text-[var(--heading)] mt-1">{totalTenants}</div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Total Voice Agents</span>
          <div className="text-2xl font-black font-heading text-[var(--heading)] mt-1">{totalAgents}</div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Linked to Sarvam</span>
          <div className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400 mt-1">{linkedAgents}</div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Needs Sarvam App ID</span>
          <div className="text-2xl font-black font-heading text-amber-600 dark:text-amber-400 mt-1">{unlinkedAgents}</div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Knowledge Docs</span>
          <div className="text-2xl font-black font-heading text-violet-600 dark:text-violet-400 mt-1">{totalKbDocs}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
          <input
            type="text"
            suppressHydrationWarning
            placeholder="Search tenant, company, agent or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition-colors font-merriweather shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'all' 
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20' 
                : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)]'
            }`}
          >
            All Tenants ({tenants.length})
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setFilter('unlinked')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'unlinked' 
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20' 
                : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)]'
            }`}
          >
            Unlinked ({unlinkedAgents})
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setFilter('linked')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'linked' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)]'
            }`}
          >
            Linked ({linkedAgents})
          </button>
        </div>
      </div>

      {/* Tenants & Agents Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
            <p className="text-[var(--muted)] text-xs font-merriweather">Loading tenant configurations and knowledge bases...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Bot className="w-12 h-12 text-[var(--muted)] mx-auto opacity-40" />
            <p className="text-[var(--heading)] font-playfair font-bold text-sm">No tenant voice agents found</p>
            <p className="text-[var(--muted)] text-xs font-merriweather">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/40 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Tenant & Company</th>
                  <th className="py-3.5 px-4 font-semibold">Agent Name</th>
                  <th className="py-3.5 px-4 font-semibold">Assigned Phone</th>
                  <th className="py-3.5 px-4 font-semibold">Sarvam App ID</th>
                  <th className="py-3.5 px-4 font-semibold">Knowledge Base</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Fulfillment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredTenants.map((tenant) => {
                  if (tenant.agents.length === 0) {
                    return (
                      <tr key={tenant.id} className="hover:bg-[var(--secondary)]/20 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-[var(--heading)]">{tenant.company_name || tenant.name}</div>
                          <div className="text-[11px] text-[var(--muted)] font-merriweather">{tenant.primary_email}</div>
                        </td>
                        <td colSpan={4} className="py-4 px-4 text-[var(--muted)] italic text-xs">
                          No agent created in dashboard yet
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-[11px] font-medium text-[var(--muted)] bg-[var(--secondary)] px-2.5 py-1 rounded-md border border-[var(--border)]">
                            Pending Client Setup
                          </span>
                        </td>
                      </tr>
                    )
                  }

                  return tenant.agents.map((agent) => {
                    const isLinked = Boolean(agent.sarvam_agent_id)
                    const activePhone = agent.phone_number || tenant.phone_numbers[0]?.phone_number || 'None'
                    const kbCount = agent.knowledge_docs.length

                    return (
                      <tr key={agent.id} className="hover:bg-[var(--secondary)]/20 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-[var(--heading)] flex items-center gap-2">
                            <span>{tenant.company_name || tenant.name}</span>
                            {tenant.business_type && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-medium">
                                {tenant.business_type}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] font-merriweather">{tenant.primary_email}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-[var(--heading)]">{agent.name}</div>
                          <div className="text-[11px] text-[var(--muted)] font-mono capitalize">
                            Voice: {agent.voice_id || 'shubh'} ({agent.language || 'hi'})
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {activePhone !== 'None' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold">
                              <Phone className="w-3 h-3" />
                              <span>{activePhone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 font-medium">
                              No Phone Attached
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {isLinked ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-xs font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{agent.sarvam_agent_id}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              <span>Unlinked in Sarvam</span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${
                              kbCount > 0 
                                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' 
                                : 'bg-[var(--secondary)] text-[var(--muted)] border-[var(--border)]'
                            }`}>
                              {kbCount} file{kbCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            type="button"
                            suppressHydrationWarning
                            onClick={() => openInspectModal(tenant, agent)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--secondary)] border border-[var(--border)] text-xs font-bold text-[var(--heading)] transition-colors cursor-pointer shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-violet-500" />
                            <span>Inspect & Copy Prompt</span>
                          </button>

                          <button
                            type="button"
                            suppressHydrationWarning
                            onClick={() => openLinkModal(tenant, agent)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                              isLinked 
                                ? 'bg-[var(--card-bg)] hover:bg-[var(--secondary)] text-[var(--heading)] border border-[var(--border)]' 
                                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[var(--heading)]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-playfair flex items-center gap-2">
                  <span>{selectedTenant.company_name || selectedTenant.name}</span>
                  <span className="text-[var(--muted)] font-normal">/</span>
                  <span className="text-violet-500">{selectedAgent.name}</span>
                </h2>
                <p className="text-xs text-[var(--muted)] font-merriweather mt-0.5">
                  Compiled configuration, business details, and verified knowledge base text for Sarvam.
                </p>
              </div>

              <button 
                type="button"
                suppressHydrationWarning
                onClick={() => setIsInspectOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--secondary)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-merriweather">
              {/* Business Summary */}
              <div className="p-3.5 rounded-xl bg-[var(--secondary)]/40 border border-[var(--border)] space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 font-montserrat">
                  Tenant Business Profile
                </div>
                <div className="text-[var(--heading)] font-bold text-sm">
                  {selectedTenant.company_name || selectedTenant.name} ({selectedTenant.business_type || 'General'})
                </div>
                <div className="text-xs text-[var(--muted)] whitespace-pre-line leading-relaxed">
                  {selectedTenant.business_description || 'No description provided by client.'}
                </div>
              </div>

              {/* Greeting */}
              <div className="p-3.5 rounded-xl bg-[var(--secondary)]/40 border border-[var(--border)] space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 font-montserrat">
                  Custom Greeting
                </div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-[var(--card-bg)] p-2.5 rounded-lg border border-emerald-500/20">
                  {selectedAgent.greeting_message || `Hello, main ${selectedAgent.name} bol raha hoon ${selectedTenant.company_name || selectedTenant.name} se.`}
                </div>
              </div>

              {/* Knowledge Base Uploads */}
              <div className="p-3.5 rounded-xl bg-[var(--secondary)]/40 border border-[var(--border)] space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 font-montserrat flex items-center justify-between">
                  <span>Client Knowledge Base Files ({selectedAgent.knowledge_docs.length})</span>
                  <span className="text-[10px] text-[var(--muted)] font-normal">Extracted & appended to prompt</span>
                </div>

                {selectedAgent.knowledge_docs.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] italic">Client has not uploaded any documents yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAgent.knowledge_docs.map((doc, idx) => (
                      <div key={doc.id} className="p-2.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-[var(--heading)]">
                          <span>{idx + 1}. {doc.name}</span>
                          <span className="text-[10px] text-[var(--muted)] font-normal">{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-[var(--muted)] font-mono line-clamp-3 bg-[var(--secondary)]/50 p-2 rounded border border-[var(--border)]">
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
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 font-montserrat">
                    Full Compiled Sarvam System Prompt
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">Ready to copy & paste into Sarvam Console</span>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={compileSarvamPrompt(selectedTenant, selectedAgent)}
                  className="w-full p-3 rounded-xl bg-[var(--secondary)]/30 border border-[var(--border)] text-xs font-mono text-[var(--heading)] focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--secondary)]/30">
              <div className="text-xs text-[var(--muted)] flex items-center gap-1.5 font-merriweather">
                <Info className="w-4 h-4 text-violet-500 shrink-0" />
                <span>Copy this prompt and paste it into the Sarvam App Prompt editor.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setIsInspectOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--secondary)] border border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--heading)] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleCopyPrompt(selectedTenant, selectedAgent)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-md shadow-emerald-600/20"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden space-y-5 p-6 text-[var(--heading)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="text-base font-bold font-playfair flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-violet-500" />
                  <span>Link Sarvam Voice Agent</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5 font-merriweather">
                  Tenant: <strong className="text-[var(--heading)]">{linkingTenant.company_name || linkingTenant.name}</strong>
                </p>
              </div>

              <button 
                type="button"
                suppressHydrationWarning
                onClick={() => setIsLinkOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--secondary)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-merriweather">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-600 dark:text-violet-400 leading-relaxed font-sans">
                <strong>Step 1:</strong> Open <a href="https://apps.sarvam.ai" target="_blank" rel="noopener noreferrer" className="underline font-bold text-violet-600 dark:text-violet-300">apps.sarvam.ai</a> and create the App for <strong>{linkingTenant.company_name || linkingTenant.name}</strong>.<br />
                <strong>Step 2:</strong> Paste the resulting Sarvam App ID below.
              </div>

              {/* Sarvam App ID Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--heading)] font-montserrat">
                  Sarvam App ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  suppressHydrationWarning
                  placeholder="e.g. Purvi-Roadlines-14e3b2eb"
                  value={sarvamAppIdInput}
                  onChange={(e) => setSarvamAppIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--heading)] placeholder-[var(--muted)] text-xs font-mono focus:outline-none focus:border-violet-500 shadow-2xs"
                />
              </div>

              {/* Phone Number Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--heading)] font-montserrat">
                  Assigned Phone Number (Inbound & Outbound Caller ID)
                </label>
                <select
                  suppressHydrationWarning
                  value={selectedPhoneNumber}
                  onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--heading)] text-xs font-mono focus:outline-none focus:border-violet-500 shadow-2xs"
                >
                  <option value="">-- Select Phone Number --</option>
                  {linkingTenant.phone_numbers.map(p => (
                    <option key={p.id} value={p.phone_number}>
                      {p.phone_number} ({p.provider || 'sarvam'})
                    </option>
                  ))}
                  {linkingAgent.phone_number && !linkingTenant.phone_numbers.some(p => p.phone_number === linkingAgent.phone_number) && (
                    <option value={linkingAgent.phone_number}>{linkingAgent.phone_number} (Current)</option>
                  )}
                </select>
                <p className="text-[11px] text-[var(--muted)]">
                  This number will be bound to this agent in Trinetra and used as the outgoing Caller ID.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-3">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setIsLinkOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--secondary)] border border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--heading)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleSaveLink}
                disabled={submittingLink}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg shadow-violet-600/20 disabled:opacity-50"
              >
                {submittingLink ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{submittingLink ? 'Linking...' : 'Save & Link to Tenant'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
