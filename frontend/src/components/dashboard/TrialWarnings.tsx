'use client'

import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'

interface TrialWarningsProps {
  planTier?: string
  trialEndsAt?: string | null
  demoMinutesUsed?: number
  demoMinutesLimit?: number
  paidMinutesUsed?: number
  paidMinutesLimit?: number
}

export function TrialWarnings({
  planTier = 'free',
  trialEndsAt = null,
  demoMinutesUsed = 0,
  demoMinutesLimit = 10,
  paidMinutesUsed = 0,
  paidMinutesLimit = 100
}: TrialWarningsProps) {
  const now = new Date()

  const isFree = planTier === 'free' || planTier === 'free_demo'
  const used = isFree ? demoMinutesUsed : paidMinutesUsed
  const limit = isFree ? demoMinutesLimit : paidMinutesLimit
  const percentage = limit > 0 ? (used / limit) * 100 : 0

  // 1. Check usage limits
  const isLimitReached = percentage >= 100
  const isApproachingLimit = percentage >= 80 && percentage < 100

  // 2. Check trial dates
  let isTrialExpired = false
  let isTrialExpiringSoon = false
  let hoursRemaining = 0

  if (planTier === 'trial' && trialEndsAt) {
    const endsDate = new Date(trialEndsAt)
    const diffMs = endsDate.getTime() - now.getTime()

    if (diffMs <= 0) {
      isTrialExpired = true
    } else {
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
      if (diffHours <= 48) {
        isTrialExpiringSoon = true
        hoursRemaining = diffHours
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Exhausted Limit banner (both free and paid) */}
      {isLimitReached && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-650 dark:text-red-405">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <div>
              <span className="font-bold text-xs text-zinc-900 dark:text-white">
                {isFree ? 'Demo minutes exhausted' : 'Monthly limit reached. Your agent is paused.'}
              </span>
              <p className="text-[10px] text-zinc-650 dark:text-zinc-300 mt-0.5 leading-none">
                You have used {used}/{limit} {isFree ? 'free test' : 'production'} minutes. Upgrade to continue using Trinetra AI.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition text-center shrink-0"
          >
            Upgrade Plan
          </Link>
        </div>
      )}

      {/* 80% Usage Warning (both free and paid) */}
      {isApproachingLimit && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-405">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <span className="font-bold text-xs text-zinc-900 dark:text-white">Approaching minute limit</span>
              <p className="text-[10px] text-zinc-650 dark:text-zinc-300 mt-0.5 leading-none">
                You've used {Math.round(percentage)}% of your monthly minutes ({used}/{limit}). Consider upgrading.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-amber-650 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition text-center shrink-0"
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Trial expired banner */}
      {isTrialExpired && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-650 dark:text-red-405">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <div>
              <span className="font-bold text-xs text-zinc-900 dark:text-white">Your trial subscription has expired</span>
              <p className="text-[10px] text-zinc-650 dark:text-zinc-300 mt-0.5 leading-none">
                Your 14-day trial period has ended. Select a production tier plan to reactivate system capabilities.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition text-center shrink-0"
          >
            Reactivate Plan
          </Link>
        </div>
      )}

      {/* Trial expiring soon banner */}
      {isTrialExpiringSoon && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-405">
          <div className="flex items-start sm:items-center gap-2.5">
            <Clock className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <span className="font-bold text-xs text-zinc-900 dark:text-white">Trial period ending soon</span>
              <p className="text-[10px] text-zinc-650 dark:text-zinc-300 mt-0.5 leading-none">
                Your trial access will terminate in {hoursRemaining} hours. Upgrade now to preserve tool configurations.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-amber-650 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition text-center shrink-0"
          >
            Upgrade Now
          </Link>
        </div>
      )}
    </div>
  )
}
