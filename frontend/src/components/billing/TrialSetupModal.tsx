'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Bot,
  Check,
  Calendar,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Info,
  PhoneCall,
  CheckCircle2,
  Zap,
  HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'

export interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_monthly: number
  price_annual: number
  max_agents: number
  included_voice_minutes: number
  included_chat_conversations?: number
  included_social_posts?: number
  overage_voice_per_minute?: number
  is_popular?: boolean
  is_active?: boolean
  badge_text?: string | null
  display_order?: number
  features?: Record<string, any>
}

export interface PersonalityOption {
  id: string
  name: string
  role: string
  description: string
  iconBadge: string
}

const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    id: 'sales_agent',
    name: 'Sales Agent',
    role: 'Revenue Generation',
    description: 'An AI voice sales agent that calls prospects in natural Hinglish, handles objections, and closes deals.',
    iconBadge: '🎯'
  },
  {
    id: 'appointment_agent',
    name: 'Appointment Booker',
    role: 'Calendar Automation',
    description: 'A precise, friendly AI appointment booking agent that collects details, confirms availability, and handles rescheduling.',
    iconBadge: '📅'
  },
  {
    id: 'support_agent',
    name: 'Support Agent',
    role: '24/7 Issue Resolution',
    description: 'An empathetic AI customer support agent that troubleshoots step by step and handles customer inquiries with warmth.',
    iconBadge: '🎧'
  },
  {
    id: 'lead_qualifier',
    name: 'Lead Qualifier',
    role: 'B2B Discovery',
    description: 'An AI lead qualification agent that asks BANT questions conversationally and scores leads automatically.',
    iconBadge: '⚡'
  },
  {
    id: 'multi_agent',
    name: 'Multi-Personality Agent',
    role: 'Omnichannel AI',
    description: 'One AI agent that handles Sales, Support, Appointments, and Lead Qualification from a single phone number. Detects caller intent instantly.',
    iconBadge: '🔮'
  },
  {
    id: 'anika-voice',
    name: 'Vikram - AI Voice Assistant',
    role: 'Enterprise Workflows',
    description: 'An enterprise conversational AI agent capable of managing voice and phone workflows.',
    iconBadge: '🤖'
  }
]

interface TrialSetupModalProps {
  isOpen: boolean
  onClose: () => void
  configs?: Record<string, string>
  onProceedToCheckout: (trialPayload: {
    agentCount: number
    targetPlanSlug: string
    targetPriceRupees: number
    selectedPersonalities: string[]
    renewalDate: string
  }) => Promise<void>
}

