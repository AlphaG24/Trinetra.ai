'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/src/components/providers/AuthProvider'
import { ShieldAlert, RefreshCw, ArrowRight } from 'lucide-react'

interface MaintenanceWatcherProps {
  /** Initial server-side value to eliminate layout flash */
  initialMaintenanceMode?: boolean
}

/**
 * Global Maintenance Watcher for Trinetra AI.
 * 
 * Intercepts platform traffic when `system_config.maintenance_mode === 'true'`.
 * - Public visitors and non-admins see a sleek, minimal, branded maintenance screen.
 * - Administrators (admin / super_admin) or users accessing /admin or /login?admin=true are bypassed
 *   with an unobtrusive alert bar so they can manage and restore the system.
 * - Supabase Realtime pushes instant updates when maintenance mode is toggled.
 */
export default function MaintenanceWatcher({
  initialMaintenanceMode = false,
}: MaintenanceWatcherProps) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(initialMaintenanceMode)
  const [isChecking, setIsChecking] = useState(false)
  const pathname = usePathname() || '/'
  const searchParams = useSearchParams()
  const { role } = useAuth()
  const [supabase] = useState(() => createClient())

  const isAdmin = role === 'admin' || role === 'super_admin'
  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminLoginIntent = pathname === '/login' && searchParams?.get('admin') === 'true'

  // Check public config API as reliable source of truth
  const checkMaintenanceStatus = useCallback(async () => {
    try {
      setIsChecking(true)
      const res = await fetch('/api/public/config', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const isMaint = data.configs?.maintenance_mode === 'true'
        setIsMaintenanceMode(isMaint)
      }
    } catch {
      // Fallback: keep current state
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    // Initial sync
    checkMaintenanceStatus()

    // Realtime subscription on system_config maintenance_mode row
    const channel = supabase
      .channel('maintenance_mode_global_stream')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_config',
          filter: 'config_key=eq.maintenance_mode',
        },
        (payload: any) => {
          const newVal = payload.new?.config_value
          setIsMaintenanceMode(newVal === 'true')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, checkMaintenanceStatus])

  // Admins and admin routes are never locked out
  if (isAdmin || isAdminRoute || isAdminLoginIntent) {
    if (!isMaintenanceMode) return null

    // For admins, show a persistent non-blocking alert banner at the top
    return (
      <aside
        aria-label="Maintenance Mode Banner"
        className="fixed top-0 inset-x-0 z-[99999] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-black px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-black animate-pulse" />
          <span>
            <strong>MAINTENANCE MODE IS ACTIVE:</strong> Public visitors and non-admins are currently blocked by the maintenance screen.
          </span>
        </div>
        <Link
          href="/admin/system"
          className="ml-4 px-3 py-1 bg-black text-amber-300 rounded-md font-mono text-[11px] hover:bg-zinc-900 transition-colors inline-flex items-center gap-1"
        >
          <span>Manage in System Settings</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </aside>
    )
  }

  // If maintenance mode is off, render nothing
  if (!isMaintenanceMode) return null

  // For public visitors and regular users, render a sleek, minimal, premium maintenance screen
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      className="fixed inset-0 bg-[#080010] z-[999999] flex flex-col items-center justify-center p-6 text-white overflow-hidden selection:bg-purple-500/30"
    >
      {/* Subtle ambient atmospheric glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 40%, rgba(139, 92, 246, 0.15) 0%, rgba(8, 0, 16, 0) 70%)',
        }}
      />

      <div className="relative z-10 max-w-md w-full text-center flex flex-col items-center space-y-6">
        {/* Sleek Standalone Trident Logo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-violet-600/25 blur-3xl rounded-full scale-150 pointer-events-none" />
          <img
            src="/trident.png"
            alt="Trinetra AI"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain relative z-10 transition-transform duration-500 hover:scale-105"
            style={{
              filter: 'drop-shadow(0 0 25px rgba(139, 92, 246, 0.45))',
            }}
          />
        </div>

        {/* Minimal Live Status Indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-300 text-xs font-medium tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
          </span>
          <span>Scheduled Maintenance</span>
        </div>

        {/* Headline & Concise Messaging */}
        <div className="space-y-2.5">
          <h1
            id="maintenance-title"
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95"
          >
            We&apos;ll be right back
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
            Trinetra AI is currently undergoing scheduled platform upgrades. Services will resume automatically shortly.
          </p>
        </div>

        {/* Minimal Refresh / Status Button */}
        <div className="pt-2">
          <button
            onClick={checkMaintenanceStatus}
            disabled={isChecking}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-violet-500/30 text-zinc-300 hover:text-white text-xs font-medium transition-all duration-200 backdrop-blur-sm disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-violet-300 transition-colors ${
                isChecking ? 'animate-spin' : ''
              }`}
            />
            <span>{isChecking ? 'Checking status…' : 'Check status'}</span>
          </button>
        </div>
      </div>

      {/* Discreet footer */}
      <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none">
        <p className="text-[11px] text-zinc-600 font-mono tracking-wider">
          TRINETRA AI
        </p>
      </div>
    </div>
  )
}
export { MaintenanceWatcher }
