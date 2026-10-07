'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Bot, Users, Phone, Megaphone,
  BarChart3, CreditCard, Settings, HelpCircle, Pencil,
  ChevronLeft, ChevronRight, Calendar, Target, PhoneCall, ShieldCheck
} from 'lucide-react'

import { useAuth } from '@/src/components/providers/AuthProvider'
import { useDashboardStore } from '@/src/store/dashboardStore'

/**
 * Navigation items matching the dashboard structure:
 * Upper section: Overview, Agents, Calls, Leads, Appointments, Customers, Campaigns, Phone Numbers, Analytics, Billing
 * Lower section: Custom Agent (Deploy), KYC Vault, Settings, Support
 */
const topNavItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Agents', href: '/dashboard/agents', icon: Bot },
  { label: 'Calls', href: '/dashboard/calls', icon: PhoneCall },
  { label: 'Leads', href: '/dashboard/leads', icon: Target },
  { label: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { label: 'Phone Numbers', href: '/dashboard/phone-numbers', icon: Phone },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
]

const bottomNavItems = [
  { label: 'Custom Agent', href: '/dashboard/deploy', icon: Pencil },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Support', href: '/dashboard/support', icon: HelpCircle },
]

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname() || ''
  const [mounted, setMounted] = useState(false)
  const { role: authRole } = useAuth()
  
  const {
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    setSidebarCollapsed
  } = useDashboardStore()

  // Handle responsive collapse according to screen size after mount
  useEffect(() => {
    setMounted(true)

    const handleResize = () => {
      const width = window.innerWidth
      if (width < 768) {
        setMobileSidebarOpen(false)
      } else if (width < 1200) {
        // Split-screen or tablet: auto-collapse to icon-only mode
        setSidebarCollapsed(true)
      } else {
        // Wide screen: restore user's preference if set, otherwise expanded
        const saved = localStorage.getItem('trinetra-sidebar-collapsed')
        if (saved !== null) {
          setSidebarCollapsed(saved === 'true')
        } else {
          setSidebarCollapsed(false)
        }
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setMobileSidebarOpen, setSidebarCollapsed])

  const [role, setRole] = useState<string | null>(authRole || null)

  useEffect(() => {
    if (authRole) {
      setRole(authRole)
    } else if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('trinetra_user_role')
      if (cached) setRole(cached)
    }
  }, [authRole])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleLinkClick = () => {
    setMobileSidebarOpen(false)
    if (onClose) onClose()
  }

  // Hydration-safe: always false during SSR and first client render (before useEffect fires).
  // After mount, useEffect sets mounted=true and triggers a re-render with real values.
  // This guarantees server HTML === first client render HTML, eliminating hydration mismatch.
  const isMobileOpen = mounted ? (isOpen !== undefined ? isOpen : isMobileSidebarOpen) : false
  const collapsed = mounted ? isSidebarCollapsed : false

  const renderLink = (item: { label: string; href: string; icon: React.ElementType }) => {
    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        suppressHydrationWarning
        onClick={handleLinkClick}
        title={collapsed ? item.label : undefined}
        className={`group relative flex items-center ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-4'
        } py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 ${
          active
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
        }`}
      >
        <item.icon
          className={`w-5 h-5 shrink-0 ${
            active
              ? 'text-white dark:text-zinc-950'
              : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white'
          }`}
        />
        {!collapsed && (
          <span
            className={`font-playfair font-semibold text-[15px] transition-colors truncate ${
              active
                ? '!text-white dark:!text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
            }`}
          >
            {item.label}
          </span>
        )}
        
        {/* Floating tooltip when collapsed in desktop / split screen */}
        {collapsed && (
          <div className="absolute left-full ml-3 hidden group-hover:flex items-center z-50 pointer-events-none">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-md shadow-lg bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 whitespace-nowrap">
              {item.label}
            </span>
          </div>
        )}
      </Link>
    )
  }

  const navItemsToRender = [...topNavItems]
  if (role === 'developer_tester' || role === 'admin' || role === 'super_admin') {
    navItemsToRender.push({ label: 'Marketing Portal', href: '/dashboard/requests', icon: Settings })
  }

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={handleLinkClick}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar — uses suppressHydrationWarning as safety net */}
      <aside
        suppressHydrationWarning
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[var(--card-bg)] border-r border-[var(--border)] z-40 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isMobileOpen
            ? 'translate-x-0 w-64 shadow-2xl md:shadow-none'
            : '-translate-x-full md:translate-x-0'
        } ${
          collapsed ? 'md:w-16' : 'md:w-60'
        }`}
      >
        {/* Collapse button — rendered only after hydration to avoid SSR/client tree mismatch */}
        {mounted && (
          <button
            suppressHydrationWarning
            onClick={toggleSidebarCollapsed}
            className="hidden md:flex absolute -right-2.5 top-1 z-30 w-5 h-5 rounded-full bg-[var(--card-bg)] border border-[var(--border)] shadow-xs hover:shadow-sm items-center justify-center text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white hover:bg-[var(--hover-bg)] transition-all duration-150 cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        )}

        {/* Main Navigation links */}
        <div className="flex flex-col flex-1 min-h-0 pt-6">
          <nav suppressHydrationWarning className="flex-1 px-2.5 space-y-1 overflow-y-auto custom-scrollbar">
            {navItemsToRender.map(renderLink)}
          </nav>
        </div>

        {/* Bottom: Secondary Nav */}
        <div suppressHydrationWarning className="px-2.5 py-3 border-t border-[var(--border)] space-y-1">
          {bottomNavItems.map(renderLink)}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
