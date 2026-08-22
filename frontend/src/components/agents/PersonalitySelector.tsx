'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Sparkles, BriefcaseBusiness, Headphones, CalendarCheck, UserSearch, ChevronDown, ChevronUp } from 'lucide-react'

interface PersonalityConfig {
  sales: boolean
  support: boolean
  appointment: boolean
  lead_qualifier: boolean
}

interface PersonalitySelectorProps {
  agentId: string
  initialPersonalities?: PersonalityConfig | null
}

const PERSONALITY_OPTIONS = [
  {
    key: 'sales' as const,
    label: 'Sales',
    icon: BriefcaseBusiness,
    color: 'violet',
    description: 'Pitch products, handle objections, and close deals',
    keywords: ['pricing', 'buy', 'purchase', 'features', 'compare'],
  },
  {
    key: 'support' as const,
    label: 'Support',
    icon: Headphones,
    color: 'blue',
    description: 'Resolve issues, troubleshoot problems, and assist customers',
    keywords: ['problem', 'broken', 'help', 'complaint', 'refund'],
  },
  {
    key: 'appointment' as const,
    label: 'Appointment',
    icon: CalendarCheck,
    color: 'emerald',
    description: 'Book, reschedule, or cancel meetings and appointments',
    keywords: ['schedule', 'book', 'meeting', 'callback', 'cancel'],
  },
  {
    key: 'lead_qualifier' as const,
    label: 'Lead Qualifier',
    icon: UserSearch,
    color: 'amber',
    description: 'Qualify new inbound leads with BANT-style discovery',
    keywords: ['interested', 'inquiry', 'tell me more', 'new lead'],
  },
]

const COLOR_MAP: Record<string, Record<string, string>> = {
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    icon: 'text-violet-400',
    badge: 'bg-violet-500/20 text-violet-300',
    ring: 'ring-violet-500/40',
    dot: 'bg-violet-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300',
    ring: 'ring-blue-500/40',
    dot: 'bg-blue-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
    ring: 'ring-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    ring: 'ring-amber-500/40',
    dot: 'bg-amber-400',
  },
}

const DEFAULT_PERSONALITIES: PersonalityConfig = {
  sales: true,
  support: false,
  appointment: false,
  lead_qualifier: false,
}

export function PersonalitySelector({ agentId, initialPersonalities }: PersonalitySelectorProps) {
  const [personalities, setPersonalities] = useState<PersonalityConfig>(
    initialPersonalities || DEFAULT_PERSONALITIES
  )
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const enabledCount = Object.values(personalities).filter(Boolean).length
  const isMultiEnabled = enabledCount >= 2

  const handleToggle = useCallback(
    async (key: keyof PersonalityConfig) => {
      const current = personalities[key]

      // Prevent disabling if it would leave 0 enabled
      const wouldBeZero = current && enabledCount === 1
      if (wouldBeZero) {
        toast.warning('At least one personality must remain enabled.')
        return
      }

      const next = { ...personalities, [key]: !current }
      setPersonalities(next)
      setSaving(true)

      try {
        const res = await fetch(`/api/agents/${agentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personalities: next }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to save')
        }

        const newCount = Object.values(next).filter(Boolean).length
        if (newCount >= 2) {
          toast.success(`Multi-personality mode active — ${newCount} roles enabled!`)
        } else {
          toast.success('Personality settings updated.')
        }
      } catch (err: any) {
        // Revert on failure
        setPersonalities(personalities)
        toast.error('Failed to save: ' + err.message)
      } finally {
        setSaving(false)
      }
    },
    [agentId, personalities, enabledCount]
  )

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
      {/* Header — clickable to expand/collapse */}
      <button
        id="personality-selector-toggle"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100">Multi-Personality Mode</span>
              {isMultiEnabled && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wide animate-pulse">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isMultiEnabled
                ? `${enabledCount} roles active — agent switches intent automatically`
                : 'Enable 2+ roles to activate dynamic intent switching'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          )}
        </div>
      </button>

      {/* Collapsible body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-zinc-800/60">
          {/* Info banner */}
          <div className="mt-4 mb-4 px-4 py-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-200/70 leading-relaxed">
              The agent will automatically detect what the caller needs and switch roles instantly —
              without interrupting the conversation. Enable at least 2 roles to activate.
            </p>
          </div>

          {/* Personality toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERSONALITY_OPTIONS.map(({ key, label, icon: Icon, color, description, keywords }) => {
              const enabled = personalities[key]
              const c = COLOR_MAP[color]

              return (
                <button
                  key={key}
                  id={`personality-toggle-${key}`}
                  onClick={() => handleToggle(key)}
                  disabled={saving}
                  className={`relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    enabled
                      ? `${c.bg} ${c.border} ring-1 ${c.ring}`
                      : 'bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700/50 hover:bg-zinc-800/30'
                  }`}
                >
                  {/* Toggle indicator */}
                  <div
                    className={`absolute top-3 right-3 w-8 h-4.5 h-[18px] rounded-full transition-all duration-200 flex items-center px-0.5 ${
                      enabled ? 'bg-violet-600' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
                        enabled ? 'translate-x-3' : 'translate-x-0'
                      }`}
                    />
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      enabled ? c.bg : 'bg-zinc-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${enabled ? c.icon : 'text-zinc-500'}`} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${enabled ? 'text-zinc-100' : 'text-zinc-400'}`}>
                        {label}
                      </span>
                      {enabled && (
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${enabled ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {description}
                    </p>
                    {enabled && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {keywords.slice(0, 3).map((kw) => (
                          <span key={kw} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.badge}`}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Status line */}
          <div className="mt-4 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isMultiEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span className={`text-xs ${isMultiEnabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {isMultiEnabled
                ? `Multi-personality active — ${enabledCount} roles enabled`
                : enabledCount === 1
                ? 'Single-personality mode — enable one more role to activate switching'
                : 'No personalities enabled — enable at least one'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
