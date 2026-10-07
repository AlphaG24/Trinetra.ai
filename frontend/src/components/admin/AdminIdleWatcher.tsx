'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ADMIN_IDLE_TIMEOUT_MS,
  clearAdminSession,
  touchAdminSession,
} from '@/src/lib/safety/adminAuthService'
import { AlertCircle, Clock } from 'lucide-react'

// Show warning 5 minutes before 30-minute expiration
const WARNING_THRESHOLD_MS = 5 * 60 * 1000

export function AdminIdleWatcher() {
  const router = useRouter()
  const lastActiveRef = useRef(Date.now())
  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(300)

  const handleUserActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastActiveRef.current > 5000) {
      lastActiveRef.current = now
      touchAdminSession()
      if (showWarning) {
        setShowWarning(false)
      }
    }
  }, [showWarning])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }))

    const checkInterval = setInterval(() => {
      const now = Date.now()
      const idleTime = now - lastActiveRef.current
      const timeLeft = Math.max(0, ADMIN_IDLE_TIMEOUT_MS - idleTime)
      const remainingSec = Math.floor(timeLeft / 1000)

      setSecondsRemaining(remainingSec)

      // Show warning if under 5 minutes remaining
      if (timeLeft <= WARNING_THRESHOLD_MS && timeLeft > 0) {
        setShowWarning(true)
      } else {
        setShowWarning(false)
      }

      // Expire session at 30 minutes
      if (idleTime >= ADMIN_IDLE_TIMEOUT_MS) {
        clearInterval(checkInterval)
        clearAdminSession()
        router.push('/login?reason=idle_timeout')
      }
    }, 5000)

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity))
      clearInterval(checkInterval)
    }
  }, [handleUserActivity, router])

  if (!showWarning) return null

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-[#160b24]/95 p-4 text-amber-200 shadow-2xl backdrop-blur-md animate-pulse"
    >
      <Clock className="h-6 w-6 text-amber-400 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-white">Admin Session Inactivity Warning</p>
        <p className="text-xs text-amber-300/90">
          Your admin session will expire in {Math.floor(secondsRemaining / 60)}m {secondsRemaining % 60}s due to the 30-minute security timeout. Move your mouse or click to stay logged in.
        </p>
      </div>
      <button
        onClick={() => {
          lastActiveRef.current = Date.now()
          touchAdminSession()
          setShowWarning(false)
        }}
        className="ml-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400 transition"
      >
        Keep Session Active
      </button>
    </div>
  )
}
