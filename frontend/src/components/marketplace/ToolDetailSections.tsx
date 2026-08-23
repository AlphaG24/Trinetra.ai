'use client'

import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { Sparkles, HelpCircle, Check, ChevronDown, ShieldCheck, Play } from 'lucide-react'

// Resolve Lucide icons dynamically
const getIcon = (name: string) => {
  if (!name) return Sparkles
  const IconComponent = (LucideIcons as any)[name]
  return IconComponent || Sparkles
}

interface FeatureItem {
  icon?: string
  title: string
  description: string
}

interface StepItem {
  title: string
  description: string
}

interface UseCaseItem {
  title: string
  description: string
}

interface FAQItem {
  q: string
  a: string
}

// 1. Features Section
export function FeaturesSection({ features }: { features: any[] }) {
  if (!features || features.length === 0) return null

  // Detect if this is a plain-string array or a rich-object array
  const isPlainStrings = features.every((f) => typeof f === 'string')

  if (isPlainStrings) {
    // Compact checklist layout for plain string features
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--heading)]" /> Core Capabilities
        </h2>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
          {features.map((feat: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-md bg-[var(--primary-bg)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-[var(--heading)]" />
              </div>
              <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">{feat}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Rich-object layout for {icon, title, description} features
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[var(--heading)]" /> Core Capabilities
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feat: any, idx: number) => {
          const title = feat.title ?? feat
          const desc = feat.description ?? ''
          const Icon = getIcon(feat.icon ?? 'Check')

          return (
            <div
              key={idx}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex items-start gap-4 shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--heading)] shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-montserrat text-[var(--heading)]">
                  {title}
                </h3>
                {desc && (
                  <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">
                    {desc}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 2. How It Works Section
export function HowItWorksSection({ steps }: { steps: any[] }) {
  if (!steps || steps.length === 0) return null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display text-[var(--heading)]">How It Works</h2>
      <div className="grid grid-cols-1 gap-4">
        {steps.map((step: any, idx: number) => {
          const isObj = typeof step === 'object' && step !== null
          const title = isObj ? step.title : `Step ${idx + 1}`
          const desc = isObj ? step.description : step

          return (
            <div
              key={idx}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-5 shadow-sm"
            >
              <div className="text-3xl font-black font-display text-[var(--heading)] shrink-0 opacity-20 w-12 text-center">
                {(idx + 1).toString().padStart(2, '0')}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-montserrat text-[var(--heading)]">
                  {title}
                </h3>
                <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 3. Use Cases Section
export function UseCasesSection({ useCases }: { useCases: any[] }) {
  if (!useCases || useCases.length === 0) return null

  const isPlainStrings = useCases.every((u) => typeof u === 'string')

  if (isPlainStrings) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold font-display text-[var(--heading)]">Ideal Use Cases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {useCases.map((uc: string, idx: number) => (
            <div
              key={idx}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
            >
              <div className="w-5 h-5 rounded-md bg-[var(--primary-bg)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-[var(--heading)]" />
              </div>
              <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">{uc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display text-[var(--heading)]">Ideal Use Cases</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {useCases.map((uc: any, idx: number) => (
          <div
            key={idx}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between shadow-sm"
          >
            <div className="space-y-2">
              <h3 className="text-sm font-bold font-montserrat text-[var(--heading)]">
                {uc.title ?? uc}
              </h3>
              {uc.description && (
                <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">
                  {uc.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 4. Demo Preview Section
export function DemoPreviewSection({ photoUrl, name }: { photoUrl?: string | null; name: string }) {
  if (!photoUrl) return null

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-display text-[var(--heading)]">Dashboard Interface Preview</h2>
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-3 shadow-sm overflow-hidden">
        <img
          src={photoUrl}
          alt={`${name} Interface Preview`}
          className="w-full h-auto rounded-xl object-cover border border-[var(--border)]"
        />
      </div>
    </div>
  )
}

// 5. Pricing Section
interface PricingSectionProps {
  config: Record<string, string>
  agentType?: string
  agentSlug?: string
  onStartDemo?: () => void
}

import { useRouter } from 'next/navigation'

export function PricingSection({ config, agentType = 'voice', agentSlug = 'voice', onStartDemo }: PricingSectionProps) {
  const router = useRouter()
  const freeDemoMinutes = config.free_demo_minutes || '10'
  const trialPrice = parseInt(config.trial_price_paisa || '9900', 10) / 100
  const trialDays = config.trial_days || '7'
  const trialMinutes = config.trial_minutes || '100'

  const starterPrice = (parseInt(config.starter_price_paisa || '499900', 10) / 100).toLocaleString('en-IN')
  const starterMinutes = config.starter_minutes || '500'

  const professionalPrice = (parseInt(config.professional_price_paisa || '1499900', 10) / 100).toLocaleString('en-IN')
  const professionalMinutes = config.professional_minutes || '2000'

  const isVoice = agentType === 'voice'

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display text-[var(--heading)]">Pricing Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free Call Sandbox */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden text-left">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold font-montserrat text-[var(--heading)]">Free Sandbox</span>
              <span className="text-xs font-black text-[var(--heading)] bg-[var(--primary-bg)] px-2 py-0.5 rounded-md uppercase">FREE</span>
            </div>
            <ul className="space-y-2 text-xs text-[var(--body)] font-merriweather">
              <li className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                {isVoice ? `${freeDemoMinutes} browser minutes` : `${freeDemoMinutes} trial credits`}
              </li>
              <li className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                {isVoice ? 'Web browser interface testing' : 'Full interface sandbox access'}
              </li>
            </ul>
          </div>
          <button
            onClick={onStartDemo}
            className="mt-6 w-full py-2.5 px-4 rounded-xl border border-violet-500/35 text-violet-400 hover:bg-violet-500/10 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            Try Free Demo
          </button>
        </div>

        {/* Paid Trial */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden text-left">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold font-montserrat text-[var(--heading)]">Production Trial</span>
              <span className="text-xs font-black text-[var(--heading)] bg-[var(--primary-bg)] px-2 py-0.5 rounded-md uppercase">₹{trialPrice}</span>
            </div>
            <ul className="space-y-2 text-xs text-[var(--body)] font-merriweather">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                {isVoice ? `${trialMinutes} minutes` : `${trialMinutes} premium credits`}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                {trialDays} days complete platform access
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                {isVoice ? 'Dedicated phone number' : 'Instant deployment'}
              </li>
            </ul>
          </div>
          <button
            onClick={() => router.push(`/dashboard/checkout?agent=${agentSlug}&plan=trial`)}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center shadow-md shadow-violet-600/10"
          >
            Start Trial for ₹{trialPrice}
          </button>
        </div>

        {/* Starter Plan */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden text-left">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold font-montserrat text-[var(--heading)]">Starter</span>
              <span className="text-xs font-black text-[var(--heading)] bg-[var(--primary-bg)] px-2 py-0.5 rounded-md uppercase">₹{starterPrice}/mo</span>
            </div>
            <ul className="space-y-2 text-xs text-[var(--body)] font-merriweather">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                {starterMinutes} mins/mo
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                Webhook and Zapier automations
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                Standard CRM integrations
              </li>
            </ul>
          </div>
          <button
            onClick={() => router.push(`/dashboard/checkout?agent=${agentSlug}&plan=starter`)}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center shadow-md shadow-violet-600/10"
          >
            Buy Now at ₹{starterPrice}/mo
          </button>
        </div>

        {/* Professional Plan */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden text-left">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold font-montserrat text-[var(--heading)]">Professional</span>
              <span className="text-xs font-black text-[var(--heading)] bg-[var(--primary-bg)] px-2 py-0.5 rounded-md uppercase">₹{professionalPrice}/mo</span>
            </div>
            <ul className="space-y-2 text-xs text-[var(--body)] font-merriweather">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                {professionalMinutes} mins/mo
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                Priority phone API response time
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--heading)] shrink-0" />
                Dedicated developer support channels
              </li>
            </ul>
          </div>
          <button
            onClick={() => router.push(`/dashboard/checkout?agent=${agentSlug}&plan=professional`)}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center shadow-md shadow-violet-600/10"
          >
            Buy Now at ₹{professionalPrice}/mo
          </button>
        </div>
      </div>
    </div>
  )
}

// 6. FAQ Section
export function FAQSection({ faqs }: { faqs: any[] }) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  if (!faqs || faqs.length === 0) return null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-[var(--heading)]" /> Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq: any, idx: number) => {
          const isObj = typeof faq === 'object' && faq !== null
          const question = isObj ? faq.q : 'Question details'
          const answer = isObj ? faq.a : faq

          return (
            <div
              key={idx}
              className="border border-[var(--border)] rounded-2xl bg-[var(--card-bg)] overflow-hidden shadow-sm transition-all"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-bold font-montserrat text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
              >
                <span>{question}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform duration-200 ${activeFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs text-[var(--body)] font-merriweather leading-relaxed border-t border-[var(--border)]">
                  {answer}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
