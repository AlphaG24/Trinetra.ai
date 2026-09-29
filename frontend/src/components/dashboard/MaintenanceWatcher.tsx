'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/src/components/providers/AuthProvider'
import { Wrench, ShieldAlert, RefreshCw, ArrowRight } from 'lucide-react'

interface MaintenanceWatcherProps {
  /** Initial server-side value to eliminate layout flash */
  initialMaintenanceMode?: boolean
}

/**
 * Global Maintenance Watcher for Trinetra AI.
 * 
 * Intercepts platform traffic when `system_config.maintenance_mode === 'true'`.
 * - Public visitors and non-admins immediately see a beautiful, branded maintenance screen.
 * - Administrators (admin / super_admin) or users accessing /admin or /login?admin=true are bypassed
 *   with an unobtrusive alert bar so they can manage and restore the system.
 * - Supabase Realtime pushes instant updates when maintenance mode is toggled.
 */
export function MaintenanceWatcher({
  initialMaintenanceMode = false,
}: MaintenanceWatcherProps) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(initialMaintenanceMode)
  const [isChecking, setIsChecking] = useState(false)
  const pathname = usePathname() || '/'
  const searchParams = useSearchParams()
  const { user, role } = useAuth()
  const supabase = createClient()

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
    const uniqueChannel = `maintenance_mode_global_${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase
      .channel(uniqueChannel)
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

    // Re-check whenever tab returns to focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkMaintenanceStatus()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
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

  // For public visitors and regular users, render the full-screen branded maintenance overlay
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      className="fixed inset-0 bg-[#06040A] z-[999999] flex flex-col items-center justify-center p-6 text-white overflow-y-auto selection:bg-amber-500/30"
    >
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 25%, rgba(139, 92, 246, 0.4) 0%, rgba(6, 4, 10, 0) 65%), radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.2) 0%, rgba(6, 4, 10, 0) 60%)',
        }}
      />

      {/* Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 max-w-lg w-full text-center space-y-7 my-auto">
        {/* Animated Brand Emblem */}
        <div className="flex items-center justify-center">
          <div className="relative group">
            <div className="absolute inset-0 rounded-full bg-violet-600/30 blur-3xl animate-pulse" />
            <div className="relative p-5 rounded-3xl bg-zinc-900/80 border border-violet-500/30 backdrop-blur-xl shadow-2xl flex items-center justify-center">
              <img
                src="/trident.png"
                alt="Trinetra AI"
                className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]"
              />
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-500 text-black shadow-lg">
                <Wrench className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Scheduled Infrastructure Maintenance</span>
        </div>

        {/* Headline & Description */}
        <div className="space-y-3">
          <h1
            id="maintenance-title"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
          >
            We&apos;ll Be Right Back
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            Trinetra AI is currently undergoing scheduled infrastructure upgrades to ensure high availability, enhanced voice processing, and platform stability.
          </p>
        </div>

        {/* Live Status Card */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 text-left space-y-3 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Platform Status</span>
            <span className="text-amber-400 font-mono font-semibold">Undergoing Upgrades</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 via-amber-400 to-violet-500 animate-pulse w-3/4 rounded-full" />
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            All user data, agent configurations, and telemetry remain completely secure. No data has been affected. Services will resume automatically as soon as maintenance concludes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={checkMaintenanceStatus}
            disabled={isChecking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-all duration-200 shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking System...' : 'Check Live Status'}</span>
          </button>
        </div>

        {/* User / Admin Footer Info */}
        <div className="pt-4 flex flex-col items-center gap-2 text-[11px] text-zinc-600">
          {user?.email && (
            <p>
              Signed in as <span className="text-zinc-400 font-mono">{user.email}</span>
            </p>
          )}
          <Link
            href="/login?admin=true"
            className="text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4"
          >
            Administrator Console Access
          </Link>
        </div>
      </div>
    </div>
  )
}

export default MaintenanceWatcher
