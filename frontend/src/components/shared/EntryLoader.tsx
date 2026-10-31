'use client'

import { useEffect, useState } from 'react'

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

      // Start smooth fade out at 1.1s
      const fadeTimer = setTimeout(() => {
        setFadeOut(true)
      }, 1100)

      // Unmount completely at 1.45s and flag session
      const unmountTimer = setTimeout(() => {
        setVisible(false)
        try {
          sessionStorage.setItem('vaakriti_dashboard_entry_seen', 'true')
        } catch {}
      }, 1450)

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
      className={`fixed inset-0 z-[9999999] bg-white dark:bg-[#09090b] text-zinc-950 dark:text-white flex flex-col items-center justify-center select-none pointer-events-none transition-opacity duration-300 ease-out ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-3.5 text-center px-4 max-w-lg animate-in fade-in zoom-in-95 duration-500">
        {/* Brand Wordmark (matching Sarvam minimalist lowercase branding) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight font-sans lowercase text-zinc-950 dark:text-white">
          vaakriti
        </h1>

        {/* Hero Tagline */}
        <p className="text-sm sm:text-base md:text-lg font-medium text-zinc-600 dark:text-zinc-400 tracking-tight font-sans">
          The Creation of Sovereign Intelligence
        </p>

        {/* Minimal Progress Line Indicator - Theme Aware */}
        <div className="w-36 h-[2.5px] bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-zinc-950 dark:bg-white rounded-full animate-[progress_1.1s_ease-in-out_forwards]" />
        </div>
      </div>
    </div>
  )
}
