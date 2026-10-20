'use client'

import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { 
  HelpCircle, Check, ChevronDown, ShieldCheck, Play, 
  ArrowRight, Radio, Cpu, Calendar, MessageSquare, Terminal, Copy, 
  ExternalLink, Activity, Zap, CheckCircle2, PhoneCall
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import TrialSetupModal from '@/components/billing/TrialSetupModal'
import EnterpriseContactModal from '@/components/enterprise/EnterpriseContactModal'

// Resolve Lucide icons dynamically
const getIcon = (name: string) => {
  if (!name) return Zap
  const IconComponent = (LucideIcons as any)[name]
  return IconComponent || Zap
}

// 1. Workflow Pipeline Section (Replaces plain How It Works)
export function WorkflowPipelineSection({ steps, toolName }: { steps: any[]; toolName: string }) {
  const defaultSteps = [
    {
      title: 'Inbound or Outbound Call Trigger',
      desc: 'Prospect calls your dedicated line, or an automated outbound campaign fires based on CRM triggers.',
      tag: '01 • INITIATION',
      icon: PhoneCall
    },
    {
      title: 'Autonomous Voice Reasoning',
      desc: 'Gemini 2.5 Flash + high-fidelity audio delivers rapid voice interaction with natural human emotion and interruption handling.',
      tag: '02 • COGNITIVE CORE',
      icon: Cpu
    },
    {
      title: 'Instant Booking & Post-Call Automation',
      desc: 'Directly reserves slots on Cal.com / Google Calendar, sends WhatsApp & SMS confirmation, and syncs full call notes to CRM.',
      tag: '03 • EXECUTION',
      icon: Calendar
    }
  ]

  const items = steps && steps.length > 0 
    ? steps.map((s, idx) => {
        const isObj = typeof s === 'object' && s !== null
        return {
          title: isObj ? s.title : `Step ${idx + 1}`,
          desc: isObj ? s.description : s,
          tag: `0${idx + 1} • EXECUTION STEP`,
          icon: idx === 0 ? PhoneCall : idx === 1 ? Cpu : Calendar
        }
      })
    : defaultSteps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase font-mono">
            HOW IT WORKS
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
            How {toolName} Operates
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-bold">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>Voice Ready</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {items.map((step, idx) => {
          const Icon = step.icon
          return (
            <div
              key={idx}
              className="relative bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-white/25 transition-all duration-300 group shadow-sm hover:shadow-black/5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-white/10">
                    {step.tag}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-800 dark:text-zinc-200 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>STAGE 0{idx + 1}</span>
                <span className="text-emerald-500 font-bold">READY</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 2. Bento Capabilities Section
export function FeaturesSection({ features }: { features: any[] }) {
  if (!features || features.length === 0) return null

  const isPlainStrings = features.every((f) => typeof f === 'string')

  const capabilities = isPlainStrings
    ? features.map((feat: string, idx: number) => ({
        title: feat,
        desc: 'Autonomous enterprise-grade function executed dynamically during phone conversations.',
        icon: idx % 3 === 0 ? 'Bot' : idx % 3 === 1 ? 'Calendar' : 'Zap'
      }))
    : features

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase font-mono">
          AUTONOMOUS CAPABILITIES
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
          Everything Built Into This Agent
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {capabilities.map((feat: any, idx: number) => {
          const title = feat.title ?? feat
          const desc = feat.desc || feat.description || 'Pre-configured capability active in all voice channels.'
          const Icon = getIcon(feat.icon ?? 'CheckCircle2')

          return (
            <div
              key={idx}
              className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-white/25 hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-white/5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                <Check className="w-3 h-3" />
                <span>Zero configuration required</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 3. Industry Use Cases Section
export function UseCasesSection({ useCases }: { useCases: any[] }) {
  if (!useCases || useCases.length === 0) return null

  const isPlainStrings = useCases.every((u) => typeof u === 'string')
  const defaultMetrics = ['-42% Drop-off', '99.4% Slot Accuracy', '24/7 Availability', '+65% Conversion']

  const cases = isPlainStrings
    ? useCases.map((uc: string, idx: number) => ({
        title: uc,
        desc: `Tailored workflow optimized for ${uc.toLowerCase()} with automatic calendar slot reservations and customer notifications.`,
        metric: defaultMetrics[idx % defaultMetrics.length]
      }))
    : useCases

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase font-mono">
          PROVEN DEPLOYMENT SCENARIOS
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
          Engineered for Real-World Business Workflows
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cases.map((uc: any, idx: number) => (
          <div
            key={idx}
            className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-white/25 transition-all duration-300 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  {uc.metric || 'HIGH ROI'}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">USE CASE #{idx + 1}</span>
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {uc.title ?? uc}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {uc.desc || uc.description || 'Seamlessly manages booking requests, answers customer questions, and handles reschedules without staff involvement.'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 font-bold">
              <span>Includes Industry System Prompt</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 5. Reimagined Pricing Section
interface PricingSectionProps {
  config: Record<string, string>
  agentType?: string
  agentSlug?: string
  adminPrice?: string | null
  onStartDemo?: () => void
}

export function PricingSection({ config, agentType = 'voice', agentSlug = 'voice', adminPrice, onStartDemo }: PricingSectionProps) {
  const router = useRouter()
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false)
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false)

  const freeDemoMinutes = config.free_demo_minutes || '10'
  const trialPrice = parseInt(config.trial_price_paisa || '9900', 10) / 100
  const trialDays = config.trial_days || '7'
  const trialMinutes = config.trial_minutes || '50'

  const starterPrice = (parseInt(config.starter_price_paisa || '499900', 10) / 100).toLocaleString('en-IN')
  const starterMinutes = config.starter_minutes || '500'

  const professionalPrice = (parseInt(config.professional_price_paisa || '1499900', 10) / 100).toLocaleString('en-IN')
  const professionalMinutes = config.professional_minutes || '2000'

  const isVoice = agentType === 'voice'

  return (
    <div className="space-y-8">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase font-mono">
          TRANSPARENT COMMERCIAL PLANS
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Choose the Perfect Scale for Your Agent
        </h2>
        {adminPrice && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-bold font-mono">
            <span>Admin Tag: {adminPrice}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* 1. Free Sandbox */}
        <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:border-zinc-300 dark:hover:border-white/20 transition-all">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Free Sandbox</h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                EXPLORE
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono">₹0</div>
              <p className="text-[11px] text-zinc-500 mt-1">Free instant browser sandbox</p>
            </div>

            <ul className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 pt-2 border-t border-zinc-100 dark:border-white/5">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{freeDemoMinutes} browser test minutes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Interactive web speech simulator</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Cal.com test scheduling preview</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero credit card required</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onStartDemo}
            className="mt-6 w-full py-3 px-4 rounded-xl border border-zinc-300 dark:border-white/15 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            Launch Free Sandbox
          </button>
        </div>

        {/* 2. All-Access Trial (Featured) */}
        <div className="relative bg-zinc-50 dark:bg-[#101014] backdrop-blur-2xl border-2 border-zinc-900 dark:border-white/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-black/10 dark:shadow-black/40 md:-translate-y-2">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[9px] uppercase tracking-widest font-mono shadow-md">
            BEST VALUE • START HERE
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">All-Access Trial</h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                ALL-INCLUSIVE
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono flex items-baseline gap-1">
                <span>₹{trialPrice.toFixed(0)}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">/ {trialDays} days</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">Everything needed to test with real callers</p>
            </div>

            <ul className="space-y-3 text-xs text-zinc-800 dark:text-zinc-200 pt-2 border-t border-zinc-200/80 dark:border-white/10">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong>{trialMinutes} voice calling minutes</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Dedicated phone number assigned</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Live Cal.com meeting booking</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>WhatsApp post-call dispatch</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{trialDays} days uninterrupted access</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setIsTrialModalOpen(true)}
            className="btn-luxury-animated group mt-6 w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer text-center shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2"
          >
            <span className="text-white font-extrabold tracking-widest">Start Trial for ₹{trialPrice.toFixed(0)}</span>
            <span className="text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200">→</span>
          </button>
        </div>

        {/* 3. Go Enterprise (Custom SLA / High Volume) */}
        <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:border-zinc-300 dark:hover:border-white/20 transition-all">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Go Enterprise</h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/15">
                BESPOKE
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono flex items-baseline gap-1">
                <span>Custom</span>
                <span className="text-xs text-zinc-400 font-normal">/ SLA</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">High-throughput enterprise infrastructure</p>
            </div>

            <ul className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 pt-2 border-t border-zinc-100 dark:border-white/5">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Bespoke agent slots & concurrency</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Dedicated SIP trunks & local numbers</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Custom LLM fine-tuning & voice cloning</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Dedicated account manager & 99.99% SLA</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setIsEnterpriseModalOpen(true)}
            className="mt-6 w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white/10 dark:hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            Contact Enterprise →
          </button>
        </div>
      </div>

      {/* Trial Setup & Personality Selector Modal */}
      <TrialSetupModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        configs={config}
        onProceedToCheckout={async (trialData) => {
          setIsTrialModalOpen(false)
          router.push(
            `/dashboard/checkout?agent=${agentSlug}&plan=trial&tier=${trialData.targetPlanSlug}&count=${trialData.agentCount}&personalities=${encodeURIComponent(trialData.selectedPersonalities.join(','))}`
          )
        }}
      />

      {/* Enterprise Lead Generation Modal */}
      <EnterpriseContactModal
        isOpen={isEnterpriseModalOpen}
        onClose={() => setIsEnterpriseModalOpen(false)}
        initialPlanSlug={agentSlug}
      />
    </div>
  )
}

// 6. Modern FAQ Accordion
export function FAQSection({ faqs }: { faqs: any[] }) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0)

  const defaultFaqs = [
    {
      q: 'How fast does this agent deploy to my business?',
      a: 'Deployment takes under 60 seconds. Once activated, you can link your existing phone line or receive an instant dedicated number with automated Cal.com scheduling.'
    },
    {
      q: 'Can the agent handle interruptions or accents?',
      a: 'Yes. Built on Gemini 2.5 Flash and Deepgram, the agent features natural human barge-in capability. If a caller interrupts, the agent immediately listens and pivots context gracefully.'
    },
    {
      q: 'How does Cal.com calendar scheduling work?',
      a: 'When a prospect requests a callback or meeting, the agent checks your live Cal.com availability in real time, reserves the selected slot, and automatically sends Google Meet / Zoom calendar invites.'
    },
    {
      q: 'Can I test this agent before paying?',
      a: 'Yes! You have a 100% free browser sandbox demo to speak directly with the agent. You can also start the 7-day All-Access Trial for just ₹99 with a real phone number.'
    }
  ]

  const items = faqs && faqs.length > 0 ? faqs : defaultFaqs

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase font-mono">
          FREQUENTLY ASKED QUESTIONS
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
          Got Questions? We&apos;ve Got Answers.
        </h2>
      </div>

      <div className="space-y-3">
        {items.map((faq: any, idx: number) => {
          const isObj = typeof faq === 'object' && faq !== null
          const question = isObj ? faq.q : 'Question details'
          const answer = isObj ? faq.a : faq
          const isOpen = activeFaq === idx

          return (
            <div
              key={idx}
              className={`border transition-all duration-300 rounded-2xl overflow-hidden backdrop-blur-xl ${
                isOpen 
                  ? 'border-zinc-900/30 dark:border-white/30 bg-zinc-500/[0.03]' 
                  : 'border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02]'
              }`}
            >
              <button
                onClick={() => setActiveFaq(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <span>{question}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  isOpen 
                    ? 'bg-zinc-900/10 dark:bg-white/10 border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white rotate-180' 
                    : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400'
                }`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed border-t border-zinc-100 dark:border-white/5 animate-in fade-in duration-200">
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

// Keep DemoPreviewSection for backward compatibility
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
