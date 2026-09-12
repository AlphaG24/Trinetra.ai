'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Phone, Zap, Loader2, Bot, Lock, X, Play, ShieldCheck, 
  CheckCircle2, ChevronRight, HelpCircle, Video, Image as ImageIcon, 
  Activity, Radio, Sparkles, Volume2, Mic, Terminal, ExternalLink, Calendar 
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  FeaturesSection,
  WorkflowPipelineSection,
  UseCasesSection,
  DeveloperHubSection,
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
  const [activeTab, setActiveTab] = useState<'workflow' | 'features' | 'cases' | 'dev' | 'faq'>('workflow')

  const meta = tool.marketplace_metadata || {}
  const tagline = meta.tagline || tool.description || 'Pre-configured autonomous AI voice agent with real-time reasoning and calendar automation.'
  const features = meta.features || [
    'Sub-450ms Realtime Voice Reasoning',
    'Autonomous Cal.com & Google Calendar Booking',
    'Post-Call WhatsApp & SMS Summary Dispatch',
    'Human Barge-in & Interruption Recovery',
    'Dynamic CRM Webhook Sync',
    'Multi-accent Natural Speech Synthesis'
  ]
  const howItWorks = meta.how_it_works || []
  const useCases = meta.use_cases || [
    'Medical Clinic & Doctor Appointments',
    'Real Estate Property Inquiries & Tours',
    'Salon, Spa & Wellness Scheduling',
    'Executive Consultation Bookings',
    'Inbound Customer Support & Triage'
  ]
  const faqs = meta.faq || []
  const videoUrl = meta.video_url || ''
  const previewImageUrl = meta.preview_image_url || tool.icon_url || ''
  const adminCustomPrice = meta.price || null

  // Helper to transform viewer URLs (postimg.cc, imgur, Google Drive) to direct image files
  function formatDirectImageUrl(url: string): string {
    if (!url) return ''
    let cleaned = url.trim()

    // postimg.cc/KEY or postimg.cc/KEY/image.png
    const postImgMatch = cleaned.match(/https?:\/\/(?:www\.)?postimg\.cc\/([a-zA-Z0-9_-]+)/)
    if (postImgMatch) {
      return `https://i.postimg.cc/${postImgMatch[1]}/image.png`
    }

    // imgur.com/KEY
    const imgurMatch = cleaned.match(/https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)$/)
    if (imgurMatch) {
      return `https://i.imgur.com/${imgurMatch[1]}.png`
    }

    // Google Drive file
    const gdriveMatch = cleaned.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (gdriveMatch) {
      return `https://drive.google.com/uc?export=view&id=${gdriveMatch[1]}`
    }

    return cleaned
  }

  const directImageUrl = formatDirectImageUrl(previewImageUrl)
  const [imageFailed, setImageFailed] = useState(false)

  // Screen display modes: 'video' | 'image' | 'simulator'
  const initialMode = videoUrl ? 'video' : previewImageUrl ? 'image' : 'simulator'
  const [screenMode, setScreenMode] = useState<'video' | 'image' | 'simulator'>(initialMode)

  // Convert YouTube / Loom watch URL to embed URL
  function getYouTubeEmbedUrl(url: string): string | null {
    if (!url) return null
    try {
      const shortMatch = url.match(/youtu\.be\/([\w-]+)/)
      if (shortMatch) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}`
      const longMatch = url.match(/[?&]v=([\w-]+)/)
      if (longMatch) return `https://www.youtube-nocookie.com/embed/${longMatch[1]}`
      if (url.includes('/embed/')) return url
      if (url.includes('loom.com/share/')) return url.replace('/share/', '/embed/')
      return url
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
    <div className="max-w-7xl mx-auto space-y-12 text-left pb-24 px-4 sm:px-6 font-montserrat relative">
      {/* Ambient background glow effects (monochrome luxury) */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-[500px] h-[300px] bg-white/[0.01] rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer group px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-zinc-700 dark:text-zinc-300" />
          <span>Marketplace</span>
          <span className="text-zinc-400 dark:text-zinc-600">/</span>
          <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{tool.name}</span>
        </Link>

        {/* Global capabilities ticker */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>RUNTIME ONLINE</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 font-bold">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>&lt;450ms Latency</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 font-bold">
            <Calendar className="w-3 h-3" />
            <span>Cal.com Synced</span>
          </div>
        </div>
      </div>

      {/* Hero Headline & Identity Banner */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/15 rounded-lg shadow-sm font-mono flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            <span>{tool.type.toUpperCase()} COGNITIVE AGENT</span>
          </span>

          {adminCustomPrice && (
            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-lg shadow-sm font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>OFFICIAL PRICE: {adminCustomPrice}</span>
            </span>
          )}

          {tool.is_active ? (
            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 rounded-lg font-mono">
              PRODUCTION READY
            </span>
          ) : (
            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 rounded-lg font-mono">
              DEVELOPMENT BETA
            </span>
          )}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-zinc-900 dark:text-white tracking-tight leading-[1.15]">
          {tool.name}
        </h1>

        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-3xl font-normal">
          {tagline}
        </p>
      </div>

      {/* Main Two-Column Cockpit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column (65%): Tabbed Deep Dive Cockpit */}
        <div className="lg:col-span-7 space-y-8">
          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200/90 dark:border-white/10 rounded-2xl overflow-x-auto no-scrollbar backdrop-blur-xl">
            {[
              { key: 'workflow', label: 'Architecture & Pipeline', icon: Activity },
              { key: 'features', label: 'Capabilities', icon: Sparkles },
              { key: 'cases', label: 'Use Cases', icon: CheckCircle2 },
              { key: 'dev', label: 'Developer & APIs', icon: Terminal },
              { key: 'faq', label: 'FAQs', icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm border border-zinc-900 dark:border-white font-black'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05] font-semibold'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'}`} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content Display */}
          <div className="space-y-8 animate-in fade-in duration-300">
            {activeTab === 'workflow' && (
              <div className="space-y-8">
                {/* Overview Box */}
                <div className="bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold tracking-widest text-zinc-700 dark:text-zinc-300 uppercase font-mono">
                    AGENT SPECIFICATION & SCOPE
                  </h3>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap font-normal">
                    {tool.description || 'Pre-configured autonomous Business AI agent designed for rapid deployment across phone lines and web channels.'}
                  </p>

                  <div className="pt-4 border-t border-zinc-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">LLM BACKBONE</span>
                      <span className="font-bold text-zinc-900 dark:text-white">Gemini 2.5 Flash</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">AUDIO ENGINE</span>
                      <span className="font-bold text-zinc-900 dark:text-white">LiveKit WebRTC + VAD</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">SCHEDULING SYNC</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Cal.com Realtime</span>
                    </div>
                  </div>
                </div>

                {/* Workflow pipeline */}
                <WorkflowPipelineSection steps={howItWorks} toolName={tool.name} />
              </div>
            )}

            {activeTab === 'features' && (
              <FeaturesSection features={features} />
            )}

            {activeTab === 'cases' && (
              <UseCasesSection useCases={useCases} />
            )}

            {activeTab === 'dev' && (
              <DeveloperHubSection agentSlug={tool.slug} />
            )}

            {activeTab === 'faq' && (
              <FAQSection faqs={faqs} />
            )}
          </div>
        </div>

        {/* Right Column (35%): Sticky Interactive Screen & Action Station */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-[90px]">
          
          {/* 1. Device Hardware Frame ("The Small Screen") */}
          <div className="bg-[#0a0a0c] border border-zinc-800 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/40 relative">
            
            {/* Window Titlebar & Mode Switcher */}
            <div className="bg-black/60 border-b border-white/10 px-4 py-3 flex items-center justify-between">
              {/* Traffic light dots */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <span className="text-[10px] font-mono text-zinc-400 ml-2 font-bold tracking-wider">
                  AGENT PREVIEW SCREEN
                </span>
              </div>

              {/* View Switcher Pills */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                {embedUrl && (
                  <button
                    onClick={() => setScreenMode('video')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                      screenMode === 'video' 
                        ? 'bg-white/20 text-white shadow-sm border border-white/10' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Video</span>
                  </button>
                )}

                {directImageUrl && (
                  <button
                    onClick={() => {
                      setScreenMode('image')
                      setImageFailed(false)
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                      screenMode === 'image' 
                        ? 'bg-white/20 text-white shadow-sm border border-white/10' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>Image</span>
                  </button>
                )}

                <button
                  onClick={() => setScreenMode('simulator')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                    screenMode === 'simulator' 
                      ? 'bg-white/20 text-white shadow-sm border border-white/10' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>Simulator</span>
                </button>
              </div>
            </div>

            {/* Screen Content Render */}
            <div className="relative bg-black">
              {/* VIDEO MODE */}
              {screenMode === 'video' && embedUrl && (
                <div className="relative w-full aspect-video bg-black">
                  <iframe
                    src={`${embedUrl}?modestbranding=1&rel=0&showinfo=0&autoplay=0`}
                    title={`${tool.name} setup demonstration`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {/* IMAGE MODE (Full Cover, No Black Gaps) */}
              {screenMode === 'image' && directImageUrl && (
                <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group">
                  {imageFailed ? (
                    <div className="text-center p-6 space-y-2">
                      <ImageIcon className="w-8 h-8 text-zinc-500 mx-auto opacity-50" />
                      <p className="text-xs text-zinc-300 font-mono">Image link provided</p>
                      <a
                        href={previewImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white font-bold underline"
                      >
                        Open Image in New Tab <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <>
                      <img
                        src={directImageUrl}
                        alt={`${tool.name} Setup Blueprint`}
                        referrerPolicy="no-referrer"
                        onError={() => setImageFailed(true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3 text-zinc-400" />
                        <span>Agent Architecture Blueprint</span>
                      </div>
                      <a
                        href={directImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white/80 hover:text-white border border-white/15 transition opacity-0 group-hover:opacity-100"
                        title="Open Full Size"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                </div>
              )}

              {/* SIMULATOR MODE (Always functional default) */}
              {screenMode === 'simulator' && (
                <div className="w-full aspect-video bg-gradient-to-b from-[#141416] to-[#0a0a0c] p-5 flex flex-col justify-between relative overflow-hidden">
                  {/* Subtle oscilloscope grid background */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                  {/* Top status */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        LIVE CALL PIPELINE
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      320ms Latency
                    </span>
                  </div>

                  {/* Simulated Audio Visualizer Waveform */}
                  <div className="relative z-10 my-auto py-2">
                    <div className="flex items-center justify-center gap-1.5 h-12">
                      {[40, 85, 60, 95, 45, 75, 100, 70, 50, 90, 65, 80, 45, 95, 60, 40].map((height, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-gradient-to-t from-zinc-500 to-white rounded-full animate-pulse"
                          style={{
                            height: `${height}%`,
                            animationDelay: `${i * 0.08}s`,
                            animationDuration: '1.2s'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Dialogue Ticker Simulation */}
                  <div className="relative z-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-2.5 space-y-1 text-left">
                    <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-zinc-400" />
                      <span>Simulated Realtime Call Flow:</span>
                    </div>
                    <p className="text-[11px] text-zinc-200 font-medium leading-snug">
                      &ldquo;Checking calendar for tomorrow... 3 PM is open! I&apos;ve reserved it and sent a confirmation to your phone.&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Action & Commercial Station */}
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl shadow-zinc-950/5 relative">
            
            {/* Price Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-300 font-mono">
                  ACTIVATE ASSISTANT
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  INSTANT ROUTING
                </span>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-zinc-900 dark:text-white font-mono">
                  ₹{trialPrice.toFixed(0)}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  / 7-Day Production Trial
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
                Connect your business number or receive a dedicated phone line with full Cal.com sync.
              </p>
            </div>

            {/* Industry Preset Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-mono block">
                Select Industry Template
              </label>
              <select
                value={industryTemplate}
                onChange={(e) => setIndustryTemplate(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-50 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 dark:focus:border-white/40 transition cursor-pointer shadow-sm"
              >
                <option value="">General / Custom Voice (Default)</option>
                <option value="healthcare">Healthcare & Dental Appointments</option>
                <option value="real_estate">Real Estate & Property Inquiries</option>
                <option value="education">Education & Course Admissions</option>
                <option value="ecommerce">E-Commerce Customer Support</option>
                <option value="banking_insurance">Finance & Insurance Advisory</option>
              </select>
            </div>

            {/* Dual CTA Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleStartTrial}
                disabled={demoLoading || trialLoading}
                className="btn-luxury-animated group w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-lg hover:scale-[1.01]"
              >
                {trialLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span className="font-extrabold tracking-widest text-white">Start Production Trial (₹{trialPrice.toFixed(0)})</span>
                    <span className="text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200">→</span>
                  </>
                )}
              </button>

              <button
                onClick={handleStartDemo}
                disabled={demoLoading || trialLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border border-zinc-300 dark:border-white/15 bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {demoLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-800 dark:text-zinc-200" />
                ) : (
                  <span>Try Free Browser Demo ({freeDemoMinsLimit} Mins)</span>
                )}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero Setup Fee
              </span>
              <span>Cancel Subscription Anytime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Pricing Comparison at Bottom */}
      <div className="pt-12 border-t border-zinc-200 dark:border-white/10">
        <PricingSection 
          config={config} 
          agentType={tool.type} 
          agentSlug={tool.slug} 
          adminPrice={adminCustomPrice}
          onStartDemo={handleStartDemo} 
        />
      </div>

      {/* Upgrade Limit Reached Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-left">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Demo Limit Reached</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              You have exhausted your free demo limit of {freeDemoMinsLimit} minutes for this agent. Upgrade your subscription to continue usage or deploy to production.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider transition cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push('/dashboard/billing')}
                className="btn-luxury-animated flex-1 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer text-center"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Blocked Modal */}
      {blockedMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setBlockedMessage(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
              <Lock className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
              Action Blocked
            </h2>
            
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8 max-w-xs mx-auto">
              {blockedMessage}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => setBlockedMessage(null)}
                className="px-6 py-3 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setBlockedMessage(null)
                  router.push('/dashboard/billing')
                }}
                className="btn-luxury-animated px-6 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
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
