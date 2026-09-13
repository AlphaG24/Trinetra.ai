'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  Sparkles,
  Bell,
  PhoneCall,
  Phone,
  KeyRound,
  Lock
} from 'lucide-react'

const navItems = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Blog', href: '/admin/blog', icon: FileText },
  { name: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { name: 'Agent Templates', href: '/admin/agents/templates', icon: Bot },
  { name: 'Marketplace', href: '/admin/marketplace', icon: Store },
  { name: 'Global Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Support Tickets', href: '/admin/support', icon: LifeBuoy },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Consent Records', href: '/admin/consent-records', icon: ShieldCheck },
  { name: 'Developer Requests', href: '/admin/developer-requests', icon: KeyRound },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
  { name: 'System Config', href: '/admin/system', icon: Sliders },
  { name: 'Telephony', href: '/admin/telephony', icon: PhoneCall },
  { name: 'Phone Numbers', href: '/admin/phone-numbers', icon: Phone },
  { name: 'Security Settings', href: '/admin/system/security', icon: Lock },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 min-h-screen flex flex-col justify-between p-4 selection:bg-violet-500/30">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-800/50 pb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20 font-bold text-lg">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-sm tracking-tight">Trinetra AI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-violet-500/20 text-violet-400 uppercase border border-violet-500/30">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">Control Center</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = mounted && (pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href)))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-400 border border-violet-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-zinc-400'}`} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-zinc-800/50 px-3">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          <span>Trinetra Engine v2.0</span>
        </div>
      </div>
    </aside>
  )
}
