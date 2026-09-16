'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react'

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [showReconnected, setShowReconnected] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
      }, 3500)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showReconnected) return null

  return (
    <aside aria-label="Network Connection Alert" className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
      {!isOnline ? (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-950/90 border border-amber-500/30 text-amber-200 shadow-2xl backdrop-blur-md text-xs font-medium">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>You are currently offline. Check your internet connection.</span>
        </div>
      ) : showReconnected ? (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 shadow-2xl backdrop-blur-md text-xs font-medium">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Back online. Connection restored.</span>
        </div>
      ) : null}
    </aside>
  )
}
