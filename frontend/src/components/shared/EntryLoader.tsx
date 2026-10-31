'use client'

import { useEffect, useState } from 'react'
import { VaakritiWordmark } from '@/components/ui/VaakritiWordmark'

export function EntryLoader() {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Only run on initial entrance to the dashboard in this session
    try {
      const alreadyLoaded = sessionStorage.getItem('vaakriti_dashboard_entry_seen')
      if (alreadyLoaded) {
        return
      }

      // Show loader immediately
      setVisible(true)

      // Start smooth fade out at 2.4s so the entire revealing animation is fully appreciated
      const fadeTimer = setTimeout(() => {
        setFadeOut(true)
      }, 2400)

      // Unmount completely at 2.9s and flag session
      const unmountTimer = setTimeout(() => {
        setVisible(false)
        try {
          sessionStorage.setItem('vaakriti_dashboard_entry_seen', 'true')
        } catch {}
      }, 2900)

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(unmountTimer)
      }
    } catch {
      setVisible(false)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999999] bg-white dark:bg-[#080010] text-zinc-950 dark:text-white flex flex-col items-center justify-center select-none pointer-events-none transition-opacity duration-500 ease-out ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <style jsx>{`
        @keyframes revealLogo {
          0% {
            clip-path: inset(0 100% 0 0);
            opacity: 0;
            transform: scale(0.96) translateX(-8px);
          }
          30% {
            opacity: 1;
          }
          100% {
            clip-path: inset(0 0% 0 0);
            opacity: 1;
            transform: scale(1) translateX(0);
          }
        }
        @keyframes shimmerLine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes subtitleFade {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes progressBar {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        .animate-reveal-logo {
          animation: revealLogo 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-subtitle {
          animation: subtitleFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards;
          opacity: 0;
        }
        .animate-progress {
          animation: progressBar 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      <div className="flex flex-col items-center space-y-4 text-center px-4 max-w-lg">
        {/* Official Vector Logo Wordmark with Smooth Reveal Effect */}
        <div className="relative overflow-hidden py-1 px-2">
          <div className="animate-reveal-logo">
            <VaakritiWordmark className="w-52 sm:w-64 md:w-80 h-auto text-zinc-950 dark:text-white transition-colors" />
          </div>
        </div>

        {/* Hero Tagline - Reveals after Logo */}
        <p className="animate-subtitle text-xs sm:text-sm md:text-base font-medium text-zinc-500 dark:text-zinc-400 tracking-wide font-sans">
          The Creation of Sovereign Intelligence
        </p>

        {/* Minimal Progress Line Indicator - Theme Aware */}
        <div className="w-40 h-[2px] bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-zinc-950 dark:bg-white rounded-full animate-progress" />
        </div>
      </div>
    </div>
  )
}
