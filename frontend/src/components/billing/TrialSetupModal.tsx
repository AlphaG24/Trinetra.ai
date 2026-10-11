'use client'

import { useState, useMemo } from 'react'
import {
  Sparkles,
  Bot,
  Check,
  Calendar,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

export interface PersonalityOption {
  id: string
  name: string
  role: string
  description: string
  iconBadge: string
}

const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    id: 'sales',
    name: 'Sales & Outbound Executive',
    role: 'Revenue Generation',
    description: 'Proactively contacts prospects, pitches offerings, handles objections, and closes deals.',
    iconBadge: '🎯'
  },
  {
    id: 'appointment',
    name: 'Appointment Setter & Scheduler',
    role: 'Calendar Automation',
    description: 'Books product demonstrations, consultations, and meetings directly onto Google/Outlook calendars.',
    iconBadge: '📅'
  },
  {
    id: 'support',
    name: 'Customer Support Specialist',
    role: '24/7 Issue Resolution',
    description: 'Resolves inbound customer inquiries, troubleshooting, FAQs, and ticket logging in real-time.',
    iconBadge: '🎧'
  },
  {
    id: 'lead_qualifier',
    name: 'High-Intent Lead Qualifier',
    role: 'B2B Discovery',
    description: 'Verifies caller budgets, authority, need, and timelines (BANT) before passing to human reps.',
    iconBadge: '⚡'
  },
  {
    id: 'collections',
    name: 'Payment Follow-ups & Collections',
    role: 'Dues & Reminders',
    description: 'Courteously contacts customers about pending invoices, subscription renewals, and sends instant payment links.',
    iconBadge: '💳'
  },
  {
    id: 'survey',
    name: 'Feedback & CSAT Survey Agent',
    role: 'Customer Intelligence',
    description: 'Conducts post-purchase check-ins, Net Promoter Score surveys, and records structured sentiment metrics.',
    iconBadge: '📊'
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
  const [loading, setLoading] = useState(false)
  const [selectedAgentCount, setSelectedAgentCount] = useState<1 | 2 | 4>(2)
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>(['sales', 'support'])

  // Rate cards for post-trial autopay (admin-configurable with sensible defaults)
  const planRateCards = useMemo(() => {
    const starterPrice = Math.round(parseInt(configs.starter_price_paisa || '499900', 10) / 100)
    const proPrice = Math.round(parseInt(configs.professional_price_paisa || '999900', 10) / 100)
    const scalePrice = Math.round(parseInt(configs.scale_price_paisa || '1999900', 10) / 100)

    return {
      1: {
        agentCount: 1,
        slug: 'starter',
        name: 'Single Agent Plan',
        monthlyPrice: starterPrice || 4999,
        includedMinutes: 500
      },
      2: {
        agentCount: 2,
        slug: 'growth',
        name: 'Dual Agent Business Plan',
        monthlyPrice: proPrice || 9999,
        includedMinutes: 1500
      },
      4: {
        agentCount: 4,
        slug: 'scale',
        name: 'Quad Agent Enterprise Scale',
        monthlyPrice: scalePrice || 19999,
        includedMinutes: 4000
      }
    }
  }, [configs])

  const targetPlan = planRateCards[selectedAgentCount]

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

  // Future price calculations with GST
  const futureBasePrice = targetPlan.monthlyPrice
  const futureGstAmount = Math.round(futureBasePrice * 0.18)
  const futureGrandTotal = futureBasePrice + futureGstAmount

  // Handle changing agent capacity (resets personalities if quota exceeded)
  const handleSelectCapacity = (count: 1 | 2 | 4) => {
    setSelectedAgentCount(count)
    if (selectedPersonalities.length > count) {
      setSelectedPersonalities(selectedPersonalities.slice(0, count))
    }
  }

  // Handle toggling personality selection with STRICT QUOTA
  const handleTogglePersonality = (id: string) => {
    if (selectedPersonalities.includes(id)) {
      setSelectedPersonalities(selectedPersonalities.filter(item => item !== id))
    } else {
      if (selectedPersonalities.length >= selectedAgentCount) {
        toast.error(`Your plan includes exactly ${selectedAgentCount} agent${selectedAgentCount > 1 ? 's' : ''}. Deselect one first to choose this personality.`)
        return
      }
      setSelectedPersonalities([...selectedPersonalities, id])
    }
  }

  const isQuotaSatisfied = selectedPersonalities.length === selectedAgentCount

  const handleConfirmAndPay = async () => {
    if (!isQuotaSatisfied) {
      const remaining = selectedAgentCount - selectedPersonalities.length
      toast.error(`Please select exactly ${selectedAgentCount} personalities. (${remaining} more needed)`)
      return
    }

    try {
      setLoading(true)
      await onProceedToCheckout({
        agentCount: selectedAgentCount,
        targetPlanSlug: targetPlan.slug,
        targetPriceRupees: targetPlan.monthlyPrice,
        selectedPersonalities,
        renewalDate: renewalDateObj.toISOString()
      })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error processing trial setup')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] flex items-center justify-center text-sm transition cursor-pointer border border-[var(--border)]"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-amber-500" /> ₹99 7-Day All-Access Trial Setup
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--heading)]">
            Configure Your AI Voice Workforce
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Pick your post-trial plan capacity and customize personality roles. Test with full live access today for ₹99 with zero GST.
          </p>
        </div>

        {/* STEP 1: Plan Capacity Selector */}
        <div className="space-y-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)]">
            Step 1: Choose Ongoing Plan Capacity (Rate Card)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([1, 2, 4] as const).map((count) => {
              const card = planRateCards[count]
              const isSelected = selectedAgentCount === count
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleSelectCapacity(count)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-zinc-900/5 dark:bg-white/5 border-zinc-900 dark:border-white shadow-sm ring-1 ring-zinc-900 dark:ring-white'
                      : 'bg-[var(--background)] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  {count === 2 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Popular
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--heading)]">
                    <Bot className="w-4 h-4" />
                    <span>{count} AI Agent{count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-2 font-mono font-bold text-lg text-[var(--heading)]">
                    ₹{card.monthlyPrice.toLocaleString('en-IN')}
                    <span className="text-[10px] font-normal text-[var(--muted)]">/mo</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    {card.includedMinutes.toLocaleString('en-IN')} monthly minutes
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* STEP 2: Personality Selector with Strict Quota */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)]">
              Step 2: Choose Personalities ({selectedPersonalities.length} / {selectedAgentCount} Selected)
            </label>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              isQuotaSatisfied
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {isQuotaSatisfied ? 'Quota Matched' : `Select ${selectedAgentCount - selectedPersonalities.length} More`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PERSONALITY_OPTIONS.map((opt) => {
              const isChecked = selectedPersonalities.includes(opt.id)
              return (
                <div
                  key={opt.id}
                  onClick={() => handleTogglePersonality(opt.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isChecked
                      ? 'bg-zinc-900/5 dark:bg-white/5 border-zinc-900 dark:border-white shadow-xs'
                      : 'bg-[var(--background)] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                      : 'border-[var(--border)] bg-transparent'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{opt.iconBadge}</span>
                      <span className="font-bold text-xs text-[var(--heading)] truncate">{opt.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-semibold block">{opt.role}</span>
                    <p className="text-[10px] text-[var(--muted)] leading-relaxed line-clamp-2">
                      {opt.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* STEP 3: Transparent Autopay & Zero GST Mandate Card */}
        <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5 font-bold text-xs text-[var(--heading)]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Autopay Mandate & Disclosure Guarantee</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider block">Today's Charge</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-[var(--heading)]">₹99.00</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  (0 CGST / 0 SGST)
                </span>
              </div>
              <span className="text-[10px] text-[var(--muted)]">Initial 7-day all-access trial activation</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider block">Upcoming Autopay Charge</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-mono text-[var(--heading)]">
                  ₹{futureGrandTotal.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-zinc-500">
                  (₹{futureBasePrice.toLocaleString('en-IN')} + 18% GST)
                </span>
              </div>
              <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                <span>Scheduled for {renewalDateFormatted}</span>
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-500/5 border border-zinc-500/10 text-[11px] text-[var(--muted)] leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <span>
              <strong>Cancel Anytime:</strong> You can cancel the trial anytime before {renewalDateFormatted} in your Billing console with 1 click to prevent the post-trial debit. No questions asked.
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--heading)] text-xs font-semibold rounded-xl border border-[var(--border)] transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading || !isQuotaSatisfied}
            onClick={handleConfirmAndPay}
            className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2 active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Initiating Trial...</span>
              </>
            ) : (
              <>
                <span>Confirm & Pay ₹99</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
