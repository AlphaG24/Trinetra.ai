import { useState, useEffect } from 'react'
import { 
  Send, MessageCircle, Calendar, Database, 
  Cloud, Mail, Webhook, Link as LinkIcon, Puzzle,
  Loader2, CheckCircle2, Zap, Trash, Edit3
} from 'lucide-react'
import { LockedFeature } from './LockedFeature'
import { toast } from 'sonner'

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

interface AgentIntegrationsTabProps {
  agent: any
  unlocked: boolean
  upgradeUrl: string
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
  settings_schema?: {
    event_triggers?: Array<{ event: string; label: string; enabled: boolean }>
    message_template?: string
    additional_fields?: Array<{ name: string; label: string; type: string; default: string }>
  }
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
}

export function AgentIntegrationsTab({ agent, unlocked, upgradeUrl }: AgentIntegrationsTabProps) {
  const [loading, setLoading] = useState(true)
  const [integrationTypes, setIntegrationTypes] = useState<IntegrationType[]>([])
  const [agentIntegrations, setAgentIntegrations] = useState<AgentIntegration[]>([])
  
  // Active editing state
  const [editingId, setEditingId] = useState<string | null>(null) // integration_type_id
  const [formConfig, setFormConfig] = useState<Record<string, any>>({})
  const [testingType, setTestingType] = useState<string | null>(null)
  const [savingType, setSavingType] = useState<string | null>(null)

  const fetchData = async () => {
    if (!agent?.id) return
    try {
      setLoading(true)
      const [typesRes, agentRes] = await Promise.all([
        fetch('/api/integrations/types'),
        fetch(`/api/integrations/agent/${agent.id}`)
      ])
      
      const typesData = await typesRes.json()
      const agentData = await agentRes.json()
      
      if (typesRes.ok && typesData.success) {
        setIntegrationTypes(typesData.data || [])
      }
      if (agentRes.ok && agentData.success) {
        setAgentIntegrations(agentData.data || [])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load agent integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (unlocked && agent?.id) {
      fetchData()
    }
  }, [unlocked, agent?.id])

  const handleToggleEdit = (type: IntegrationType) => {
    if (editingId === type.id) {
      setEditingId(null)
      setFormConfig({})
    } else {
      const existing = agentIntegrations.find(ai => ai.integration_type_id === type.id)
      const initial: Record<string, any> = {}
      
      // Initialize credentials fields
      type.required_fields.forEach(field => {
        initial[field] = existing?.config?.[field] || ''
      })
      
      // Initialize settings_schema fields
      if (type.settings_schema) {
        // Event triggers
        const triggers: Record<string, boolean> = {}
        const defaultTriggers = type.settings_schema.event_triggers || []
        defaultTriggers.forEach(t => {
          triggers[t.event] = existing?.config?.event_triggers?.[t.event] ?? t.enabled
        })
        initial.event_triggers = triggers
        
        // Message template
        initial.message_template = existing?.config?.message_template ?? type.settings_schema.message_template ?? ''
        
        // Additional fields
        const addFields = type.settings_schema.additional_fields || []
        addFields.forEach(f => {
          initial[f.name] = existing?.config?.[f.name] ?? f.default ?? ''
        })
      }
      
      setFormConfig(initial)
      setEditingId(type.id)
    }
  }

  const handleFieldChange = (field: string, val: string) => {
    setFormConfig(prev => ({ ...prev, [field]: val }))
  }

  const handleTriggerChange = (event: string, checked: boolean) => {
    setFormConfig(prev => {
      const triggers = { ...(prev.event_triggers || {}) }
      triggers[event] = checked
      return { ...prev, event_triggers: triggers }
    })
  }

  const handleTestConnection = async (type: IntegrationType) => {
    setTestingType(type.id)
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: type.slug,
          config: formConfig
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || 'Connection test successful!')
      } else {
        toast.error(data.error || 'Connection test failed.')
      }
    } catch (err: any) {
      toast.error('Network error during test connection.')
    } finally {
      setTestingType(null)
    }
  }

  const handleSaveConnection = async (type: IntegrationType) => {
    setSavingType(type.id)
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agent.id,
          integration_type_id: type.id,
          config: formConfig
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`${type.name} integration updated!`)
        setEditingId(null)
        setFormConfig({})
        fetchData()
      } else {
        toast.error(data.error || 'Failed to connect integration.')
      }
    } catch (err: any) {
      toast.error('Network error while saving.')
    } finally {
      setSavingType(null)
    }
  }

  const handleDisconnect = async (integrationId: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return
    try {
      const res = await fetch(`/api/integrations/${integrationId}/disconnect`, {
        method: 'POST'
      })
      if (res.ok) {
        toast.success(`${name} disconnected successfully.`)
        fetchData()
      } else {
        toast.error('Failed to disconnect integration.')
      }
    } catch (err: any) {
      toast.error('Error disconnecting integration: ' + err.message)
    }
  }

  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  if (!unlocked) {
    return (
      <LockedFeature 
        title="Agent Integrations"
        description="Connect your agent to third-party communication channels, CRM platforms, developer webhooks, and calendar scheduling software."
        upgradeUrl={upgradeUrl}
      />
    )
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-violet-500" /> Loading integration configurations...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-white/5">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-900 dark:text-white flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-violet-500" /> Agent Integrations
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure integration connections specific to this voice agent.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {integrationTypes.map(type => {
          const existing = agentIntegrations.find(ai => ai.integration_type_id === type.id)
          const isConnected = existing?.is_connected ?? false
          const isEditing = editingId === type.id
          const Icon = ICON_MAP[type.icon] || Puzzle

          return (
            <div 
              key={type.id}
              className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{type.name}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{type.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isConnected 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-400'
                  }`}>
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </span>

                  <button
                    onClick={() => handleToggleEdit(type)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 transition cursor-pointer"
                    title={isEditing ? 'Cancel Edit' : 'Edit Configuration'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {isConnected && existing && (
                    <button
                      onClick={() => handleDisconnect(existing.id, type.name)}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/35 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                      title="Disconnect"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Editing Form details */}
              {isEditing && (
                <div className="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {type.required_fields.map(field => (
                      <div key={field} className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          {formatFieldName(field)}
                        </label>
                        <input
                          type="text"
                          placeholder={`Enter ${formatFieldName(field)}`}
                          value={formConfig[field] || ''}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
 
                  {/* Additional Settings (settings_schema fields) */}
                  {type.settings_schema?.additional_fields && type.settings_schema.additional_fields.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-white/5">
                      {type.settings_schema.additional_fields.map(field => (
                        <div key={field.name} className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            {field.label}
                          </label>
                          <input
                            type="text"
                            placeholder={`Enter ${field.label}`}
                            value={formConfig[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Event Triggers Checklist */}
                  {type.settings_schema?.event_triggers && type.settings_schema.event_triggers.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Event Triggers
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {type.settings_schema.event_triggers.map(trigger => {
                          const isTriggerChecked = formConfig.event_triggers?.[trigger.event] ?? trigger.enabled;
                          return (
                            <label key={trigger.event} className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                              <input
                                type="checkbox"
                                checked={isTriggerChecked}
                                onChange={(e) => handleTriggerChange(trigger.event, e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                              />
                              <span>{trigger.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Message Template Customization */}
                  {type.settings_schema?.message_template && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-white/5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Message Template
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Enter message template notification text..."
                        value={formConfig.message_template || ''}
                        onChange={(e) => handleFieldChange('message_template', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none font-mono"
                      />
                      <p className="text-[9px] text-zinc-500">
                        Supports placeholder tags: <code className="bg-zinc-100 dark:bg-white/5 px-1 py-0.5 rounded text-[8px] font-mono">&#123;&#123;contact_name&#125;&#125;</code>, <code className="bg-zinc-100 dark:bg-white/5 px-1 py-0.5 rounded text-[8px] font-mono">&#123;&#123;contact_phone&#125;&#125;</code>, <code className="bg-zinc-100 dark:bg-white/5 px-1 py-0.5 rounded text-[8px] font-mono">&#123;&#123;interest_level&#125;&#125;</code>, <code className="bg-zinc-100 dark:bg-white/5 px-1 py-0.5 rounded text-[8px] font-mono">&#123;&#123;call_summary&#125;&#125;</code>.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={testingType === type.id}
                      onClick={() => handleTestConnection(type)}
                      className="px-4 py-2 border border-violet-500/20 hover:border-violet-500 text-violet-500 hover:bg-violet-500/5 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      {testingType === type.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-violet-500/10" /> Test Connection
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={savingType === type.id}
                      onClick={() => handleSaveConnection(type)}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/55 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                    >
                      {savingType === type.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>Save Settings</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
