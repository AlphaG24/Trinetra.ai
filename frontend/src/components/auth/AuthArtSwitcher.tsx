'use client'

import React, { useState, useEffect } from 'react'
import { LivingGlobeCanvas } from './LivingGlobeCanvas'
import { MoonlitPetalsCanvas } from './MoonlitPetalsCanvas'
import { Globe, Sparkles, Pause, Play } from 'lucide-react'

export interface AuthArtSwitcherProps {
  className?: string
  autoSwitchIntervalMs?: number
}

export function AuthArtSwitcher({
  className = '',
  autoSwitchIntervalMs = 14000,
}: AuthArtSwitcherProps) {
  const [activeArt, setActiveArt] = useState<'globe' | 'petals'>('globe')
  const [isAutoSwitchEnabled, setIsAutoSwitchEnabled] = useState(true)

  // Auto switch timer
  useEffect(() => {
    if (!isAutoSwitchEnabled) return

    const interval = setInterval(() => {
      setActiveArt((prev) => (prev === 'globe' ? 'petals' : 'globe'))
    }, autoSwitchIntervalMs)

    return () => clearInterval(interval)
  }, [isAutoSwitchEnabled, autoSwitchIntervalMs])

  return (
    <div className={`relative w-full h-full min-h-[340px] overflow-hidden bg-[#030712] select-none ${className}`}>
      {/* ── Scene 1: Earth Living Globe ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-auto ${
          activeArt === 'globe' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        <LivingGlobeCanvas isActive={activeArt === 'globe'} />
      </div>

      {/* ── Scene 2: Moonlit Petals ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-auto ${
          activeArt === 'petals' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        <MoonlitPetalsCanvas isActive={activeArt === 'petals'} />
      </div>

      {/* ── Floating Controls Pill (Minimalist Glassmorphism) ── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg text-xs">
        <button
          type="button"
          onClick={() => setActiveArt('globe')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-all duration-200 cursor-pointer ${
            activeArt === 'globe'
              ? 'bg-blue-600/80 text-white shadow-xs'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title="Earth Network Flow"
          aria-label="Switch to Earth Flow"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Earth</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveArt('petals')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-all duration-200 cursor-pointer ${
            activeArt === 'petals'
              ? 'bg-purple-600/80 text-white shadow-xs'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title="Moonlit Petals"
          aria-label="Switch to Moonlit Petals"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Petals</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAutoSwitchEnabled((prev) => !prev)}
          className={`p-1.5 rounded-full transition-colors cursor-pointer text-zinc-400 hover:text-white ${
            isAutoSwitchEnabled ? 'hover:bg-white/10' : 'bg-white/10 text-zinc-200'
          }`}
          title={isAutoSwitchEnabled ? 'Pause Auto-Switch' : 'Resume Auto-Switch'}
          aria-label={isAutoSwitchEnabled ? 'Pause Auto-Switch' : 'Resume Auto-Switch'}
        >
          {isAutoSwitchEnabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
      </div>
    </div>
  )
}
export default AuthArtSwitcher
