'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Sun, 
  Moon, 
  LayoutDashboard, 
  LogOut, 
  User, 
  Menu, 
  X, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/src/components/providers/AuthProvider'
import { useTheme } from '@/src/components/ui/theme-provider'
import { useDashboardStore } from '@/src/store/dashboardStore'

interface AdminTopbarProps {
  onMenuClick?: () => void
  isMobileSidebarOpen?: boolean
}

export function AdminTopbar({ onMenuClick, isMobileSidebarOpen }: AdminTopbarProps) {
  const router = useRouter()
  const { user: authUser, profile: authProfile } = useAuth()
  const { theme, toggleTheme, mounted } = useTheme()
  const { isMobileSidebarOpen: storeMobileOpen, toggleMobileSidebar } = useDashboardStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [name, setName] = useState<string>('')

  const mobileOpen = isMobileSidebarOpen !== undefined ? isMobileSidebarOpen : storeMobileOpen
  const handleMenuToggle = onMenuClick || toggleMobileSidebar

  useEffect(() => {
    if (authProfile?.full_name) {
      setName(authProfile.full_name)
    } else if (authUser?.user_metadata?.full_name) {
      setName(authUser.user_metadata.full_name)
    }
    if (authUser?.email) {
      setEmail(authUser.email)
    }
  }, [authUser, authProfile])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 600))
      ])
    } catch {}
    try {
      sessionStorage.clear()
      localStorage.removeItem('trinetra_auth_profile_cache')
      localStorage.removeItem('trinetra_user_role')
      localStorage.removeItem('supabase.auth.token')
    } catch {}
    window.location.href = '/login?signed_out=true'
  }

  const displayName = name || (email ? email.split('@')[0] : 'Administrator')

  return (
    <header className="fixed top-0 right-0 left-0 h-16 bg-[var(--card-bg)] border-b border-[var(--border)] z-[999] transition-colors duration-200">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left Side: Mobile Hamburger & Trident Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMenuToggle}
            className="md:hidden p-2 rounded-xl text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-3 group">
            <img
              src="/trident.png"
              alt="Vaakriti"
              className="dynamic-logo h-11 md:h-12 w-auto object-contain -mt-0.5 transition-transform duration-200 group-hover:scale-105"
            />
            <div className="flex items-center gap-2">
              <span className="font-playfair font-black text-sm md:text-base text-[var(--heading)] tracking-tight">
                Vaakriti
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/25">
                <ShieldCheck className="w-3 h-3" />
                Admin Center
              </span>
            </div>
          </Link>
        </div>

        {/* Right Side: Theme Toggle, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] transition-all cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Color Theme"
              suppressHydrationWarning
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-violet-600" />
              )}
            </button>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--hover-bg)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
              suppressHydrationWarning
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {displayName[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-[var(--heading)] font-playfair max-w-[120px] truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-violet-500 font-semibold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] hidden md:block" />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-[9998] bg-transparent"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden py-1 z-[9999] animate-in fade-in duration-150">
                  <div className="px-4 py-2.5 border-b border-[var(--border)]">
                    <p className="text-xs font-bold text-[var(--heading)] font-playfair truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-[var(--muted)] truncate font-mono mt-0.5">
                      {email || 'admin@trinetra.ai'}
                    </p>
                  </div>

                  <Link
                    href="/dashboard/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--body)] hover:bg-[var(--hover-bg)] hover:text-[var(--heading)] transition-colors font-playfair font-bold"
                  >
                    <User className="w-4 h-4 text-[var(--muted)]" />
                    Profile Settings
                  </Link>

                  <div className="border-t border-[var(--border)] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false)
                      handleSignOut()
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-500 hover:bg-rose-500/10 text-left transition-colors font-playfair font-bold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminTopbar
