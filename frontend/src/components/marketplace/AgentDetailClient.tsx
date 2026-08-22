'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  Bot, PhoneCall, ScanText, Wallet, Sparkles, Check, ChevronDown, 
  ArrowRight, ShieldCheck, Play, HelpCircle, Loader2 
} from 'lucide-react'
import { QuickSetupModal } from '@/src/components/onboarding/QuickSetupModal'
import toast from 'react-hot-toast'

interface AgentDetailClientProps {
  service: {
    id: string
    name: string
    slug: string
    description: string | null
    type: string
    icon_url: string | null
    subdomain_url: string | null
    ui_config: any
    created_at: string
    is_active: boolean
    is_visible_in_marketplace: boolean
    is_demo_allowed: boolean
    marketplace_metadata: any
  }
  config: Record<string, string>
}

export function AgentDetailClient({ service, config }: AgentDetailClientProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  // Resolve pricing configuration from system_config
  const freeDemoMinutes = config.free_demo_minutes || '10'
  const trialPrice = parseInt(config.trial_price_paisa || '9900', 10) / 100
  const trialDays = config.trial_days || '7'
  const trialMinutes = config.trial_minutes || '100'

  // Metadata fallbacks for rich content
  const meta = service.marketplace_metadata || {}
  const tagline = meta.tagline || service.description || 'Enterprise cognitive agent.'
  const features = meta.features || [
    "Autonomous execution",
    "Self-healing state recovery",
    "Real-time CRM logging",
    "Analytics telemetry integration"
  ]

  const howItWorks = meta.how_it_works || [
    "Configure credentials and prompt context in workspace.",
    "Deploy agent instantly as an web application or phone pipeline.",
    "Monitor live analytics, audio recordings and lead tables."
  ]

  const useCases = meta.use_cases || [
    "Automating high-volume support triage",
    "Live sales pipeline generation and booking",
    "Physical document extraction and database loading"
  ]

  const faqs = meta.faq || [
    {
      q: "How fast is the setup process?",
      a: "Setup takes under 2 minutes. You can configure credentials, select a profile template, and have your agent live immediately."
    },
    {
      q: "Does it integrate with existing CRM databases?",
      a: "Yes. All agents automatically support outgoing webhooks, Cal.com calendar syncing, and real-time database uploads."
    },
    {
      q: "Can I use custom voices for call pipelines?",
      a: "Absolutely. Full ElevenLabs and Deepgram integrations are supported so you can clone your own voice or choose from predefined ones."
    }
  ]

  // Color theme mapping
  const t = service.type.toLowerCase()
  const themeColor = t === 'voice' ? 'violet' : t === 'ocr' ? 'amber' : t === 'finance' ? 'emerald' : 'zinc'

  const themeStyles = {
    violet: {
      accent: 'from-violet-500/10 to-transparent border-violet-500/20',
      text: 'text-violet-400',
      bgGlow: 'bg-violet-600/10 border-violet-500/20',
      btn: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/20',
      icon: <PhoneCall className="w-8 h-8 text-violet-400" />
    },
    amber: {
      accent: 'from-amber-500/10 to-transparent border-amber-500/20',
      text: 'text-amber-400',
      bgGlow: 'bg-amber-600/10 border-amber-500/20',
      btn: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/20',
      icon: <ScanText className="w-8 h-8 text-amber-400" />
    },
    emerald: {
      accent: 'from-emerald-500/10 to-transparent border-emerald-500/20',
      text: 'text-emerald-400',
      bgGlow: 'bg-emerald-600/10 border-emerald-500/20',
      btn: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20',
      icon: <Wallet className="w-8 h-8 text-emerald-400" />
    },
    zinc: {
      accent: 'from-zinc-500/10 to-transparent border-zinc-500/20',
      text: 'text-zinc-400',
      bgGlow: 'bg-zinc-800/20 border-zinc-700/20',
      btn: 'bg-zinc-800 hover:bg-zinc-700 text-white shadow-zinc-800/20',
      icon: <Bot className="w-8 h-8 text-zinc-400" />
    }
  }[themeColor]

  const handleFreeDemo = async () => {
    setAuthLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please login to launch the demo assistant")
        router.push(`/login?redirect=${encodeURIComponent(`/marketplace/${service.slug}`)}`)
        return
      }
      setIsModalOpen(true)
    } catch (err) {
      console.error(err)
      toast.error("An error occurred. Please try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleTrial = async () => {
    setAuthLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please login to start the trial")
        router.push(`/login?redirect=${encodeURIComponent(`/marketplace/${service.slug}`)}`)
        return
      }
      router.push('/dashboard/onboarding?plan=trial')
    } catch (err) {
      console.error(err)
      toast.error("An error occurred. Please try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080010] text-zinc-100 selection:bg-violet-500/30 relative">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Quick Setup Modal */}
      <QuickSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isDemo={true} />

      {/* Main Layout Grid */}
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Product Details */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Hero Section */}
          <div className={`bg-zinc-950/60 border rounded-3xl p-8 relative overflow-hidden bg-gradient-to-br ${themeStyles.accent}`}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${themeStyles.bgGlow}`}>
                  {themeStyles.icon}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white leading-tight">{service.name}</h1>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest border ${
                    service.is_active 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}>
                    {service.is_active ? 'Live' : 'In Development'}
                  </span>
                </div>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed">{tagline}</p>
            </div>
          </div>

          {/* Description / Features */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" /> Core Capabilities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature: string, idx: number) => (
                <div key={idx} className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <span className="text-xs text-zinc-300 font-medium leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">How It Works</h2>
            <div className="space-y-3">
              {howItWorks.map((step: string, idx: number) => (
                <div key={idx} className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {idx + 1}
                  </div>
                  <span className="text-xs text-zinc-400 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Use Cases */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Target Use Cases</h2>
            <ul className="space-y-2.5">
              {useCases.map((useCase: string, idx: number) => (
                <li key={idx} className="flex items-center gap-3 text-xs text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  {useCase}
                </li>
              ))}
            </ul>
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-violet-400" /> Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq: { q: string; a: string }, idx: number) => (
                <div key={idx} className="border border-zinc-900 rounded-2xl bg-zinc-950/30 overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-xs font-bold text-white hover:bg-zinc-900/40 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {activeFaq === idx && (
                    <div className="px-5 pb-5 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900/20 bg-zinc-950/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Pricing Sidebar */}
        <div className="space-y-6">
          
          {/* Main Action Card */}
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 space-y-6 shadow-xl sticky top-8">
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">Choose Gateway Plan</h3>
              <p className="text-zinc-500 text-xs">Deploy the assistant under your chosen gateway tier.</p>
            </div>

            <div className="space-y-4 border-t border-zinc-900 pt-4">
              
              {/* Free Demo Details */}
              <div className="border border-zinc-900 rounded-2xl p-4 bg-zinc-950/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-300">Free Call Sandbox</span>
                  <span className="text-xs font-black text-emerald-400">FREE</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-zinc-500">
                  <li className="flex items-center gap-1.5"><Play className="w-3 h-3 text-violet-400" /> {freeDemoMinutes} sandbox call minutes</li>
                  <li className="flex items-center gap-1.5"><Play className="w-3 h-3 text-violet-400" /> Web-browser interface testing</li>
                </ul>
              </div>

              {/* Paid Trial Details */}
              <div className="border border-zinc-900 rounded-2xl p-4 bg-zinc-950/40 space-y-2 relative overflow-hidden">
                <div className="absolute right-[-24px] top-[-6px] rotate-[35deg] bg-amber-500 text-black text-[8px] font-black uppercase px-6 py-1 tracking-wider">
                  Trial
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-300">Production Trial</span>
                  <span className="text-xs font-black text-white">₹{trialPrice}</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-zinc-500">
                  <li className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-violet-400" /> {trialMinutes} voice production minutes</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-violet-400" /> Dedicated local phone number</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-violet-400" /> Full {trialDays} days platform access</li>
                </ul>
              </div>

            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <button
                onClick={handleFreeDemo}
                disabled={authLoading}
                className="w-full py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : (
                  <>
                    Start Free Demo
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </>
                )}
              </button>

              <button
                onClick={handleTrial}
                disabled={authLoading}
                className={`w-full py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${themeStyles.btn} disabled:opacity-50`}
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    Start ₹{trialPrice} Trial
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
