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
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Initial Load: Default to dark theme for consistent, premium UI
  useEffect(() => {
    const localTheme = localStorage.getItem('trinetra-theme') as Theme
    const activeTheme = localTheme === 'light' ? 'light' : 'dark'
    setTheme(activeTheme)

    async function syncThemeFromDb() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme')
            .eq('id', user.id)
            .single()
          
          if (profile?.theme && (profile.theme === 'light' || profile.theme === 'dark')) {
            setTheme(profile.theme as Theme)
          }
        }
      } catch (err) {
        console.error('Failed to load theme preference:', err)
      }
    }
    // Mark mounted so client renders correct icon immediately
    setMounted(true)
    // Fire DB sync in background after mount
    syncThemeFromDb()
  }, [])

  // Ensure theme is applied to the ROOT html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])


  // Synchronous toggle — DB sync fires in background, never blocks UI
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    // 1. Update React state immediately
    setTheme(nextTheme)
    // 2. Update localStorage immediately
    localStorage.setItem('trinetra-theme', nextTheme)
    // 3. Update DOM class immediately (no re-render wait)
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
      className="dashboard-theme-root min-h-screen w-full bg-[var(--background)] text-[var(--body)] transition-colors duration-200"
    >
      {children}
    </div>
  )
}
