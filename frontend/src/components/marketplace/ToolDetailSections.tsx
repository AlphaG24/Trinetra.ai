'use client'

import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { 
  Sparkles, HelpCircle, Check, ChevronDown, ShieldCheck, Play, 
  ArrowRight, Radio, Cpu, Calendar, MessageSquare, Terminal, Copy, 
  ExternalLink, Activity, Zap, CheckCircle2, PhoneCall
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Resolve Lucide icons dynamically
const getIcon = (name: string) => {
  if (!name) return Sparkles
  const IconComponent = (LucideIcons as any)[name]
  return IconComponent || Sparkles
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
      title: 'Autonomous Realtime Voice Reasoning',
      desc: 'Gemini 2.5 Flash + ElevenLabs delivers sub-450ms conversational latency with natural human emotion and interruption handling.',
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
            ENGINEERING PIPELINE
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
            How {toolName} Operates in Realtime
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-bold">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>&lt;450ms Voice Loop</span>
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
        desc: 'Autonomous enterprise-grade function executed dynamically during active live calls.',
        icon: idx % 3 === 0 ? 'Sparkles' : idx % 3 === 1 ? 'Calendar' : 'Zap'
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
          const desc = feat.desc || feat.description || 'Pre-configured capability active in both sandbox and production lines.'
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

// 4. Developer Hub & Integration Section
export function DeveloperHubSection({ agentSlug }: { agentSlug: string }) {
  const [copied, setCopied] = useState(false)

  const curlExample = `curl -X POST https://api.trinetraedu-ai.com/v1/agents/${agentSlug}/call \\
  -H "Authorization: Bearer trn_live_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "customer_name": "Dr. Raghav Sharma",
    "calendar_sync": true
  }'`

  const handleCopy = () => {
    navigator.clipboard.writeText(curlExample)
    setCopied(true)
    toast.success('cURL command copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const integrations = [
    { name: 'Cal.com & Google Calendar', desc: 'Auto-book meetings & sync live slots', status: 'Active' },
    { name: 'Twilio & WhatsApp Bot', desc: 'Post-call summary & instant confirmation', status: 'Active' },
    { name: 'Custom CRM Webhooks', desc: 'Live JSON payload dispatch on call completion', status: 'Active' },
    { name: 'Telegram Alerts', desc: 'Instant admin notifications on bookings', status: 'Active' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase font-mono">
          DEVELOPER SPECIFICATIONS & WEBHOOKS
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
          Seamless Integrations & API Control
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* cURL API Box */}
        <div className="bg-[#0c0c0e] border border-zinc-800 dark:border-white/10 rounded-2xl p-5 space-y-3 font-mono shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[11px] text-zinc-400 ml-2">trigger_call.sh</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="text-[11px] text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre p-2 bg-black/40 rounded-xl">
            {curlExample}
          </pre>

          <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Authentication: Bearer Token</span>
            <span className="text-emerald-400 font-bold">200 OK Response (JSON)</span>
          </div>
        </div>

        {/* Integration List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {integrations.map((item, idx) => (
            <div
              key={idx}
              className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-white/25 transition shadow-sm"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                    {item.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{item.name}</h4>
                <p className="text-[11px] text-zinc-500 leading-snug">{item.desc}</p>
              </div>
              <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-white/5 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                <span>Configured in Settings</span>
                <ChevronDown className="w-3 h-3 -rotate-90" />
              </div>
            </div>
          ))}
        </div>
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
    <div className="space-y-8">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-[10px] font-bold tracking-widest text-violet-400 uppercase font-mono">
          TRANSPARENT COMMERCIAL PLANS
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Choose the Perfect Scale for Your Agent
        </h2>
        {adminPrice && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold font-mono">
            <Sparkles className="w-3 h-3 text-amber-300" />
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

        {/* 2. Production Trial (Featured) */}
        <div className="relative bg-zinc-50 dark:bg-[#101014] backdrop-blur-2xl border-2 border-zinc-900 dark:border-white/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-black/10 dark:shadow-black/40 md:-translate-y-2">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[9px] uppercase tracking-widest font-mono shadow-md">
            BEST VALUE • START HERE
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Production Trial</h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                ACTIVE PIPELINE
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
                <span><strong>{trialMinutes} live phone call minutes</strong></span>
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
            onClick={() => router.push(`/dashboard/checkout?agent=${agentSlug}&plan=trial`)}
            className="btn-luxury-animated group mt-6 w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer text-center shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2"
          >
            <span className="text-white font-extrabold tracking-widest">Start Trial for ₹{trialPrice.toFixed(0)}</span>
            <span className="text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200">→</span>
          </button>
        </div>

        {/* 3. Monthly Scale Plan (Starter / Pro) */}
        <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:border-zinc-300 dark:hover:border-white/20 transition-all">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Business Monthly</h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                PRODUCTION
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono flex items-baseline gap-1">
                <span>₹{starterPrice}</span>
                <span className="text-xs text-zinc-400 font-normal">/mo</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">High-volume business deployment</p>
            </div>

            <ul className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 pt-2 border-t border-zinc-100 dark:border-white/5">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>{starterMinutes} mins/mo</strong> included</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Unlimited concurrent calls</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Webhook & Zapier integrations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Priority low-latency SIP trunks</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => router.push(`/dashboard/checkout?agent=${agentSlug}&plan=starter`)}
            className="mt-6 w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white/10 dark:hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            Deploy at ₹{starterPrice}/mo
          </button>
        </div>
      </div>
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
      a: 'Yes! You have a 100% free browser sandbox demo to speak directly with the agent. You can also start the 7-day Production Trial for just ₹99 with a real phone number.'
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
