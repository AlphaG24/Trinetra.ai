'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

// 1. Manually Animated Storefront Marketplace Portal Icon
function AnimatedStorefrontIcon() {
  return (
    <svg className="w-5 h-5 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {/* Store Awning Canopy */}
      <path d="M 3 9 L 4.5 4 H 19.5 L 21 9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Awning Scallops */}
      <path d="M 3 9 C 3 10.6 4.8 11.2 6 9.8 C 7.2 11.2 9 10.6 9 9 C 9 10.6 10.8 11.2 12 9.8 C 13.2 11.2 15 10.6 15 9 C 15 10.6 16.8 11.2 18 9.8 C 19.2 11.2 21 10.6 21 9" strokeWidth="1.6" strokeLinecap="round" />
      {/* Store Glass Frame & Door */}
      <path d="M 4.5 10.5 V 20 H 19.5 V 10.5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 9.5 20 V 14 H 14.5 V 20" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Door Handle */}
      <circle cx="13" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

// 2. Manually Animated Live Interactive Voice Lab Beaker Icon
function AnimatedLabFlaskIcon() {
  return (
    <svg className="w-5 h-5 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {/* Flask Neck & Body */}
      <path d="M 10 2 H 14" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 10 2 V 7 L 4.5 18 C 3.8 19.3 4.8 21 6.3 21 H 17.7 C 19.2 21 20.2 19.3 19.5 18 L 14 7 V 2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Liquid Wave Level */}
      <path d="M 7.5 15.5 Q 12 13.5 16.5 15.5" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      {/* Static Rising Bubbles */}
      <circle cx="10" cy="14" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="14" cy="15" r="1.5" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  )
}

interface QuickActionsProps {}

export function QuickActions({}: QuickActionsProps) {
  const router = useRouter()
  return (
    <div suppressHydrationWarning className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 1. Browse Marketplace Action Portal */}
      <Link
        suppressHydrationWarning
        href="/dashboard/marketplace"
        className="relative flex items-center justify-between p-4 rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-900 dark:text-white transition-colors cursor-pointer shadow-xs"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 transition-colors">
            <AnimatedStorefrontIcon />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-heading text-zinc-900 dark:text-white tracking-tight">
                Browse Marketplace
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              Deploy pre-configured voice agents & workflows in 1 click
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-zinc-400 pl-2 flex-shrink-0">
          <ArrowRight className="w-4 h-4" />
        </div>
      </Link>

      {/* 2. View Demo Tools Action Portal */}
      <button
        suppressHydrationWarning
        type="button"
        onClick={() => router.push('/dashboard/demo')}
        className="relative flex items-center justify-between p-4 rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-900 dark:text-white transition-colors cursor-pointer w-full shadow-xs"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 flex items-center justify-center flex-shrink-0 transition-colors">
            <AnimatedLabFlaskIcon />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-heading text-zinc-900 dark:text-white tracking-tight">
                View Demo Tools
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              Test conversational AI voice models in interactive playground
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-zinc-400 pl-2 flex-shrink-0">
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  )
}
