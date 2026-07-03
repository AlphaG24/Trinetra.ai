'use client'

import { useState } from 'react'
import { Bot, Phone, MessageSquare, Share2, Workflow, Cpu, FileText } from 'lucide-react'

interface MarketplaceIconProps {
  iconUrl: string | null
  type: string
  name: string
  className?: string
}

export function MarketplaceIcon({ iconUrl, type, name, className = "w-20 h-20" }: MarketplaceIconProps) {
  const [hasError, setHasError] = useState(!iconUrl)

  const normalized = type.toLowerCase()
  let FallbackIcon = Cpu
  let bgClass = "bg-zinc-500/10 border-zinc-500/30 text-zinc-400"
  
  if (normalized === 'voice') {
    FallbackIcon = Phone
    bgClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
  } else if (normalized === 'ocr') {
    FallbackIcon = FileText
    bgClass = "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
  } else if (normalized === 'chat') {
    FallbackIcon = MessageSquare
    bgClass = "bg-violet-500/10 border-violet-500/30 text-violet-400"
  } else if (normalized === 'social') {
    FallbackIcon = Share2
    bgClass = "bg-pink-500/10 border-pink-500/30 text-pink-400"
  } else if (normalized === 'workflow') {
    FallbackIcon = Workflow
    bgClass = "bg-amber-500/10 border-amber-500/30 text-amber-400"
  }

  if (hasError || !iconUrl) {
    return (
      <div className={`rounded-2xl border flex items-center justify-center ${bgClass} ${className}`}>
        <FallbackIcon className="w-1/2 h-1/2" />
      </div>
    )
  }

  return (
    <img
      src={iconUrl}
      alt={name}
      onError={() => setHasError(true)}
      className={`rounded-2xl object-cover border border-white/10 ${className}`}
    />
  )
}
