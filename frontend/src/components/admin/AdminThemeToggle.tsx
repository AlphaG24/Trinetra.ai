'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export function AdminThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedTheme = localStorage.getItem('trinetra-admin-theme') as 'light' | 'dark' | null
    if (storedTheme) {
      setTheme(storedTheme)
      if (storedTheme === 'light') {
        document.documentElement.setAttribute('data-admin-theme', 'light')
      } else {
        document.documentElement.removeAttribute('data-admin-theme')
      }
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('trinetra-admin-theme', newTheme)
    
    if (newTheme === 'light') {
      document.documentElement.setAttribute('data-admin-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-admin-theme')
    }
  }

  if (!mounted) {
    return null // Avoid hydration mismatch
  }

  return (
    <>
      {/* 
        Injecting the light theme CSS variables globally, but they ONLY apply 
        when the html tag has data-admin-theme="light".
        We scope it heavily so it doesn't leak to the regular dashboard.
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root[data-admin-theme="light"] body {
          --background: #F0F2F5 !important;
          --foreground: #4B5563 !important;
          background-color: #F0F2F5 !important;
          color: #4B5563 !important;
        }
        
        :root[data-admin-theme="light"] .bg-zinc-950,
        :root[data-admin-theme="light"] .bg-zinc-900\\/40,
        :root[data-admin-theme="light"] .bg-\\[var\\(--card-bg\\)\\] {
          background-color: #FFFFFF !important;
        }
        
        :root[data-admin-theme="light"] .border-zinc-800\\/80,
        :root[data-admin-theme="light"] .border-zinc-800\\/50,
        :root[data-admin-theme="light"] .border-zinc-800\\/60,
        :root[data-admin-theme="light"] .border-\\[var\\(--border\\)\\] {
          border-color: #E2E8F0 !important;
        }
        
        :root[data-admin-theme="light"] .text-white,
        :root[data-admin-theme="light"] .text-zinc-100 {
          color: #1F2937 !important;
        }
        
        :root[data-admin-theme="light"] .text-zinc-400,
        :root[data-admin-theme="light"] .text-zinc-500 {
          color: #6B7280 !important;
        }
        
        :root[data-admin-theme="light"] .hover\\:text-white:hover {
          color: #111827 !important;
        }
        
        :root[data-admin-theme="light"] .hover\\:bg-zinc-900\\/60:hover {
          background-color: #F3F4F6 !important;
        }
      `}} />
      
      <button
        onClick={toggleTheme}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-violet-500 hover:bg-violet-500/10 border border-transparent transition-all"
        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      >
        {theme === 'light' ? (
          <>
            <Moon className="w-4 h-4" />
            <span>Dark Mode</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4" />
            <span>Light Mode</span>
          </>
        )}
      </button>
    </>
  )
}
