'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Theme = 'dark' | 'light'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  
  // Synchronous initialization matching what SSR and <head> script placed on <html>
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme') as Theme
      if (docTheme === 'light' || docTheme === 'dark') return docTheme
      const localTheme = localStorage.getItem('trinetra-theme') as Theme
      if (localTheme === 'light' || localTheme === 'dark') return localTheme
    }
    return 'dark'
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Sync from database only if user hasn't explicitly chosen a local preference
    async function syncThemeFromDb() {
      try {
        const localTheme = localStorage.getItem('trinetra-theme')
        if (localTheme) return

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme')
            .eq('id', user.id)
            .single()
          
          if (profile?.theme && (profile.theme === 'light' || profile.theme === 'dark')) {
            const dbTheme = profile.theme as Theme
            setTheme(dbTheme)
            localStorage.setItem('trinetra-theme', dbTheme)
            document.cookie = `trinetra-theme=${dbTheme}; path=/; max-age=31536000; SameSite=Lax`
            document.documentElement.setAttribute('data-theme', dbTheme)
            document.documentElement.classList.remove('light', 'dark')
            document.documentElement.classList.add(dbTheme)
          }
        }
      } catch (err) {
        // Silently ignore background theme sync
      }
    }
    syncThemeFromDb()
  }, [])

  // Keep DOM in sync when theme changes
  useEffect(() => {
    const currentAttr = document.documentElement.getAttribute('data-theme')
    if (currentAttr !== theme) {
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
    }
    document.cookie = `trinetra-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`
  }, [theme])

  // Synchronous toggle — DB sync fires in background, never blocks UI
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    // 1. Update React state immediately
    setTheme(nextTheme)
    // 2. Update localStorage & Cookie immediately
    localStorage.setItem('trinetra-theme', nextTheme)
    document.cookie = `trinetra-theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`
    // 3. Update DOM class immediately (no re-render wait)
    document.documentElement.setAttribute('data-theme', nextTheme)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(nextTheme)
    
    // 4. Fire DB save in background via PATCH /api/profiles — never awaited, never blocks
    fetch('/api/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: nextTheme })
    }).catch(err => {
      console.error('Failed to save theme in background:', err)
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

export function DashboardThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div 
      suppressHydrationWarning
      className="dashboard-theme-root min-h-screen w-full bg-[var(--background)] text-[var(--body)]"
    >
      {children}
    </div>
  )
}
