'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, ArrowUpRight } from 'lucide-react'

interface StatsData {
  totalInteractions: number
  activeTools: number
  leadsGenerated: number
  conversionRate: number
}

interface KPICardsProps {
  stats: StatsData | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

// 1. Manually Animated Acoustic Voice Frequency Equalizer for "Total Interactions"
function AnimatedVoiceWaveIcon() {
  return (
    <div className="flex items-center justify-center text-teal-600 dark:text-teal-400">
      <svg className="w-5 h-5 overflow-visible" viewBox="0 0 24 24" fill="none">
        {/* 5 Fluid Equalizer Telemetry Bars */}
        <rect x="2.5" y="9" width="2.2" height="6" rx="1.1" fill="currentColor" className="anim-eq-1" />
        <rect x="6.8" y="5" width="2.2" height="14" rx="1.1" fill="currentColor" className="anim-eq-2" />
        <rect x="11" y="3" width="2.2" height="18" rx="1.1" fill="currentColor" className="anim-eq-3" />
        <rect x="15.2" y="6" width="2.2" height="12" rx="1.1" fill="currentColor" className="anim-eq-4" />
        <rect x="19.5" y="9" width="2.2" height="6" rx="1.1" fill="currentColor" className="anim-eq-5" />
      </svg>
    </div>
  )
}

// 2. Manually Animated Autonomous Fleet Command Orbital Hub for "Active Fleet"
function AnimatedFleetClusterIcon() {
  return (
    <div className="flex items-center justify-center text-blue-600 dark:text-blue-400">
      <svg className="w-5 h-5 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {/* Central Command Nexus */}
        <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" className="anim-core-pulse" />

        {/* Orbiting Agent Fleet Satellites & Vector Data Beams */}
        <g className="anim-fleet-orbit">
          {/* Orbital Path Guideline */}
          <circle cx="12" cy="12" r="7.5" strokeWidth="0.9" strokeDasharray="2 2" opacity="0.4" />
          
          {/* Agent Satellite 1 (North) */}
          <line x1="12" y1="9" x2="12" y2="5.5" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          <circle cx="12" cy="4.5" r="1.8" fill="currentColor" />

          {/* Agent Satellite 2 (South-East) */}
          <line x1="14.5" y1="13.5" x2="17" y2="15" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          <circle cx="18.5" cy="16" r="1.8" fill="currentColor" />

          {/* Agent Satellite 3 (South-West) */}
          <line x1="9.5" y1="13.5" x2="7" y2="15" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          <circle cx="5.5" cy="16" r="1.8" fill="currentColor" />
        </g>
      </svg>
    </div>
  )
}

// 3. Manually Animated Optical Reticle & Lead Extraction Radar for "Leads Generated"
function AnimatedLeadCaptureIcon() {
  return (
    <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400">
      <svg className="w-5 h-5 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {/* Optical Targeting Reticle Brackets */}
        <g className="anim-reticle-breathe" strokeWidth="1.8" strokeLinecap="round">
          <path d="M 4 8 V 4.5 H 7.5" />
          <path d="M 16.5 4.5 H 20 V 8" />
          <path d="M 4 16 V 19.5 H 7.5" />
          <path d="M 16.5 19.5 H 20 V 16" />
        </g>

        {/* Targeted Prospect Profile Silhouette */}
        <circle cx="12" cy="10" r="2.8" strokeWidth="1.6" />
        <path d="M 7.2 18 C 7.2 15 9.2 14.2 12 14.2 C 14.8 14.2 16.8 15 16.8 18" strokeWidth="1.6" strokeLinecap="round" />

        {/* Dynamic Scanning Sweep Line */}
        <line x1="5.5" y1="12" x2="18.5" y2="12" strokeWidth="1.2" strokeDasharray="1.5 1" opacity="0.65" className="anim-radar-scan" />
      </svg>
    </div>
  )
}

// 4. Manually Animated Conversion Yield Momentum Accelerator for "Conversion Rate"
function AnimatedConversionYieldIcon() {
  return (
    <div className="flex items-center justify-center text-amber-600 dark:text-amber-400">
      <svg className="w-5 h-5 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {/* Tiered Growth Yield Pillars */}
        <rect x="3.5" y="14" width="3.2" height="7" rx="1.2" fill="currentColor" stroke="none" className="anim-yield-bar-1 opacity-60" />
        <rect x="8.5" y="10" width="3.2" height="11" rx="1.2" fill="currentColor" stroke="none" className="anim-yield-bar-2 opacity-80" />
        <rect x="13.5" y="6" width="3.2" height="15" rx="1.2" fill="currentColor" stroke="none" className="anim-yield-bar-3" />

        {/* Ascending Momentum Arc */}
        <path d="M 4 15 Q 11 11 19 4" strokeWidth="1.8" strokeLinecap="round" />

        {/* Soaring Arrow Peak */}
        <path d="M 14.5 4 H 19 V 8.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="anim-arrow-ascend" />
      </svg>
    </div>
  )
}

export function KPICards({ stats, loading = false, error = null, onRetry }: KPICardsProps) {
  if (loading) {
    return (
      <div suppressHydrationWarning className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 w-full rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-5 animate-pulse flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-28 bg-zinc-100 dark:bg-zinc-850 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/20 transition cursor-pointer font-bold uppercase tracking-wider"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    )
  }

  const interactionsVal = stats?.totalInteractions ?? 0
  const activeToolsVal = stats?.activeTools ?? 16
  const leadsVal = stats?.leadsGenerated ?? 0
  const conversionVal = stats?.conversionRate ?? 0

  const kpis = [
    {
      label: 'Total Interactions',
      displayVal: interactionsVal.toLocaleString('en-IN'),
      iconComponent: <AnimatedVoiceWaveIcon />,
      desc: 'Calls + chats this month',
      href: '/dashboard/calls'
    },
    {
      label: 'Active Fleet',
      displayVal: activeToolsVal.toLocaleString('en-IN'),
      iconComponent: <AnimatedFleetClusterIcon />,
      desc: 'Live deployed agents',
      href: '/dashboard/agents'
    },
    {
      label: 'Leads Generated',
      displayVal: leadsVal.toLocaleString('en-IN'),
      iconComponent: <AnimatedLeadCaptureIcon />,
      desc: 'Extracted contact details',
      href: '/dashboard/leads'
    },
    {
      label: 'Conversion Rate',
      displayVal: `${conversionVal}%`,
      iconComponent: <AnimatedConversionYieldIcon />,
      desc: 'Converted leads ratio',
      href: '/dashboard/analytics'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <Link
          key={idx}
          href={kpi.href}
          className="group flex flex-col justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-violet-500/30 dark:hover:border-violet-500/30 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors font-montserrat">
              {kpi.label}
            </span>
            <div className="flex items-center gap-1.5">
              {kpi.iconComponent}
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-black font-heading text-zinc-900 dark:text-white tracking-tight">
              {kpi.displayVal}
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">{kpi.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
