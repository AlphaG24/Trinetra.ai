'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Bot, 
  Phone, 
  MessageSquare, 
  Share2, 
  Workflow, 
  Cpu, 
  FileText, 
  ArrowRight,
  ShieldAlert,
  Activity,
  Coins,
  Box
} from 'lucide-react'
import { PlatformService } from '@/types/supabase'

interface MarketplaceGridProps {
  tools: PlatformService[]
}

// Map service type to appropriate Lucide Icon and gradient theme
const getTypeIconAndStyle = (type: string) => {
  const normalized = type.toLowerCase()
  switch (normalized) {
    case 'voice':
      return {
        Icon: Phone,
        bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        glowClass: 'from-emerald-500/20 to-transparent',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      }
    case 'ocr':
      return {
        Icon: FileText,
        bgClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
        glowClass: 'from-cyan-500/20 to-transparent',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      }
    case 'chat':
      return {
        Icon: MessageSquare,
        bgClass: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
        glowClass: 'from-violet-500/20 to-transparent',
        badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      }
    case 'social':
      return {
        Icon: Share2,
        bgClass: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
        glowClass: 'from-pink-500/20 to-transparent',
        badgeClass: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      }
    case 'workflow':
      return {
        Icon: Workflow,
        bgClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        glowClass: 'from-amber-500/20 to-transparent',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      }
    default:
      return {
        Icon: Cpu,
        bgClass: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
        glowClass: 'from-zinc-500/20 to-transparent',
        badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
      }
  }
}

function ToolLogo({ iconUrl, name }: { iconUrl: string | null; name: string }) {
  const [imgError, setImgError] = useState(!iconUrl)

  if (imgError || !iconUrl) {
    return (
      <div className="w-12 h-12 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
        <Box className="w-6 h-6 text-zinc-400" />
      </div>
    )
  }

  return (
    <img
      src={iconUrl}
      alt={name}
      onError={() => setImgError(true)}
      className="w-12 h-12 rounded-md object-cover border border-zinc-850 shrink-0"
    />
  )
}

export function MarketplaceGrid({ tools }: MarketplaceGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('All')

  // Extract unique tool types dynamically from the database
  const availableTypes = ['All', ...Array.from(new Set(tools.map(tool => tool.type)))]

  // Filter tools based on selected type tab and search query
  const filteredTools = tools.filter(tool => {
    const matchesType = selectedType === 'All' || tool.type.toLowerCase() === selectedType.toLowerCase()
    
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tool.type.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesType && matchesSearch
  })

  // Framer Motion Animation Variants for the grid
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  }

  return (
    <div className="space-y-8 py-2">
      {/* Premium Header & Search Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 mb-3">
            <Box className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">Autonomous Business OS</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white font-heading">
            AI Tool Marketplace
          </h1>
          <p className="text-zinc-400 text-sm mt-2 max-w-xl">
            Browse and deploy production-grade self-healing AI agents and workflows directly into your subdomains.
          </p>
        </div>

        {/* Sleek Search Input */}
        <div className="relative max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--violet-500)]/10 to-[var(--gold-500)]/10 rounded-xl blur-md opacity-50" />
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search AI agents by name or capability..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-surface)]/80 border border-[var(--border-medium)] hover:border-[var(--border-active)]/50 focus:border-[var(--border-active)] rounded-xl pl-12 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--violet-500)]/30 transition-all backdrop-blur-md"
              suppressHydrationWarning={true}
            />
          </div>
        </div>
      </div>

      {/* Modern Sleek Tab/Pills Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {availableTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`relative px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              selectedType.toLowerCase() === type.toLowerCase()
                ? 'text-white'
                : 'text-[var(--text-secondary)] hover:text-white bg-white/5 border border-white/5 hover:bg-white/10'
            }`}
            suppressHydrationWarning={true}
          >
            {selectedType.toLowerCase() === type.toLowerCase() && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-gradient-to-r from-[var(--violet-600)] to-[var(--violet-500)] rounded-lg -z-10 shadow-lg shadow-[var(--violet-500)]/20"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{type}</span>
          </button>
        ))}
      </div>

      {/* Grid of Agent Cards */}
      <AnimatePresence mode="wait">
        {filteredTools.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="min-h-[300px] border border-dashed border-[var(--border-medium)] rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-surface)]/30 backdrop-blur-sm"
          >
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
              <ShieldAlert className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg font-heading">No Agent Tools Found</h3>
            <p className="text-[var(--text-secondary)] text-sm max-w-sm mt-2">
              We couldn't find any agent matching your criteria. Try widening your search or choosing a different filter.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTools.map((tool) => {
              const { Icon, bgClass, glowClass, badgeClass } = getTypeIconAndStyle(tool.type)
              const hasPricing = tool.marketplace_metadata?.pricing_tiers && tool.marketplace_metadata.pricing_tiers.length > 0
              const startingPrice = hasPricing ? tool.marketplace_metadata?.pricing_tiers?.[0]?.price : null

              return (
                <motion.div
                  key={tool.id}
                  variants={cardVariants}
                  layout
                  className="group relative bg-[var(--bg-surface)] border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 overflow-hidden min-h-[280px]"
                >
                  {/* Subtle Background Card Gradients */}
                  <div className={`absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br ${glowClass} blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none`} />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
                  
                  <div className="space-y-4 relative z-10">
                    {/* Top Row: Icon & Status Badge */}
                    <div className="flex items-center justify-between">
                      <ToolLogo iconUrl={tool.icon_url} name={tool.name} />

                      <div className="flex items-center gap-2">
                        {/* Type Badge */}
                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase border ${badgeClass}`}>
                          {tool.type}
                        </span>

                        {/* Status Badge */}
                        {tool.is_active ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase bg-red-500/10 border border-red-500/20 text-red-400">
                            Maintenance
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Tagline/Description */}
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-[var(--violet-300)] transition-colors duration-200 font-heading">
                        {tool.name}
                      </h3>
                      {tool.marketplace_metadata?.tagline && (
                        <p className="text-xs text-[var(--gold-400)]/90 font-medium mt-1">
                          {tool.marketplace_metadata.tagline}
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-3 leading-relaxed">
                        {tool.description || 'Enterprise ready autonomous capability.'}
                      </p>
                    </div>

                    {/* Features List Mini-tags */}
                    {tool.marketplace_metadata?.features && tool.marketplace_metadata.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {tool.marketplace_metadata.features.slice(0, 3).map((feat, idx) => (
                          <span key={idx} className="text-[10px] text-[var(--text-secondary)] bg-white/5 border border-white/[0.03] px-2 py-0.5 rounded">
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Actions & Pricing Footer */}
                  <div className="border-t border-[var(--border-subtle)] pt-4 mt-6 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1">
                      {startingPrice !== null ? (
                        <>
                          <Coins className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          <span className="text-xs text-[var(--text-secondary)]">From</span>
                          <span className="text-sm font-extrabold text-white font-heading">${startingPrice}</span>
                        </>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">Enterprise SLA</span>
                      )}
                    </div>

                    <Link
                      href={`/dashboard/agents/${tool.slug}`}
                      className={`px-4 py-2 rounded-md text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
                        tool.is_active
                          ? 'bg-zinc-100 text-zinc-900 hover:bg-white border border-transparent shadow-sm'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        if (!tool.is_active) {
                          e.preventDefault()
                        }
                      }}
                    >
                      {tool.is_active ? (
                        <>
                          Explore <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </>
                      ) : (
                        'Offline'
                      )}
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
