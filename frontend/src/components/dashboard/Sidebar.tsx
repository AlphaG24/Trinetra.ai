'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Bot, Users, Phone, Megaphone,
  BarChart3, CreditCard, Settings, HelpCircle, Pencil, X
} from 'lucide-react'

/**
 * Navigation items matching the reference image exactly:
 * Upper section: Overview, Agents, Customers, Phone Numbers, Campaigns, Analytics, Billing
 * Lower section: Custom Agent (Deploy), Settings, Support
 */
const topNavItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Agents', href: '/dashboard/agents', icon: Bot },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Phone Numbers', href: '/dashboard/phone-numbers', icon: Phone },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
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

  useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = (href: string) => {
    if (!mounted) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderLink = (item: { label: string; href: string; icon: React.ElementType }) => {
    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 ${active
            ? 'bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 font-semibold'
            : 'text-[var(--body)] hover:bg-[var(--hover-bg)] hover:text-[var(--heading)]'
          }`}
      >
        <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-violet-600 dark:text-violet-400' : 'text-[var(--muted)]'}`} />
        <span className="font-playfair font-semibold text-[15px]">{item.label}</span>
      </Link>
    )
  }

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 bg-[var(--card-bg)] border-r border-[var(--border)] z-40 flex flex-col justify-between transition-transform duration-200 ${isOpen === false ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        }`}
    >
      {/* Top: Navigation */}
      <div className="flex flex-col flex-1 min-h-0 pt-4">
        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {topNavItems.map(renderLink)}
        </nav>
      </div>

      {/* Bottom: Secondary Nav */}
      <div className="px-3 py-3 border-t border-[var(--border)] space-y-0.5">
        {bottomNavItems.map(renderLink)}
      </div>
    </aside>
  )
}

export default Sidebar
