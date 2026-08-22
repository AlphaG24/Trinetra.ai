'use client'

import { useTheme } from './theme-provider'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme()

  // Render a same-size placeholder until client has hydrated
  if (!mounted) {
    return <div className="w-9 h-9" suppressHydrationWarning />
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      suppressHydrationWarning
      className="p-2 text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer border-0 focus:outline-none"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 text-violet-500" />
      )}
    </button>
  )
}
