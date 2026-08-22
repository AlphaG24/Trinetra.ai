'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Sparkles, Building2, Briefcase, Bot, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

interface QuickSetupModalProps {
  isOpen: boolean
  onClose: () => void
  isDemo?: boolean
}

const INDUSTRIES = [
  'Real Estate',
  'EdTech',
  'BFSI',
  'Healthcare',
  'E-commerce',
  'Other'
]

const BLUEPRINT_META: Record<string, { label: string; desc: string }> = {
  "Sales Lead": { label: 'Sales Agent', desc: 'Outbound pitch, lead qualification, and product presentation' },
  "Technical Support": { label: 'Support Agent', desc: 'Inbound helpdesk, troubleshooting, and escalation handler' },
  "Receptionist": { label: 'Receptionist', desc: 'Booking calendars, scheduling calls, and capturing client intent' },
  "Custom": { label: 'Custom Agent', desc: 'Configure custom prompt directives' }
}

export function QuickSetupModal({ isOpen, onClose, isDemo }: QuickSetupModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingBlueprints, setLoadingBlueprints] = useState(true)
  const [limitError, setLimitError] = useState<string | null>(null)

  // Form states
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('Other')
  const [agentType, setAgentType] = useState('Sales Lead')
  const [blueprints, setBlueprints] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      try {
        setLoadingBlueprints(true)
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()

        // 1. Prefill from profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_name, business_type')
            .eq('id', user.id)
            .maybeSingle()

          if (profile) {
            if (profile.company_name) setCompanyName(profile.company_name)
            if (profile.business_type) setIndustry(profile.business_type)
          }
        }

        // 2. Fetch system_config blueprints
        const { data: configData } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', 'agent_blueprints')
          .maybeSingle()

        let parsed: Record<string, any> = {}
        if (configData?.config_value) {
          parsed = JSON.parse(configData.config_value)
        } else {
          // Fallback static blueprints
          parsed = {
            "Sales Lead": {},
            "Technical Support": {},
            "Receptionist": {},
            "Custom": {}
          }
        }
        setBlueprints(parsed)

        // Set default selection
        const keys = Object.keys(parsed)
        if (keys.length > 0) {
          const defaultKey = keys.includes("Sales Lead") ? "Sales Lead" : keys[0]
          setAgentType(defaultKey)
        }
      } catch (err) {
        console.error('[QuickSetupModal loadData error]', err)
      } finally {
        setLoadingBlueprints(false)
      }
    }

    loadData()
  }, [isOpen])

  if (!isOpen) return null

  const triggerCreateAgent = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter your Company Name')
      return
    }

    // Validation to block placeholder/invalid names
    const lowerName = companyName.trim().toLowerCase()
    if (['my business', 'my company', 'placeholder', 'test', 'acme', 'acme corporation', 'unknown'].includes(lowerName)) {
      toast.error('Please enter a valid company name')
      return
    }

    setLoading(true)

    try {
      const finalCompany = companyName.trim()
      const finalIndustry = industry
      const finalType = agentType

      const agentName = `${finalCompany} AI Assistant`

      const response = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          role: finalType, // exact blueprint key
          voice: 'calm',
          company_name: finalCompany,
          industry: finalIndustry
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agent')
      }

      toast.success('AI Agent configured successfully!')
      onClose()
      
      // Redirect to the newly created agent workspace editor or demo view
      const agentId = data.dbAgent?.id || data.agent?.id || data.dbAgent?.vapi_agent_id
      if (agentId) {
        if (isDemo) {
          router.push(`/dashboard/agents/${agentId}/demo`)
        } else {
          router.push(`/dashboard/agents/${agentId}`)
        }
      } else {
        router.push('/dashboard/agents')
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error occurred while creating agent.'
      if (errorMsg.includes("reached the maximum number") || errorMsg.includes("Agent limit reached") || errorMsg.includes("limit") || errorMsg.includes("demo per agent")) {
        console.warn('[QuickSetupModal limit/demo block]', err)
        setLimitError(errorMsg)
      } else {
        console.error('[QuickSetupModal error]', err)
        toast.error(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glassmorphic Backdrop */}
      <div 
        className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content container */}
      <div className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--heading)]/10 rounded-full blur-3xl pointer-events-none" />
        
        {limitError ? (
          <div className="text-center py-6 font-montserrat relative z-10">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-[var(--heading)] uppercase tracking-wider mb-3">
              Action Blocked
            </h2>
            <p className="text-sm text-[var(--body)] leading-relaxed mb-8 max-w-xs mx-auto">
              {limitError}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--body)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  onClose()
                  router.push('/dashboard/billing')
                }}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--heading)]/10 border border-[var(--heading)]/20 flex items-center justify-center text-[var(--heading)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--heading)]">Quick Agent Config</h3>
                  <p className="text-[var(--muted)] text-xs mt-0.5">Let&apos;s build your first AI agent workspace</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-[var(--body)] hover:text-[var(--heading)] bg-[var(--background)] hover:bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="space-y-5 relative z-10">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Realty"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--body)] focus:border-violet-500 outline-none transition-colors"
                />
              </div>

              {/* Industry Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Business Domain / Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--body)] focus:border-violet-500 outline-none transition-colors appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '1.25rem',
                    backgroundRepeat: 'no-repeat',
                    paddingRight: '2.5rem'
                  }}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind} className="bg-[var(--card-bg)] text-[var(--heading)]">
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              {/* Agent Type Radios */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <Bot className="w-3.5 h-3.5" /> Default Agent Behavior
                </label>
                <div className="grid grid-cols-1 gap-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {loadingBlueprints ? (
                    <div className="flex items-center justify-center py-6 text-[var(--muted)] gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span className="text-xs">Loading templates...</span>
                    </div>
                  ) : Object.keys(blueprints).length === 0 ? (
                    <div className="text-[var(--muted)] text-xs py-4 text-center">No blueprints configured.</div>
                  ) : (
                    Object.keys(blueprints).map((key) => {
                      const isSelected = agentType === key
                      const meta = BLUEPRINT_META[key] || { label: key, desc: 'Preconfigured database template' }
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[var(--heading)] bg-[var(--primary-bg)] shadow-[0_0_15px_rgba(44,44,44,0.05)]'
                              : 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--hover-bg)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="agentType"
                            value={key}
                            checked={isSelected}
                            onChange={() => setAgentType(key)}
                            disabled={loading}
                            className="mt-1 accent-[var(--heading)] h-4 w-4 shrink-0"
                          />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-[var(--heading)]">{meta.label}</span>
                            <span className="text-[10px] text-[var(--muted)] leading-normal">{meta.desc}</span>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Buttons / Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 relative z-10">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 text-xs font-bold border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--body)] hover:text-[var(--heading)] rounded-xl transition-all flex items-center justify-center gap-2 bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={triggerCreateAgent}
                disabled={loading || loadingBlueprints}
                className="flex-1.5 py-3 bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--heading)]" />
                ) : (
                  <>Configure Agent</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
