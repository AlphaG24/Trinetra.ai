'use client'

import { useState, useEffect } from 'react'
import { 
  Send, MessageCircle, Calendar, Database, 
  Cloud, Mail, Webhook, Link as LinkIcon, Puzzle,
  CheckCircle2, XCircle, Loader2, Bot, ArrowRight, Zap, 
  X, ChevronRight, ChevronLeft, HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'

// Map icon string to Lucide icon component
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Send,
  MessageCircle,
  Calendar,
  Database,
  Cloud,
  Mail,
  Webhook,
  Link: LinkIcon,
  Puzzle
}

interface Agent {
  id: string
  name: string
  agent_type: string
  is_active: boolean
}

interface IntegrationType {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  category: string
  setup_steps: Array<{ title: string; description: string }>
  required_fields: string[]
  is_active: boolean
  docs_url?: string
}

interface AgentIntegration {
  id: string
  agent_id: string
  organization_id: string
  integration_type_id: string
  config: Record<string, any>
  is_connected: boolean
  status: string
  connected_at?: string
  integration_types?: IntegrationType
}

interface IntegrationsPageClientProps {
  agents: Agent[]
  userId: string
}

export default function IntegrationsPageClient({ agents: initialAgents }: IntegrationsPageClientProps) {
  const [agents] = useState<Agent[]>(initialAgents)
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '')
  
  const [integrationTypes, setIntegrationTypes] = useState<IntegrationType[]>([])
  const [agentIntegrations, setAgentIntegrations] = useState<AgentIntegration[]>([])
  
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<IntegrationType | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [formConfig, setFormConfig] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch integration types and configured agent integrations
  const fetchData = async () => {
    if (!selectedAgentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // 1. Fetch Types
      const typesRes = await fetch('/api/integrations/types')
      const typesData = await typesRes.json()
      
      // 2. Fetch Agent's configured integrations
      const agentRes = await fetch(`/api/integrations/agent/${selectedAgentId}`)
      const agentData = await agentRes.json()
      
      if (typesRes.ok && typesData.success) {
        setIntegrationTypes(typesData.data || [])
      }
      if (agentRes.ok && agentData.success) {
        setAgentIntegrations(agentData.data || [])
      }
    } catch (err) {
      console.error('Failed to load integration data:', err)
      toast.error('Failed to load integration configurations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedAgentId])

  const handleOpenWizard = (type: IntegrationType) => {
    // Find if there is an existing configured integration
    const existing = agentIntegrations.find(ai => ai.integration_type_id === type.id)
    
    // Pre-populate fields
    const initialConfig: Record<string, string> = {}
    type.required_fields.forEach(field => {
      initialConfig[field] = existing?.config?.[field] || ''
    })
    
    setFormConfig(initialConfig)
    setActiveType(type)
    setActiveStep(0)
  }

  const handleFieldChange = (field: string, val: string) => {
    setFormConfig(prev => ({ ...prev, [field]: val }))
  }

  const handleTestConnection = async () => {
    if (!activeType) return
    setTesting(true)
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: activeType.slug,
          config: formConfig
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || 'Connection verified successfully!')
      } else {
        toast.error(data.error || 'Connection verification failed.')
      }
    } catch (err: any) {
      toast.error('Network error during connection test: ' + err.message)
    } finally {
      setTesting(false)
    }
  }

  const handleSaveConnection = async () => {
    if (!activeType || !selectedAgentId) return
    setSaving(true)
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: selectedAgentId,
          integration_type_id: activeType.id,
          config: formConfig
        })
      })
      
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`${activeType.name} connected successfully!`)
        setActiveType(null)
        fetchData() // reload configurations
      } else {
        toast.error(data.error || 'Failed to connect integration.')
      }
    } catch (err: any) {
      toast.error('Failed to save connection settings: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async (integrationId: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return
    try {
      const res = await fetch(`/api/integrations/${integrationId}/disconnect`, {
        method: 'POST'
      })
      if (res.ok) {
        toast.success(`${name} disconnected.`)
        fetchData()
      } else {
        toast.error('Failed to disconnect integration.')
      }
    } catch (err: any) {
      toast.error('Error disconnecting integration: ' + err.message)
    }
  }

  const categories = [
    { id: 'messaging', name: 'Messaging Platforms' },
    { id: 'crm', name: 'Customer Relationship Management (CRM)' },
    { id: 'calendar', name: 'Calendars & Booking' },
    { id: 'email', name: 'Email Services' },
    { id: 'other', name: 'Developer & Custom tools' }
  ]

  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 text-left text-zinc-900 dark:text-zinc-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-white/5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight font-display text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Puzzle className="w-6 h-6 text-violet-500" /> Integrations Hub
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure dynamic third-party integrations and notification triggers for your voice agents.
          </p>
        </div>

        {/* Agent Selector */}
        {agents.length > 0 && (
          <div className="flex items-center gap-2.5 bg-white dark:bg-[#12101A]/60 border border-zinc-200 dark:border-white/10 rounded-xl px-3.5 py-2 shadow-sm">
            <Bot className="w-4 h-4 text-violet-500" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Selected Agent:</span>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold focus:ring-0 focus:outline-none cursor-pointer pr-8"
            >
              {agents.map(a => (
                <option key={a.id} value={a.id} className="dark:bg-[#12101A]">{a.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-2">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading integrations panel...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-white/5 rounded-3xl p-16 text-center max-w-xl mx-auto space-y-4">
          <Bot className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Create an Agent first</h3>
          <p className="text-xs text-zinc-500">You need an active agent in your workspace to deploy integrations.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map(category => {
            const types = integrationTypes.filter(t => t.category === category.id)
            if (types.length === 0) return null

            return (
              <div key={category.id} className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                  {category.name}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {types.map(type => {
                    const existing = agentIntegrations.find(ai => ai.integration_type_id === type.id)
                    const isConnected = existing?.is_connected ?? false
                    const Icon = ICON_MAP[type.icon] || Puzzle

                    return (
                      <div
                        key={type.id}
                        className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              {isConnected ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Connected
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 px-2 py-0.5 rounded-full">
                                  Disconnected
                                </span>
                              )}
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-4">{type.name}</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                            {type.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 mt-5">
                          <button
                            onClick={() => handleOpenWizard(type)}
                            className="flex-1 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-xs font-semibold transition cursor-pointer text-center"
                          >
                            {isConnected ? 'Configure' : 'Connect'}
                          </button>
                          
                          {isConnected && existing && (
                            <button
                              onClick={() => handleDisconnect(existing.id, type.name)}
                              className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold transition cursor-pointer"
                              title="Disconnect"
                            >
                              Disconnect
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QUICK CONNECT WIZARD OVERLAY */}
      {activeType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-w-2xl w-full bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[550px]">
            
            {/* Left Steps bar */}
            <div className="w-full md:w-56 bg-zinc-50 dark:bg-[#080010] border-b md:border-b-0 md:border-r border-zinc-200 dark:border-white/5 p-6 flex flex-col justify-between shrink-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Connect Wizard</h3>
                  <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white mt-1">{activeType.name}</h4>
                </div>

                <div className="space-y-4">
                  {activeType.setup_steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                        activeStep === idx
                          ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                          : activeStep > idx
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                          : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-400'
                      }`}>
                        {activeStep > idx ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className={`text-xs font-bold truncate max-w-[120px] ${
                        activeStep === idx
                          ? 'text-zinc-900 dark:text-white font-extrabold'
                          : activeStep > idx
                          ? 'text-emerald-500'
                          : 'text-zinc-400'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                      activeStep === activeType.setup_steps.length
                        ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                        : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-400'
                    }`}>
                      {activeType.setup_steps.length + 1}
                    </div>
                    <span className={`text-xs font-bold ${
                      activeStep === activeType.setup_steps.length ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'
                    }`}>
                      Save Connection
                    </span>
                  </div>
                </div>
              </div>

              {activeType.docs_url && (
                <a
                  href={activeType.docs_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-violet-500 transition"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> View Documentation
                </a>
              )}
            </div>

            {/* Right Form pane */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
              
              {/* Modal Close */}
              <button 
                onClick={() => setActiveType(null)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-6">
                {/* Steps Content */}
                {activeStep < activeType.setup_steps.length ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                      Step {activeStep + 1} of {activeType.setup_steps.length}
                    </span>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {activeType.setup_steps[activeStep].title}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {activeType.setup_steps[activeStep].description}
                    </p>

                    {/* Show form input directly if it corresponds to the current step or we're on step 2 */}
                    {activeStep === 1 && (
                      <div className="space-y-4 mt-6">
                        {activeType.required_fields.map(field => (
                          <div key={field} className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              {formatFieldName(field)}
                            </label>
                            <input
                              type="text"
                              placeholder={`Enter ${formatFieldName(field)}`}
                              value={formConfig[field] || ''}
                              onChange={(e) => handleFieldChange(field, e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Save Connection Slide
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Final Step</span>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Review & Save Configuration</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      All connection parameters have been set. Before finalizing, verify the link and test access limits.
                    </p>

                    <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 space-y-3">
                      <h4 className="text-[10px] font-bold uppercase text-zinc-400">Configured Parameters</h4>
                      {activeType.required_fields.map(field => (
                        <div key={field} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">{formatFieldName(field)}:</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
                            {formConfig[field] ? '••••••••' : 'Not Set'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleTestConnection}
                        disabled={testing}
                        className="w-full py-2.5 rounded-xl border border-violet-500/20 hover:border-violet-500 text-violet-500 hover:bg-violet-500/5 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {testing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-violet-500/10" /> Test Connection Credentials
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-zinc-200 dark:border-white/5 mt-8">
                <button
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                {activeStep < activeType.setup_steps.length ? (
                  <button
                    onClick={() => setActiveStep(prev => prev + 1)}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/15 cursor-pointer flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSaveConnection}
                    disabled={saving}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/15 cursor-pointer flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...
                      </>
                    ) : (
                      <>Connect Service</>
                    )}
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  )
}
