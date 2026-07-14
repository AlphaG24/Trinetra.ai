import React from 'react'
import { DeployButton } from './DeployButton'
import { Sparkles, Check, DollarSign, Cpu, MessageSquare, Zap, Activity } from 'lucide-react'

interface MarketplaceCardProps {
  tool: any
}

export function MarketplaceCard({ tool }: MarketplaceCardProps) {
  const metadata = tool.marketplace_metadata || {}
  const tagline = metadata.tagline || 'Enterprise ready autonomous AI capability.'
  const features = metadata.features || []
  const pricingTiers = metadata.pricing_tiers || []

  // Helper to resolve an icon based on tool type or slug
  const getToolIcon = () => {
    if (tool.icon_url) {
      return (
        <img
          src={tool.icon_url}
          alt={tool.name}
          className="w-12 h-12 rounded-xl object-cover border border-zinc-800"
        />
      )
    }

    const type = (tool.type || '').toLowerCase()
    if (type.includes('voice') || tool.slug.includes('voice')) {
      return <MessageSquare className="w-6 h-6 text-orange-500" />
    }
    if (type.includes('data') || tool.slug.includes('structurer')) {
      return <Cpu className="w-6 h-6 text-orange-500" />
    }
    return <Zap className="w-6 h-6 text-orange-500" />
  }

  return (
    <div className="group relative bg-[#0c0c12] border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 overflow-hidden min-h-[380px]">
      {/* Visual Glowing Accent on Hover */}
      <div className="absolute -top-12 -left-12 w-28 h-28 bg-gradient-to-br from-zinc-800/10 to-transparent blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="space-y-5 relative z-10">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-center">
            {getToolIcon()}
          </div>
 
          <div className="flex items-center gap-2">
            {/* Tool Category Badge */}
            <span className="px-2.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase border border-zinc-800 bg-zinc-900/60 text-zinc-400">
              {tool.type || 'AI Service'}
            </span>
 
            {/* Active Status Badge */}
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
        </div>
 
        {/* Title, Tagline & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-white group-hover:text-zinc-200 transition-colors duration-200">
            {tool.name}
          </h3>
          {tagline && (
            <p className="text-xs text-orange-400/90 font-medium tracking-wide">
              {tagline}
            </p>
          )}
          <p className="text-xs text-zinc-400 leading-relaxed pt-1 line-clamp-3">
            {tool.description || 'Seamlessly automate operations with this advanced cognitive workload module.'}
          </p>
        </div>

        {/* Features Checklist */}
        {features.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-zinc-800/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Core Features</span>
            <ul className="grid grid-cols-1 gap-1.5">
              {features.slice(0, 4).map((feature: string, index: number) => (
                <li key={index} className="flex items-center gap-2 text-xs text-zinc-300">
                  <div className="p-0.5 bg-orange-500/10 border border-orange-500/20 rounded-md text-orange-500">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="truncate">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pricing Tiers Showcase */}
        {pricingTiers.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-zinc-800/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Available Pricing Plans</span>
            <div className="flex flex-col gap-1.5">
              {pricingTiers.slice(0, 2).map((tier: any, index: number) => {
                const priceLabel = typeof tier.price === 'number' ? `$${tier.price}` : tier.price
                return (
                  <div key={index} className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-lg p-2 text-xs">
                    <span className="text-zinc-300 font-medium">{tier.name || tier.tier_name}</span>
                    <span className="text-white font-bold text-[11px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                      {priceLabel}{tier.frequency ? `/${tier.frequency}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Deploy Button Container */}
      <div className="border-t border-zinc-800/50 pt-4 mt-6">
        <DeployButton slug={tool.slug} subdomainUrl={tool.subdomain_url} />
      </div>
    </div>
  )
}
