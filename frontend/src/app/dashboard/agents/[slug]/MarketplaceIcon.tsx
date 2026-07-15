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
      <div className={`rounded-full bg-zinc-800 flex items-center justify-center shrink-0 ${className}`}>
        <Box className="w-[50%] h-[50%] text-zinc-400" />
      </div>
    )
  }

  return (
    <img
      src={iconUrl}
      alt={name}
      onError={() => setHasError(true)}
      className={`rounded-full object-cover shrink-0 ${className}`}
    />
  )
}
