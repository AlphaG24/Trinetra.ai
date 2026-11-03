'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react'

export function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleSessionExpired = () => {
      setIsOpen(true)
    }

    // Global listener for session expiry custom event
    window.addEventListener('trinetra:session_expired', handleSessionExpired)

    // Intercept client fetch 401 responses cleanly
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        if (response.status === 401) {
          const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || ''
          // Only trigger for dashboard / workspace APIs, not external webhooks or public auth endpoints
          if (urlStr.includes('/api/') && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/signout')) {
            window.dispatchEvent(new CustomEvent('trinetra:session_expired'))
          }
        }
        return response
      } catch (err) {
        throw err
      }
    }

    return () => {
      window.removeEventListener('trinetra:session_expired', handleSessionExpired)
      window.fetch = originalFetch
    }
  }, [])

  if (!isOpen) return null

  const handleSignInRedirect = () => {
    const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}&expired=true` : '/login?expired=true'
    window.location.replace(redirectUrl)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300 select-none"
    >
      <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-7 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2
            id="session-expired-title"
            className="text-lg font-extrabold text-[var(--heading)] font-playfair uppercase tracking-wider"
          >
            Session Expired
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm mx-auto font-sans">
            Your secure session has timed out for your privacy and safety. Please sign in again to continue where you left off.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleSignInRedirect}
            className="w-full py-3.5 px-5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Lock className="w-4 h-4" />
            <span>Sign In Again</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionExpiredModal

