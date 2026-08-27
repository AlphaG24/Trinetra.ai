'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { WrenchIcon } from 'lucide-react'

interface MaintenanceWatcherProps {
  /** Initial server-side value so no flash on first render */
  initialMaintenanceMode: boolean
  userEmail: string
  isAdmin: boolean
}

/**
 * Listens to Supabase Realtime on the system_config table.
 * When maintenance_mode flips to 'true', non-admin users immediately see
 * a full-screen maintenance overlay without needing a page reload.
 */
export function MaintenanceWatcher({
  initialMaintenanceMode,
  userEmail,
  isAdmin,
}: MaintenanceWatcherProps) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(initialMaintenanceMode)
  const supabase = createClient()

  useEffect(() => {
    if (isAdmin) return // Admins are never blocked

    // Subscribe to changes on system_config row where config_key = 'maintenance_mode'
    const uniqueChannelName = `maintenance_mode_watch_${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_config',
          filter: "config_key=eq.maintenance_mode",
        },
        (payload) => {
          const newVal = payload.new?.config_value
          setIsMaintenanceMode(newVal === 'true')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_config',
          filter: "config_key=eq.maintenance_mode",
        },
        (payload) => {
          const newVal = payload.new?.config_value
          setIsMaintenanceMode(newVal === 'true')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, supabase])

  if (!isMaintenanceMode || isAdmin) return null

  return (
    <div className="fixed inset-0 bg-[#080010] z-[9999] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Animated icon */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl animate-pulse" />
            <div className="relative p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <WrenchIcon className="w-12 h-12 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Text content */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Platform Under Maintenance
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We&apos;re currently performing scheduled maintenance to improve your experience.
            The platform will be back online shortly.
          </p>
        </div>

        {/* Status card */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 text-left space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Maintenance in Progress
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Our engineering team is working to restore full service. Your data is safe and no action is required on your part.
          </p>
        </div>

        <p className="text-[11px] text-zinc-600">
          Logged in as <span className="text-zinc-400 font-mono">{userEmail}</span>
        </p>
      </div>
    </div>
  )
}
