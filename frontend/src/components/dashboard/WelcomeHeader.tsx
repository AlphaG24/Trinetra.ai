'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/src/components/providers/AuthProvider'

interface WelcomeHeaderProps {
  fullName?: string | null
  isOnboardingComplete?: boolean
  loading?: boolean
}

export function WelcomeHeader({
  fullName,
  isOnboardingComplete = true,
  loading = false,
}: WelcomeHeaderProps) {
  const { user: authUser, profile: authProfile } = useAuth()
  const [greeting, setGreeting] = useState('Welcome back')

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours < 12) setGreeting('Good morning')
    else if (hours < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-8 w-60 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mt-1" />
      </div>
    )
  }

  // Instant hydration fallback from client storage
  let cachedName = ''
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem('trinetra_auth_profile_cache') || localStorage.getItem('trinetra_auth_profile_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        cachedName = parsed?.profile?.full_name || parsed?.user?.user_metadata?.full_name || ''
      }
    } catch {}
  }

  const isPlaceholderName = (val?: string | null) => {
    if (!val) return true
    const l = val.toLowerCase().trim()
    return l === 'partner' || l === 'nexus' || l === 'nexus.ai.ops' || l === 'user'
  }

  const rawEffective = (
    (!isPlaceholderName(fullName) ? fullName : '') ||
    (!isPlaceholderName(authProfile?.full_name) ? authProfile?.full_name : '') ||
    (!isPlaceholderName(cachedName) ? cachedName : '') ||
    (!isPlaceholderName(authUser?.user_metadata?.full_name) ? authUser?.user_metadata?.full_name : '') ||
    (!isPlaceholderName(authUser?.user_metadata?.name) ? authUser?.user_metadata?.name : '') ||
    (fullName || authProfile?.full_name || cachedName || 'Raghav')
  ).trim()
  const effectiveName = isPlaceholderName(rawEffective) ? 'Raghav' : rawEffective
  const name = effectiveName ? effectiveName.split(' ')[0] : 'Raghav'

  return (
    <div className="space-y-4">
      <div className="pb-1">
        <h1
          suppressHydrationWarning
          className="text-2xl md:text-3xl font-black font-heading tracking-tight text-zinc-950 dark:text-white"
        >
          {greeting}, {name} 👋
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
          Here&apos;s what&apos;s happening across your VAAKRITI tools.
        </p>
      </div>

      {!isOnboardingComplete && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs md:text-sm block">Complete your profile setup</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Unlock statutory invoicing, custom domains, and automated phone routing.</span>
            </div>
          </div>
          <Link
            href="/dashboard/onboarding"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold tracking-wide transition shadow-xs cursor-pointer shrink-0"
          >
            <span>Complete Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
