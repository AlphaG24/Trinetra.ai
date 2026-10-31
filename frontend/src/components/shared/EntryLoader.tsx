'use client'

import { useEffect, useState } from 'react'

export function EntryLoader() {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Only run on the very first entry of the browser session
    try {
      const alreadyLoaded = sessionStorage.getItem('vaakriti_entry_loaded')
      if (alreadyLoaded) {
        return
      }

      // First time in this session: display entry splash
      setVisible(true)

      // Start fade out at 1.1s
      const fadeTimer = setTimeout(() => {
        setFadeOut(true)
      }, 1100)

      // Unmount completely at 1.4s and mark session
      const unmountTimer = setTimeout(() => {
        setVisible(false)
        try {
          sessionStorage.setItem('vaakriti_entry_loaded', 'true')
        } catch {}
      }, 1450)

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(unmountTimer)
      }
    } catch {
      // If sessionStorage is unavailable, bypass
      setVisible(false)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999999] bg-[#09090b] text-white flex flex-col items-center justify-center select-none pointer-events-none transition-opacity duration-300 ease-out ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-3.5 text-center px-4 max-w-lg animate-in fade-in zoom-in-95 duration-500">
        {/* Brand Wordmark (matching Sarvam minimalist typography) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white font-sans lowercase">
          vaakriti
        </h1>

        {/* Hero Tagline */}
        <p className="text-sm sm:text-base md:text-lg font-medium text-zinc-400 tracking-tight">
          The Creation of Sovereign Intelligence
        </p>

        {/* Minimal Progress Line Indicator */}
        <div className="w-32 h-[2px] bg-zinc-800 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-white rounded-full animate-[progress_1.1s_ease-in-out_forwards]" />
        </div>
      </div>
    </div>
  )
}
