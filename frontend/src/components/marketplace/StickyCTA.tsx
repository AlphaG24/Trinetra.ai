'use client'

import { useState, useEffect } from 'react'
import { Phone, Zap, Loader2 } from 'lucide-react'

interface StickyCTAProps {
  name: string
  onFreeDemo: () => void
  onTrial: () => void
  demoLoading: boolean
  trialLoading: boolean
  trialPrice: number
}

export function StickyCTA({
  name,
  onFreeDemo,
  onTrial,
  demoLoading,
  trialLoading,
  trialPrice,
}: StickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('tool-detail-hero')
      if (hero) {
        const rect = hero.getBoundingClientRect()
        // Show when the hero bottom is above the Topbar (64px)
        setIsVisible(rect.bottom < 64)
      } else {
        setIsVisible(window.scrollY > 300)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[var(--card-bg)] border-t border-[var(--border)] py-4 px-6 shadow-2xl transition-all duration-300 transform flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[1400px] mx-auto w-full lg:pl-66 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="text-left shrink-0 hidden md:block">
        <h4 className="text-sm font-bold font-display text-[var(--heading)] leading-none">{name}</h4>
        <span className="text-[10px] text-[var(--muted)] font-sans uppercase tracking-wider mt-1 block">Deploy Instantly</span>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button
          onClick={onFreeDemo}
          disabled={demoLoading || trialLoading}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer border border-[var(--border)]"
        >
          {demoLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Phone className="w-3.5 h-3.5" />
          )}
          <span>Start Free Demo</span>
        </button>

        <button
          onClick={onTrial}
          disabled={demoLoading || trialLoading}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--secondary)] text-[var(--heading)] hover:bg-[var(--primary-bg)] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer border border-[var(--border)]"
        >
          {trialLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          <span>Start ₹{trialPrice} Trial</span>
        </button>
      </div>
    </div>
  )
}
