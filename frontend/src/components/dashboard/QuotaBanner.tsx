'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useDashboardStore } from '@/store/dashboardStore'

export function QuotaBanner() {
  const { profile } = useDashboardStore()
  const [usedMinutes, setUsedMinutes] = useState<number | null>(null)
  const [limitMinutes, setLimitMinutes] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaid, setIsPaid] = useState(false)

  useEffect(() => {
    async function fetchQuota() {
      if (!profile?.id) return
      
      const supabase = createClient()
      try {
        // Safe check for purchased agents in user_agents
        const { data: agentData } = await supabase
          .from('user_agents')
          .select('id')
          .eq('user_id', profile.id)

        const hasPaidAgent = agentData && agentData.length > 0
        setIsPaid(!!hasPaidAgent)

        if (hasPaidAgent) {
          const { data, error } = await supabase
            .from('profiles')
            .select('paid_minutes_used, paid_minutes_limit')
            .eq('id', profile.id)
            .single()

          if (data && !error) {
            setUsedMinutes(data.paid_minutes_used ?? 0)
            setLimitMinutes(data.paid_minutes_limit ?? 100)
          }
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('demo_minutes_used, demo_minutes_limit, total_minutes_limit')
            .eq('id', profile.id)
            .single()

          if (data && !error) {
            setUsedMinutes(data.demo_minutes_used ?? 0)
            const limit = data.total_minutes_limit ?? data.demo_minutes_limit ?? 100
            setLimitMinutes(limit)
          }
        }
      } catch (err) {
        console.error('Failed to fetch quota details:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuota()
  }, [profile?.id])

  if (isLoading || usedMinutes === null || limitMinutes === null || limitMinutes <= 0) {
    return null
  }

  const usagePercent = Math.round((usedMinutes / limitMinutes) * 100)

  // 100% Critical State
  if (usagePercent >= 100) {
    return (
      <div className="w-full bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 border border-red-500/30 rounded-xl p-4 mb-6 relative overflow-hidden group shadow-lg shadow-red-950/10 backdrop-blur-md animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-red-500/5 opacity-50 transition-opacity" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">⛔ Agents Paused</h4>
              <p className="text-xs text-red-200/70">
                Your AI minutes are exhausted ({usedMinutes?.toFixed(1)}/{limitMinutes} mins used). Top up immediately to resume processing calls.
              </p>
            </div>
          </div>
          {isPaid ? (
            <a
              href="https://wa.me/919452045499?text=Hi,%20my%20AI%20agents%20are%20paused%20due%20to%20usage%20limits.%20I%20would%20like%20to%20purchase%20more%20minutes"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-600 to-rose-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all whitespace-nowrap cursor-pointer text-center"
            >
              Contact for Top-Up
            </a>
          ) : (
            <button
              onClick={() => console.log('Stripe Checkout Triggered')}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-600 to-rose-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all whitespace-nowrap"
            >
              Top-Up Credits
            </button>
          )}
        </div>
      </div>
    )
  }

  // 80% Warning State
  if (usagePercent >= 80) {
    return (
      <div className="w-full bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-amber-950/40 border border-amber-500/30 rounded-xl p-4 mb-6 relative overflow-hidden group shadow-lg shadow-yellow-950/10 backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/5 to-yellow-500/5 opacity-50 transition-opacity" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Low Balance</h4>
              <p className="text-xs text-amber-200/70">
                You have used {usagePercent}% of your AI minutes ({usedMinutes?.toFixed(1)}/{limitMinutes} mins used). Top up soon to keep your agents online.
              </p>
            </div>
          </div>
          {isPaid ? (
            <a
              href="https://wa.me/919452045499?text=Hi,%20my%20AI%20agents%20are%20paused%20due%20to%20usage%20limits.%20I%20would%20like%20to%20purchase%20more%20minutes"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all whitespace-nowrap cursor-pointer text-center"
            >
              Contact for Top-Up
            </a>
          ) : (
            <button
              onClick={() => console.log('Stripe Checkout Triggered')}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all whitespace-nowrap"
            >
              Top-Up Credits
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}
