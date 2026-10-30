'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  Building2, 
  Bot, 
  Sliders, 
  ShieldCheck, 
  Store, 
  BarChart3, 
  LifeBuoy, 
  ScrollText,
  Bell,
  PhoneCall,
  Phone,
  KeyRound,
  Lock,
  UserCheck,
  TicketPercent,
  Receipt,
  CreditCard,
  Globe2,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

import { useDashboardStore } from '@/src/store/dashboardStore'

const navItems = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Pricing Plans', href: '/admin/plans', icon: CreditCard },
  { name: 'Enterprise Leads', href: '/admin/enterprise-leads', icon: Users },
  { name: 'Region Rules', href: '/admin/regions', icon: Globe2 },
  { name: 'Coupons & Promos', href: '/admin/coupons', icon: TicketPercent },
  { name: 'GST & B2B Monitor', href: '/admin/gst', icon: Receipt },
  { name: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { name: 'KYC Verifications', href: '/admin/kyc', icon: UserCheck },
  { name: 'Global Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
  { name: 'Phone Numbers', href: '/admin/phone-numbers', icon: Phone },
  { name: 'Telephony', href: '/admin/telephony', icon: PhoneCall },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Tenant Voice Agents', href: '/admin/agents', icon: Bot },
  { name: 'Agent Templates', href: '/admin/agents/templates', icon: Sliders },
  { name: 'Marketplace', href: '/admin/marketplace', icon: Store },
  { name: 'Developer Requests', href: '/admin/developer-requests', icon: KeyRound },
  { name: 'Consent Records', href: '/admin/consent-records', icon: ShieldCheck },
  { name: 'Support Tickets', href: '/admin/support', icon: LifeBuoy },
  { name: 'Blog', href: '/admin/blog', icon: FileText },
  { name: 'System Config', href: '/admin/system', icon: Sliders },
  { name: 'Security Settings', href: '/admin/system/security', icon: Lock },
]

interface AdminSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function AdminSidebar({
  isOpen: propIsOpen,
  onClose: propOnClose,
  isCollapsed: propIsCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const { isMobileSidebarOpen: storeMobileOpen, setMobileSidebarOpen: setStoreMobileOpen } = useDashboardStore()

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('trinetra-admin-sidebar-collapsed')
    if (saved !== null) {
      setInternalCollapsed(saved === 'true')
    }
  }, [])

  const isOpen = propIsOpen !== undefined ? propIsOpen : (mounted ? storeMobileOpen : false)
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : (mounted ? internalCollapsed : false)

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse()
    } else {
      const next = !internalCollapsed
      setInternalCollapsed(next)
      localStorage.setItem('trinetra-admin-sidebar-collapsed', String(next))
    }
  }

  const handleLinkClick = () => {
    if (propOnClose) propOnClose()
    else setStoreMobileOpen(false)
  }

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden"
          onClick={handleLinkClick}
          aria-hidden="true"
        />
      )}

      {/* Main Admin Sidebar */}
      <aside
        suppressHydrationWarning
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[var(--card-bg)] border-r border-[var(--border)] z-40 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isOpen
            ? 'translate-x-0 w-64 shadow-2xl md:shadow-none'
            : '-translate-x-full md:translate-x-0'
        } ${
          isCollapsed ? 'md:w-16' : 'md:w-64'
        }`}
      >
        {/* Desktop Collapse Toggle Button */}
        {mounted && (
          <button
            type="button"
            suppressHydrationWarning
            onClick={handleToggle}
            className="hidden md:flex absolute -right-2.5 top-3 z-30 w-5 h-5 rounded-full bg-[var(--card-bg)] border border-[var(--border)] shadow-xs hover:shadow-sm items-center justify-center text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-all duration-150 cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        )}

        {/* Scrollable Navigation Items */}
        <div className="flex flex-col flex-1 min-h-0 pt-4">
          <nav
            suppressHydrationWarning
            className="flex-1 px-2.5 space-y-1 overflow-y-auto custom-scrollbar"
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && (pathname?.startsWith(item.href) ?? false))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  suppressHydrationWarning
                  title={isCollapsed ? item.name : undefined}
                  className={`group relative flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'gap-3 px-3.5'
                  } py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'sidebar-item-active bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm'
                      : 'sidebar-item-inactive text-zinc-900 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white dark:text-zinc-950'
                        : 'text-zinc-900 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white'
                    }`}
                  />
                  {!isCollapsed && (
                    <span
                      className={`font-playfair font-semibold text-[14px] transition-colors truncate ${
                        isActive
                          ? '!text-white dark:!text-zinc-950'
                          : 'text-zinc-900 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white'
                      }`}
                    >
                      {item.name}
                    </span>
                  )}

                  {/* Floating tooltip when collapsed on desktop */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 hidden group-hover:flex items-center z-50 pointer-events-none">
                      <span className="sidebar-tooltip px-2.5 py-1 text-xs font-semibold rounded-md shadow-xl bg-zinc-900 !text-white dark:bg-zinc-800 dark:!text-white whitespace-nowrap font-playfair">
                        {item.name}
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section: Footer Info */}
        <div
          suppressHydrationWarning
          className="px-3 py-3 border-t border-[var(--border)]"
        >
          {!isCollapsed && (
            <div className="px-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
              <div className="flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-zinc-500" />
                <span className="font-playfair font-medium">Vaakriti v2.0</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-500">Active</span>
            </div>

          )}
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar
