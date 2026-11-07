'use client'

import React, { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Lock, ArrowRight, ShieldAlert, Loader2 } from 'lucide-react'
import { createClient } from '@/src/utils/supabase/client'

export function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const isVerifyingRef = useRef(false)
  const lastExpiryAttemptRef = useRef(0)

  useEffect(() => {
    const supabase = createClient()

    const verifyAndTriggerExpiry = async () => {
      const currentPath = pathnameRef.current || ''
      // Only show on protected dashboard or admin routes
      if (!currentPath.startsWith('/dashboard') && !currentPath.startsWith('/admin')) {
        return
      }

      // Debounce: don't check more than once every 10 seconds
      const now = Date.now()
      if (now - lastExpiryAttemptRef.current < 10000 || isVerifyingRef.current) {
        return
      }
      lastExpiryAttemptRef.current = now
      isVerifyingRef.current = true

      try {
        // Check if browser actually has a valid session or can refresh it
        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
        if (sessionData?.session) {
          // Attempt silent token refresh
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null }, error: new Error('Refresh failed') }))
          if (refreshData?.session && !refreshErr) {
            // Session refreshed successfully — false alarm, do not show modal
            console.log('[SessionExpiredModal] Stale token silently refreshed. Suppressing expiry modal.')
            return
          }
        }

        // Final authoritative check with getUser()
        const { data: userData, error: userErr } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: new Error('User check failed') }))
        if (userData?.user && !userErr) {
          // User is still authenticated
          return
        }

        // Session is genuinely invalid / expired
        setIsOpen(true)
      } catch (err) {
        console.warn('[SessionExpiredModal] Verification error:', err)
      } finally {
        isVerifyingRef.current = false
      }
    }

    // Global listener for session expiry custom event
    const handleSessionExpiredEvent = () => {
      verifyAndTriggerExpiry()
    }
    window.addEventListener('trinetra:session_expired', handleSessionExpiredEvent)

    // Intercept client fetch 401 responses cleanly
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        if (response.status === 401) {
          const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || ''
          
          // Only trigger for primary core auth APIs, never background/telemetry/stats/notifications
          const isBackgroundOrMetric = 
            urlStr.includes('/api/notifications') || 
            urlStr.includes('/api/telemetry') || 
            urlStr.includes('/api/public') ||
            urlStr.includes('/stats') ||
            urlStr.includes('/usage') ||
            urlStr.includes('/calls') ||
            urlStr.includes('/billing')
            
          const isAuthEndpoint = urlStr.includes('/api/auth/login') || urlStr.includes('/api/auth/signout')
          
          // Only trigger on primary profile or overview auth failures
          if ((urlStr.includes('/api/profiles') || urlStr.includes('/api/dashboard/overview')) && !isBackgroundOrMetric && !isAuthEndpoint) {
            verifyAndTriggerExpiry()
          }
        }
        return response
      } catch (err) {
        throw err
      }
    }

    return () => {
      window.removeEventListener('trinetra:session_expired', handleSessionExpiredEvent)
      window.fetch = originalFetch
    }
  }, [])

  if (!isOpen) return null

  const handleSignInRedirect = async () => {
    try {
      setIsSigningOut(true)
      // Authoritatively clear server-side HttpOnly session cookies
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {})
      if (typeof window !== 'undefined') {
        sessionStorage.clear()
      }
    } catch (_) {
      // Continue to redirect even on fetch failure
    } finally {
      // Full browser hard-redirect to /login with signed_out=true & expired=true to avoid middleware bounce
      window.location.href = '/login?signed_out=true&expired=true'
    }
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
            disabled={isSigningOut}
            className="w-full py-3.5 px-5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In Again</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionExpiredModal
