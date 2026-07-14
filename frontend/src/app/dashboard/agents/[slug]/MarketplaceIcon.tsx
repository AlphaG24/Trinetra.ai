'use client'

import { useState } from 'react'
import { Box } from 'lucide-react'

interface MarketplaceIconProps {
  iconUrl: string | null
  type: string
  name: string
  className?: string
}

export function MarketplaceIcon({ iconUrl, type, name, className = "w-20 h-20" }: MarketplaceIconProps) {
  const [hasError, setHasError] = useState(!iconUrl)

  if (hasError || !iconUrl) {
    return (
      <div className={`rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 ${className}`}>
        <Box className="w-10 h-10 text-zinc-400" />
      </div>
    )
  }

  return (
    <img
      src={iconUrl}
      alt={name}
      onError={() => setHasError(true)}
      className={`rounded-md object-cover border border-zinc-800 shrink-0 ${className}`}
    />
  )
}
