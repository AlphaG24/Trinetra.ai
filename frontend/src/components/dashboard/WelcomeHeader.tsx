'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

interface WelcomeHeaderProps {
  fullName?: string | null
  isOnboardingComplete?: boolean
  loading?: boolean
}

export function WelcomeHeader({ fullName, isOnboardingComplete = true, loading = false }: WelcomeHeaderProps) {
  const getGreeting = () => {
    const hours = new Date().getHours()
    if (hours < 12) return 'Good morning'
    if (hours < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-8 w-60 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mt-1" />
      </div>
    )
  }

  const name = fullName ? fullName.split(' ')[0] : 'Partner'

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-heading tracking-tight text-zinc-950 dark:text-white">
            {getGreeting()}, {name} 👋
          </h1>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-1">
            Here's what's happening across your Trinetra tools.
          </p>
        </div>
      </div>

      {!isOnboardingComplete && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-400 text-sm animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Complete your profile to get the most out of Trinetra</span>
          </div>
          <Link 
            href="/dashboard/onboarding" 
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:underline underline-offset-4"
          >
            <span>Complete Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
