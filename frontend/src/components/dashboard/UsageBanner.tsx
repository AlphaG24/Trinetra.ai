'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export function UsageBanner() {
  const [usage, setUsage] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('dismissed_paused_banner')
      if (dismissed === 'true') {
        setIsVisible(false)
      }
    }

    fetch('/api/usage')
      .then(res => res.json())
      .then(res => {
        if (res.success) setUsage(res.data)
      })
      .catch(err => console.error("Failed to load usage", err))
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dismissed_paused_banner', 'true')
    }
  }
  
  if (!usage || !isVisible) return null
  
  if (usage.is_paused) {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 bg-rose-500/90 text-white px-4 py-2 flex items-center justify-center gap-2 backdrop-blur-md shadow-lg border-b border-rose-600/50">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">
          🔴 Your organization has reached its plan limits and agents are paused. 
          <Link href="/dashboard/billing" className="ml-2 underline font-bold hover:text-rose-100 transition-colors">
            Upgrade to resume service.
          </Link>
        </p>
        <button onClick={handleDismiss} className="ml-4 text-rose-100 hover:text-white font-bold text-lg">&times;</button>
      </div>
    )
  }
  
  if (usage.warnings && usage.warnings.length > 0) {
    const warning = usage.warnings[0]
    return (
      <div className="fixed top-16 left-0 right-0 z-40 bg-amber-500/90 text-white px-4 py-2 flex items-center justify-center gap-2 backdrop-blur-md shadow-lg border-b border-amber-600/50 text-amber-50">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-50" />
        <p className="text-sm font-medium">
          ⚠️ Your organization is approaching the limit for {warning.type.replace('_', ' ')} ({warning.used}/{warning.limit}).
          <Link href="/dashboard/billing" className="ml-2 underline font-bold hover:text-white transition-colors">
            Upgrade now to avoid interruption.
          </Link>
        </p>
        <button onClick={() => setIsVisible(false)} className="ml-4 text-amber-100 hover:text-white">&times;</button>
      </div>
    )
  }
  
  return null
}
