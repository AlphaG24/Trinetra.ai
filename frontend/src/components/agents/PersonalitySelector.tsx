'use client'

import { useState, useCallback, useEffect } from 'react'
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
  onPersonalitiesChange?: (newConfig: PersonalityConfig) => void
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
    activeBg: 'bg-violet-500/10 border-violet-500/40 ring-violet-500/30',
    iconBg: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25',
    dot: 'bg-violet-500',
  },
  blue: {
    activeBg: 'bg-blue-500/10 border-blue-500/40 ring-blue-500/30',
    iconBg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25',
    dot: 'bg-blue-500',
  },
  emerald: {
    activeBg: 'bg-emerald-500/10 border-emerald-500/40 ring-emerald-500/30',
    iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  amber: {
    activeBg: 'bg-amber-500/10 border-amber-500/40 ring-amber-500/30',
    iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25',
    dot: 'bg-amber-500',
  },
}

const DEFAULT_PERSONALITIES: PersonalityConfig = {
  sales: true,
  support: false,
  appointment: false,
  lead_qualifier: false,
}

export function PersonalitySelector({
  agentId,
  initialPersonalities,
  onPersonalitiesChange
}: PersonalitySelectorProps) {
  const [personalities, setPersonalities] = useState<PersonalityConfig>(
    initialPersonalities || DEFAULT_PERSONALITIES
  )
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (initialPersonalities) {
      setPersonalities(initialPersonalities)
    }
  }, [initialPersonalities])

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
          toast.success(`Multi-personality active — ${newCount} roles enabled!`)
        } else {
          const activeName = PERSONALITY_OPTIONS.find(o => next[o.key])?.label || 'Single'
          toast.success(`${activeName} role active and prompt synchronized!`)
        }

        if (onPersonalitiesChange) {
          onPersonalitiesChange(next)
        }
      } catch (err: any) {
        // Revert on failure
        setPersonalities(personalities)
        toast.error('Failed to save personality: ' + err.message)
      } finally {
        setSaving(false)
      }
    },
    [agentId, personalities, enabledCount, onPersonalitiesChange]
  )

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
      {/* Header — Clickable to expand/collapse */}
      <button
        type="button"
        id="personality-selector-toggle"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-[var(--hover-bg)]/50 transition-colors group cursor-pointer text-left"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold font-display text-[var(--heading)]">
                Multi-Personality Mode
              </span>
              {isMultiEnabled ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                  Active ({enabledCount} Roles)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--background)] text-[var(--muted)] border border-[var(--border)] uppercase tracking-wide">
                  Single Role
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {isMultiEnabled
                ? `${enabledCount} roles active — agent automatically detects caller intent and switches roles`
                : 'Select 2+ roles to activate dynamic intent switching, or 1 role for dedicated focus'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {saving && (
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--heading)] transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--heading)] transition-colors" />
          )}
        </div>
      </button>

      {/* Collapsible Body */}
      {expanded && (
        <div className="px-6 pb-6 pt-1 border-t border-[var(--border)] space-y-4">
          {/* Info Banner */}
          <div className="mt-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-[var(--heading)]/85 leading-relaxed font-sans">
              <strong>Dynamic Intent Switching:</strong> When 2 or more roles are enabled, the agent detects what the caller needs from their first few words and seamlessly adopts the right personality. When 1 role is enabled, the agent operates in dedicated mode.
            </p>
          </div>

          {/* Personality Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {PERSONALITY_OPTIONS.map(({ key, label, icon: Icon, color, description, keywords }) => {
              const enabled = personalities[key]
              const c = COLOR_MAP[color]

              return (
                <button
                  type="button"
                  key={key}
                  id={`personality-toggle-${key}`}
                  onClick={() => handleToggle(key)}
                  disabled={saving}
                  className={`relative flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    enabled
                      ? `${c.activeBg} ring-1 shadow-sm`
                      : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--border)]/80 hover:bg-[var(--hover-bg)]/40'
                  }`}
                >
                  {/* Toggle Pill Indicator */}
                  <div
                    className={`absolute top-3.5 right-3.5 w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5 ${
                      enabled ? 'bg-violet-600 dark:bg-violet-500' : 'bg-gray-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>

                  {/* Role Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      enabled
                        ? `${c.iconBg} border-current/20`
                        : 'bg-[var(--card-bg)] text-[var(--muted)] border-[var(--border)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Role Details */}
                  <div className="flex-1 min-w-0 pr-7">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold font-display ${enabled ? 'text-[var(--heading)]' : 'text-[var(--muted)]'}`}>
                        {label}
                      </span>
                      {enabled && (
                        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${enabled ? 'text-[var(--heading)]/80' : 'text-[var(--muted)]'}`}>
                      {description}
                    </p>
                    {enabled && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {keywords.slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${c.badge}`}
                          >
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

          {/* Status Line */}
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]/60 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isMultiEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-violet-500'
                }`}
              />
              <span className={`text-xs font-medium ${isMultiEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--muted)]'}`}>
                {isMultiEnabled
                  ? `Multi-personality active — ${enabledCount} roles enabled`
                  : enabledCount === 1
                  ? 'Single-personality mode active (enable 2+ roles to activate switching)'
                  : 'Please enable at least one role'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
