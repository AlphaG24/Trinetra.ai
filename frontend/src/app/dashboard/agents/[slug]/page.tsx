import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Check, ShieldAlert, ArrowLeft, Bot, Sparkles, Zap } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { AgentDetailPageClient } from './AgentDetailPageClient'
import { MarketplaceIcon } from './MarketplaceIcon'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ToolOrAgentPage({ params }: PageProps) {
  const { slug } = await params
  
  const supabase = await createClient()
  
  // 1. Fetch from platform_services using the slug
  const { data: tool } = await supabase
    .from('platform_services')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  // 2. If it's not a marketplace tool, render the client-side Agent Detail console
  if (!tool) {
    return <AgentDetailPageClient />
  }

  // Parse marketplace metadata
  const metadata = tool.marketplace_metadata || {}
  const tagline = metadata.tagline || tool.description || 'Enterprise ready autonomous AI service.'
  const features = metadata.features || []
  const pricingTiers = metadata.pricing_tiers || []

  // CTA States
  // State 1: Active & Demo Allowed -> Primary Button routing to workspace
  // State 2: Inactive -> Disabled warning button
  // State 3: Active & Demo Disallowed -> Upgrade or Contact Sales button
  const isActive = tool.is_active
  const isDemoAllowed = tool.is_demo_allowed

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-deep)] to-[var(--bg-primary)] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Back Button */}
        <div>
          <Link 
            href="/dashboard/agents" 
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Link>
        </div>

        {/* Hero Section */}
        <div className="relative border border-[var(--border-medium)] rounded-3xl p-8 md:p-12 overflow-hidden bg-[var(--bg-surface)]/40 backdrop-blur-sm shadow-2xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-[var(--violet-600)]/10 to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-[var(--gold-600)]/5 to-transparent blur-2xl rounded-full -z-10 pointer-events-none" />

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            {/* Tool Icon with client-side fallback */}
            <div className="relative group">
              <div className="absolute inset-0 bg-[var(--violet-500)]/20 rounded-2xl blur-md group-hover:blur-lg opacity-70 transition-all pointer-events-none" />
              <MarketplaceIcon iconUrl={tool.icon_url} type={tool.type} name={tool.name} className="w-24 h-24 relative z-10" />
            </div>

            {/* Title / Header */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[var(--violet-600)]/15 border border-[var(--violet-500)]/30 text-[var(--violet-300)]">
                  {tool.type} Agent
                </span>
                {isActive ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400">
                    Maintenance
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-heading">
                {tool.name}
              </h1>
              
              <p className="text-lg text-[var(--text-secondary)] font-medium leading-relaxed max-w-3xl">
                {tagline}
              </p>
            </div>

            {/* CTA Button Block */}
            <div className="w-full md:w-auto min-w-[200px] flex flex-col gap-3">
              {!isActive ? (
                <button
                  disabled
                  className="w-full py-4 px-6 rounded-xl text-sm font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-not-allowed text-center transition-all"
                >
                  Down for Maintenance
                </button>
              ) : isDemoAllowed ? (
                <Link
                  href={`/dashboard/agents/${slug}/workspace`}
                  className="w-full py-4 px-6 rounded-xl text-sm font-bold uppercase tracking-wider bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/30 hover:border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] text-center transition-all inline-block hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Free Demo
                </Link>
              ) : (
                <Link
                  href="/contact"
                  className="w-full py-4 px-6 rounded-xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-[var(--gold-600)] to-[var(--gold-500)] text-zinc-950 hover:from-[var(--gold-500)] hover:to-[var(--gold-400)] shadow-lg shadow-[var(--gold-600)]/20 text-center font-heading transition-all inline-block hover:scale-[1.02] active:scale-[0.98]"
                >
                  Contact Sales to Access
                </Link>
              )}
              
              {isActive && isDemoAllowed && (
                <p className="text-[10px] text-[var(--text-tertiary)] text-center">
                  Instant deployment — No credit card required
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Features Checklist */}
        {features.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--gold-400)]" /> Powerful Capabilities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature: string, index: number) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/20 hover:bg-[var(--bg-surface)]/40 transition-colors"
                >
                  <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{feature}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Tiers Section / Fallback Sales Block */}
        <div className="space-y-6 pt-6">
          {pricingTiers && pricingTiers.length > 0 ? (
            <>
              <div className="text-center md:text-left space-y-2">
                <h2 className="text-2xl font-bold font-heading text-white flex items-center justify-center md:justify-start gap-2">
                  <Zap className="w-5 h-5 text-[var(--violet-400)]" /> Simple, Transparent Pricing
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">Choose a plan tailored to your operation scale</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pricingTiers.map((tier: { name: string; price: number; limit: string }, index: number) => {
                  const isPopular = tier.name.toLowerCase() === 'growth' || tier.name.toLowerCase() === 'enterprise' || index === 1
                  return (
                    <Card 
                      key={index} 
                      className={`relative overflow-hidden flex flex-col justify-between ${
                        isPopular 
                          ? 'border-[var(--violet-500)] bg-[var(--bg-surface)]/60 shadow-[var(--violet-500)]/5 shadow-xl' 
                          : 'border-[var(--border-medium)]'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-[var(--violet-600)] to-[var(--violet-500)] text-[9px] font-extrabold uppercase tracking-wider text-white rounded-bl-lg font-heading">
                          Recommended
                        </div>
                      )}
                      
                      <CardHeader className="space-y-2">
                        <CardTitle className="text-lg font-bold font-heading uppercase text-zinc-300">{tier.name}</CardTitle>
                        <div className="flex items-baseline gap-1 py-2">
                          <span className="text-3xl font-extrabold text-white font-heading">${tier.price}</span>
                          <span className="text-xs text-[var(--text-secondary)]">/mo</span>
                        </div>
                        <CardDescription className="text-xs">{tier.limit || 'Includes standard platform SLA.'}</CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-3 flex-grow pt-4 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Self-healing diagnostics</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>24/7 autonomous uptime</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>99.9% voice/API availability</span>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-4 border-t border-[var(--border-subtle)] bg-white/[0.01]">
                        {isActive && isDemoAllowed ? (
                          <Link
                            href={`/dashboard/agents/${slug}/workspace`}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center transition-all ${
                              isPopular
                                ? 'bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/30 hover:border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                                : 'bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            Select {tier.name}
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-zinc-800/40 text-zinc-500 cursor-not-allowed border border-zinc-800/50"
                          >
                            {!isActive ? 'Unavailable' : 'Enterprise SLA'}
                          </button>
                        )}
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="max-w-2xl mx-auto">
              <Card className="border-[var(--border-medium)] bg-[var(--bg-surface)]/40 backdrop-blur-sm relative overflow-hidden p-6 md:p-8 text-center flex flex-col items-center justify-center gap-4">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--violet-600)]/5 to-transparent pointer-events-none" />
                <CardHeader className="space-y-2 p-0">
                  <CardTitle className="text-2xl font-bold font-heading text-white">Custom Enterprise Provisioning</CardTitle>
                  <CardDescription className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                    This autonomous agent requires custom configuration for your business subdomains. Contact our deployment team for volume pricing and integration details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 mt-2">
                  <Link
                    href="/dashboard/support"
                    className="inline-block py-3 px-8 rounded-xl text-sm font-bold uppercase tracking-wider bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/30 hover:border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Contact Sales to Deploy
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
