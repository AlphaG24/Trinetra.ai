'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, MessageSquare, FileText, Workflow, Bot, ArrowRight, Box } from 'lucide-react'

const DEFAULT_ICONS: Record<string, any> = {
  voice: Phone,
  chat: MessageSquare,
  document: FileText,
  automation: Workflow,
}

const getIcon = (type: string) => {
  const norm = (type || '').toLowerCase()
  return DEFAULT_ICONS[norm] || Bot
}

interface ToolCardProps {
  tool: {
    id: string
    name: string
    slug: string
    description: string | null
    type: string
    icon_url: string | null
    is_active: boolean
    marketplace_metadata: any
  }
}

export function ToolCard({ tool }: ToolCardProps) {
  const [imgError, setImgError] = useState(!tool.icon_url)
  const Icon = getIcon(tool.type)
  const meta = tool.marketplace_metadata || {}
  const tagline = meta.tagline || tool.description || 'Pre-configured AI agent.'
  const truncatedTagline = tagline.length > 80 ? tagline.slice(0, 80) + '...' : tagline

  const startingPrice = meta.starting_price || (meta.pricing_tiers?.[0]?.price)

  return (
    <Link
      href={`/dashboard/marketplace/${tool.slug || tool.id}`}
      className="group bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:bg-[var(--hover-bg)] transition-all duration-300 flex flex-col justify-between min-h-[220px] shadow-sm hover:scale-[1.02] cursor-pointer text-left"
    >
      {/* Icon + Category & Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--heading)] shrink-0">
            {imgError || !tool.icon_url ? (
              <Icon className="w-5 h-5" />
            ) : (
              <img
                src={tool.icon_url}
                alt={tool.name}
                onError={() => setImgError(true)}
                className="w-12 h-12 rounded-xl object-cover"
              />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--heading)] font-display tracking-tight leading-tight group-hover:underline">
              {tool.name}
            </h3>
            <span className="text-[9px] text-[var(--muted)] font-sans uppercase tracking-widest font-black block mt-0.5">
              {tool.type} agent
            </span>
          </div>
        </div>

        {/* Status Badge */}
        {tool.is_active ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[var(--primary-bg)] text-[var(--heading)] border border-[var(--border)]">
            Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[var(--background)] text-[var(--muted)] border border-[var(--border)]">
            Coming Soon
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--body)] font-sans line-clamp-2 leading-relaxed mb-4 flex-grow">
        {truncatedTagline}
      </p>

      {/* Price + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-auto">
        <div>
          {startingPrice ? (
            <p className="text-sm font-bold text-[var(--heading)] font-sans">
              {startingPrice}
            </p>
          ) : (
            <p className="text-sm font-bold text-[var(--heading)] font-sans">
              Free Demo
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-[var(--heading)] font-extrabold uppercase tracking-wider transition-all">
          View <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  )
}
