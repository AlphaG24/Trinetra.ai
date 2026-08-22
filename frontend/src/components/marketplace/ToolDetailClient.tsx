'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Zap, Loader2, Bot, Lock, X, Play, ShieldCheck, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import {
  FeaturesSection,
  HowItWorksSection,
  UseCasesSection,
  PricingSection,
  FAQSection,
} from './ToolDetailSections'

interface ToolDetailClientProps {
  tool: {
    id: string
    name: string
    slug: string
    description: string | null
    type: string
    icon_url: string | null
    is_active: boolean
    demo_limit_config: any
    marketplace_metadata: any
  }
  profile: any
  config: Record<string, string>
  agents?: any[]
}

export function ToolDetailClient({ tool, profile, config, agents }: ToolDetailClientProps) {
  const router = useRouter()
  const [demoLoading, setDemoLoading] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const [industryTemplate, setIndustryTemplate] = useState('')

  const meta = tool.marketplace_metadata || {}
  const tagline = meta.tagline || tool.description || 'Pre-configured autonomous AI voice agent.'
  const features = meta.features || []
  const howItWorks = meta.how_it_works || []
  const useCases = meta.use_cases || []
  const faqs = meta.faq || []
  const videoUrl = meta.video_url || ''

  // Convert YouTube watch URL to embed URL
  function getYouTubeEmbedUrl(url: string): string | null {
    if (!url) return null
    try {
      // Handle youtu.be short links
      const shortMatch = url.match(/youtu\.be\/([\w-]+)/)
      if (shortMatch) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}`
      // Handle full youtube.com/watch?v= URLs
      const longMatch = url.match(/[?&]v=([\w-]+)/)
      if (longMatch) return `https://www.youtube-nocookie.com/embed/${longMatch[1]}`
      // Handle youtube.com/embed/ URLs directly
      if (url.includes('/embed/')) return url
    } catch (_) {}
    return null
  }

  const embedUrl = getYouTubeEmbedUrl(videoUrl)

  // Resolve config variables
  const freeDemoMinsLimit = parseInt(config.free_demo_minutes || '10', 10)
  const trialPrice = parseInt(config.trial_price_paisa || '9900', 10) / 100

  // Start Free Demo Logic
  const handleStartDemo = async () => {
    if (!profile) {
      toast.error('Unable to verify user profile.')
      return
    }

    const existingAgent = agents?.find(a => a.product_id === tool.id || a.agent_type === tool.slug)
    if (existingAgent) {
      toast.success(`Opening demo workspace for ${tool.name}...`)
      router.push(`/dashboard/agents/${existingAgent.id}`)
      return
    }

    if (!profile?.onboarding_complete) {
      router.push('/dashboard/onboarding')
      return
    }

    setDemoLoading(true)

    try {
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: tool.slug,
          name: `${tool.name} - Demo`,
          user_id: profile.id,
          is_demo: true,
          industry_template: industryTemplate || undefined
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create agent')

      const agentId = data.agent?.id || data.id
      toast.success('Demo agent provisioned successfully!')
      router.push(`/dashboard/agents/${agentId}`)
    } catch (err: any) {
      const errorMsg = err.message || 'Error occurred while initializing demo.'
      if (errorMsg.includes("reached the maximum number") || errorMsg.includes("Agent limit reached") || errorMsg.includes("limit") || errorMsg.includes("demo per agent")) {
        setBlockedMessage(errorMsg)
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setDemoLoading(false)
    }
  }

  // Start Trial Logic
  const handleStartTrial = async () => {
    if (!profile) {
      toast.error('Unable to verify user profile.')
      return
    }

    const existingAgent = agents?.find(a => a.product_id === tool.id || a.agent_type === tool.slug)
    if (existingAgent) {
      toast.success(`Opening workspace for ${tool.name}...`)
      router.push(`/dashboard/agents/${existingAgent.id}`)
      return
    }

    router.push(`/dashboard/checkout?plan=trial&agent=${tool.slug}&agentName=${encodeURIComponent(tool.name)}&industry_template=${industryTemplate}`)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 text-left pb-24 px-4 font-montserrat">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--heading)] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>

      {/* Main Two-Column Layout — Hero section only */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        
        {/* Left Column: Agent identity */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/25 rounded-md">
                {tool.type} Agent
              </span>
              {tool.is_active ? (
                <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-md">
                  Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-md">
                  Coming Soon
                </span>
              )}
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--heading)] tracking-tight leading-tight" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
              {tool.name}
            </h1>
            
            <p className="text-sm text-[var(--muted)] font-merriweather leading-relaxed max-w-xl">
              {tagline}
            </p>
          </div>

          <hr className="border-[var(--border)]" />

          {/* Overview */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[var(--heading)] uppercase tracking-wider text-violet-400">Overview</h2>
            <p className="text-xs sm:text-sm text-[var(--body)] font-merriweather leading-relaxed whitespace-pre-wrap">
              {tool.description || 'Pre-configured autonomous Business AI agent designed for quick setup and deployment.'}
            </p>
          </div>
        </div>

        {/* Right Column: Sticky Sidebar Card */}
        <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-[100px]">
          
          {/* Branded Media Preview & Checkout Card */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl">
            {/* Visual Frame — YouTube embed or fallback bot UI */}
            {embedUrl ? (
              <div className="relative w-full" style={{ paddingTop: '56.25%' /* 16:9 */ }}>
                <iframe
                  src={`${embedUrl}?modestbranding=1&rel=0&showinfo=0`}
                  title={`${tool.name} demo video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full rounded-t-2xl border-b border-[var(--border)]"
                  style={{ border: 0 }}
                />
              </div>
            ) : (
              <div className="h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 border-b border-[var(--border)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="relative z-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-black/40 border border-zinc-700 rounded-2xl flex items-center justify-center text-zinc-300 mx-auto shadow-lg">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white font-mono">Trinetra Voice Interface</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      System Ready
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Price Details / Action Panel */}
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--heading)]">Activate AI Assistant</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Start call routing immediately on your own numbers or use our pre-provisioned demo line.
                </p>
              </div>

              {/* Industry Template Selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-montserrat">
                  Select Industry Template
                </label>
                <select
                  value={industryTemplate}
                  onChange={(e) => setIndustryTemplate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-white focus:outline-none focus:border-violet-550 transition cursor-pointer"
                >
                  <option value="">General / Custom (Default)</option>
                  <option value="real_estate">Real Estate Agent</option>
                  <option value="healthcare">Healthcare Clinic Assistant</option>
                  <option value="education">Education Admission Assistant</option>
                  <option value="ecommerce">E-commerce Support Assistant</option>
                  <option value="banking_insurance">Banking & Insurance Assistant</option>
                </select>
              </div>

              {/* Checkout actions */}
              <div className="space-y-3">
                <button
                  onClick={handleStartDemo}
                  disabled={demoLoading || trialLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-violet-500/35 text-violet-400 hover:bg-violet-500/10 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {demoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                  <span>Try Free Demo ({freeDemoMinsLimit} mins)</span>
                </button>

                <button
                  onClick={handleStartTrial}
                  disabled={demoLoading || trialLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-550 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md hover:scale-[1.01]"
                >
                  {trialLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-300" />}
                  <span>Start Trial for ₹{trialPrice.toFixed(0)}</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure payment
                </span>
                <span>Cancel subscription anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width content sections below the hero */}
      <div className="space-y-10">
        {/* Core Features */}
        <FeaturesSection features={features} />

        {/* Ideal Use Cases */}
        <UseCasesSection useCases={useCases} />

        {/* How It Works */}
        <HowItWorksSection steps={howItWorks} />

        {/* Documentation Links */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider">Developer Resources & Docs</h3>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Integrate this agent via Webhooks, API interfaces, or connect custom CRMs to sync customer details dynamically.
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-violet-400">
            <Link href="/docs/api" className="hover:underline flex items-center gap-1">
              API Reference <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/docs/webhooks" className="hover:underline flex items-center gap-1">
              Webhook Setup <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/docs/guides" className="hover:underline flex items-center gap-1">
              Integration Guide <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* FAQ Accordion */}
        <FAQSection faqs={faqs} />
      </div>

      <hr className="border-[var(--border)] my-12" />

      {/* Bottom Section: Pricing comparison */}
      <div className="space-y-6">
        <div className="text-center max-w-md mx-auto space-y-2">
          <h2 className="text-xl font-bold font-display text-[var(--heading)]">Flexible Plans for Every Stage</h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Choose the best plan option when activating your assistant permanently. Add slots at any time.
          </p>
        </div>
        <PricingSection config={config} agentType={tool.type} agentSlug={tool.slug} onStartDemo={handleStartDemo} />
      </div>

      {/* Upgrade Limit Reached Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 text-left">
            <h2 className="text-lg font-bold font-display text-[var(--heading)]">Demo Limit Reached</h2>
            <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">
              You have exhausted your free demo limit of {freeDemoMinsLimit} minutes for this agent. Upgrade your subscription to continue usage or deploy to production.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] bg-transparent text-[var(--body)] hover:text-[var(--heading)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push('/dashboard/billing')}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Limit Reached / Demo Reuse Modal */}
      {blockedMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 font-montserrat">
            <button 
              onClick={() => setBlockedMessage(null)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--heading)] transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
              <Lock className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-black text-[var(--heading)] uppercase tracking-wider mb-3">
              Action Blocked
            </h2>
            
            <p className="text-sm text-[var(--body)] leading-relaxed mb-8 max-w-xs mx-auto">
              {blockedMessage}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => setBlockedMessage(null)}
                className="px-6 py-3 bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--body)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer animate-in"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setBlockedMessage(null)
                  router.push('/dashboard/billing')
                }}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer animate-in"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