export default function TrialSetupModal({
  isOpen,
  onClose,
  configs = {},
  onProceedToCheckout
}: TrialSetupModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [personalities, setPersonalities] = useState<PersonalityOption[]>(PERSONALITY_OPTIONS)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>(['sales_agent', 'support_agent'])

  // Fetch active plans & admin-configured trial personalities
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    async function loadPlans() {
      try {
        setLoadingPlans(true)
        const res = await fetch('/api/plans')
        if (!res.ok) throw new Error('Failed to load pricing plans')
        const data = await res.json()
        const fetchedPlans: Plan[] = data.plans || []
        const fetchedPersonalities: PersonalityOption[] = (Array.isArray(data.trial_personalities) && data.trial_personalities.length > 0)
          ? data.trial_personalities
          : PERSONALITY_OPTIONS

        if (isMounted) {
          setPlans(fetchedPlans)
          setPersonalities(fetchedPersonalities)
          if (fetchedPlans.length > 0) {
            // Find default plan (popular plan or 2-agent growth plan or 1st plan)
            const popular = fetchedPlans.find(p => p.is_popular) || fetchedPlans.find(p => p.max_agents === 2) || fetchedPlans[0]
            setSelectedPlanId(popular.id)
            
            // Default personality selection based on agent count and admin-configured roles
            const defaultQuota = popular.max_agents || 1
            const defaultIds = fetchedPersonalities.slice(0, defaultQuota).map(p => p.id)
            setSelectedPersonalities(defaultIds)
          }
        }
      } catch (err) {
        console.warn('Error loading plans from API, using fallback:', err)
        // Fallback default plans
        if (isMounted) {
          const fallbackPlans: Plan[] = [
            {
              id: 'starter',
              name: 'Starter AI',
              slug: 'starter',
              description: 'For solo founders and small teams getting started with AI',
              price_monthly: 499900,
              price_annual: 399900,
              max_agents: 1,
              included_voice_minutes: 500,
              is_popular: false
            },
            {
              id: 'growth',
              name: 'Growth AI',
              slug: 'growth',
              description: 'For growing businesses that need multi-channel AI',
              price_monthly: 999900,
              price_annual: 799900,
              max_agents: 2,
              included_voice_minutes: 1500,
              is_popular: true,
              badge_text: 'MOST POPULAR'
            },
            {
              id: 'scale',
              name: 'Scale AI',
              slug: 'scale',
              description: 'For established businesses and agencies scaling operations',
              price_monthly: 1999900,
              price_annual: 1599900,
              max_agents: 4,
              included_voice_minutes: 4000,
              is_popular: false
            }
          ]
          setPlans(fallbackPlans)
          setSelectedPlanId('growth')
        }
      } finally {
        if (isMounted) setLoadingPlans(false)
      }
    }

    loadPlans()
    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Current selected plan entity
  const selectedPlan = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId) || plans[0] || null
  }, [plans, selectedPlanId])

  const selectedAgentCount = selectedPlan ? (selectedPlan.max_agents || 1) : 2
  const futureBasePrice = selectedPlan ? Math.round((selectedPlan.price_monthly || 0) / 100) : 4999
  const futureGstAmount = Math.round(futureBasePrice * 0.18)
  const futureGrandTotal = futureBasePrice + futureGstAmount

  // Renewal date = exactly 7 days from now
  const renewalDateObj = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d
  }, [])

  const renewalDateFormatted = useMemo(() => {
    return renewalDateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [renewalDateObj])

  // Handle switching plan card
  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlanId(plan.id)
    const newCount = plan.max_agents || 1
    if (selectedPersonalities.length > newCount) {
      setSelectedPersonalities(selectedPersonalities.slice(0, newCount))
    } else if (selectedPersonalities.length < newCount) {
      const needed = newCount - selectedPersonalities.length
      const unselected = personalities.filter(p => !selectedPersonalities.includes(p.id)).map(p => p.id)
      setSelectedPersonalities([...selectedPersonalities, ...unselected.slice(0, needed)])
    }
  }

  // Handle toggling personality selection with STRICT QUOTA
  const handleTogglePersonality = (id: string) => {
    if (selectedPersonalities.includes(id)) {
      setSelectedPersonalities(selectedPersonalities.filter(item => item !== id))
    } else {
      if (selectedPersonalities.length >= selectedAgentCount) {
        toast.error(`Your plan (${selectedPlan?.name || 'Selected'}) includes exactly ${selectedAgentCount} agent${selectedAgentCount > 1 ? 's' : ''}. Deselect one first to choose this personality.`)
        return
      }
      setSelectedPersonalities([...selectedPersonalities, id])
    }
  }

  const isQuotaSatisfied = selectedPersonalities.length === selectedAgentCount

  const handleConfirmAndPay = async () => {
    if (!selectedPlan) {
      toast.error('Please select an ongoing renewal plan')
      return
    }

    if (!isQuotaSatisfied) {
      const remaining = selectedAgentCount - selectedPersonalities.length
      toast.error(`Please select exactly ${selectedAgentCount} personalities. (${remaining} more needed)`)
      return
    }

    try {
      setSubmitting(true)
      await onProceedToCheckout({
        agentCount: selectedAgentCount,
        targetPlanSlug: selectedPlan.slug,
        targetPriceRupees: futureBasePrice,
        selectedPersonalities,
        renewalDate: renewalDateObj.toISOString()
      })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error processing trial setup')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl w-full max-w-4xl lg:max-w-5xl p-5 sm:p-6 md:p-7 shadow-2xl space-y-4 sm:space-y-5 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-xl bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] flex items-center justify-center text-sm transition cursor-pointer border border-[var(--border)] z-10"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold uppercase tracking-wider mb-2">
            ₹99 7-Day All-Access Trial Setup
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--heading)]">
            Configure Your AI Voice Workforce
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Choose your ongoing plan capacity (as configured by administrator) and customize personality roles. Full production access starts today for ₹99 with zero GST.
          </p>
        </div>

        {/* STEP 1: Choose Ongoing Plan Capacity (Admin Live Plans) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)]">
              Step 1: Choose Ongoing Plan Capacity (Rate Card)
            </label>
            <span className="text-[10px] text-zinc-500 font-mono">
              Live from Admin Catalog
            </span>
          </div>

          {loadingPlans ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--background)]">
              <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
              <span className="text-xs text-[var(--muted)]">Loading administrator plan cards...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600">
              No active subscription plans found. Please configure plans in the admin portal.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id
                const planPrice = Math.round((plan.price_monthly || 0) / 100)
                const badge = plan.badge_text || (plan.is_popular ? 'POPULAR' : null)

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-zinc-900/5 dark:bg-white/5 border-zinc-900 dark:border-white shadow-sm ring-1 ring-zinc-900 dark:ring-white scale-[1.01]'
                        : 'bg-[var(--background)] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div>
                      {badge && (
                        <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {badge}
                        </span>
                      )}
                      
                      <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--heading)]">
                        <Bot className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{plan.name}</span>
                      </div>

                      <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mt-1">
                        {plan.max_agents} AI Agent{plan.max_agents > 1 ? 's' : ''} Capacity
                      </div>

                      <div className="mt-2 font-mono font-black text-xl text-[var(--heading)]">
                        ₹{planPrice.toLocaleString('en-IN')}
                        <span className="text-[10px] font-normal text-[var(--muted)]">/mo</span>
                      </div>

                      <div className="text-[11px] font-medium text-[var(--muted)] mt-1 flex items-center gap-1 font-mono">
                        <PhoneCall className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span>{(plan.included_voice_minutes || 0).toLocaleString('en-IN')} monthly minutes</span>
                      </div>

                      {plan.description && (
                        <p className="text-[10px] text-[var(--muted)] mt-2 line-clamp-2 leading-relaxed border-t border-[var(--border)]/60 pt-2">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[var(--border)]/40 flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400">Post-trial mandate</span>
                      <span className={`font-bold font-mono ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
                        {isSelected ? '✓ Selected' : 'Select →'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* STEP 2: Customize Personality Roles (Strict Quota Enforcement) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)]">
              Step 2: Customize Personality Roles
            </label>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
              isQuotaSatisfied
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {selectedPersonalities.length} of {selectedAgentCount} Slots Selected
            </span>
          </div>

          <p className="text-[11px] text-[var(--muted)]">
            Select exactly <strong>{selectedAgentCount}</strong> personality role{selectedAgentCount > 1 ? 's' : ''} to activate for your <strong>{selectedPlan?.name || 'Selected'}</strong> trial.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(personalities && personalities.length > 0 ? personalities : PERSONALITY_OPTIONS).map((item) => {
              const isChecked = selectedPersonalities.includes(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => handleTogglePersonality(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isChecked
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                      : 'bg-[var(--background)] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="text-xl shrink-0 mt-0.5">
                    {item.iconBadge}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[var(--heading)] truncate">
                        {item.name}
                      </span>
                      {isChecked && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mt-0.5">
                      {item.role}
                    </span>
                    <p className="text-[10px] text-[var(--muted)] mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* STEP 3: Transparent Autopay Breakdown Card */}
        <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--heading)] flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>Transparent Autopay Breakdown</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Zero Surprise Guarantee
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)] text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">Today's Total (7-Day Trial)</span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                ₹99 <span className="text-[11px] font-normal text-zinc-500">(0% GST Statutory Trial Exemption)</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">Ongoing Renewal Mandate</span>
              <div className="text-sm font-bold font-mono text-[var(--heading)]">
                ₹{futureGrandTotal.toLocaleString('en-IN')}/mo <span className="text-[10px] font-normal text-zinc-500">(₹{futureBasePrice.toLocaleString('en-IN')} + 18% GST)</span>
              </div>
              <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                <span>First auto-debit: <strong>{renewalDateFormatted}</strong></span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 text-[10px] text-[var(--muted)] flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Risk Cancellation:</strong> You can cancel anytime with a single click in your Billing settings before day 7. If cancelled before {renewalDateFormatted}, your mandate is immediately revoked with zero penalty.
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-[var(--muted)] text-center sm:text-left">
            <span>By proceeding, you verify the </span>
            <strong className="text-[var(--heading)]">{selectedPlan?.name || 'Selected'}</strong>
            <span> capacity and {selectedPersonalities.length} personality assignment{selectedPersonalities.length > 1 ? 's' : ''}.</span>
          </div>

          <button
            onClick={handleConfirmAndPay}
            disabled={submitting || !isQuotaSatisfied || loadingPlans}
            className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
              isQuotaSatisfied && !loadingPlans
                ? 'bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Preparing Checkout...</span>
              </>
            ) : (
              <>
                <span>Proceed to Checkout (₹99)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
