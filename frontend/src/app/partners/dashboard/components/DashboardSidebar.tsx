'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  CreditCard,
  HelpCircle,
  LayoutGrid,
  Link2,
  LogOut,
  Settings,
  Users,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

interface DashboardSidebarProps {
  partnerName: string | null
  partnerTier: string | null
  onGenerateLink?: () => void
}

const navItems = [
  { label: 'Overview', icon: LayoutGrid, href: '/partners/dashboard' },
  { label: 'Referrals', icon: Users, href: '/partners/dashboard#referrals' },
  { label: 'Payouts', icon: CreditCard, href: '/partners/dashboard#payouts' },
  { label: 'Analytics', icon: BarChart3, href: '/partners/dashboard#analytics' },
  { label: 'Settings', icon: Settings, href: '/partners/dashboard#settings' },
]

export default function DashboardSidebar({
  partnerName,
  partnerTier,
  onGenerateLink,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/partners')
    router.refresh()
  }

  const tierLabel =
    partnerTier === 'platinum'
      ? 'PLATINUM PARTNER'
      : partnerTier === 'gold'
        ? 'GOLD PARTNER'
        : partnerTier === 'silver'
          ? 'SILVER PARTNER'
          : 'PARTNER'

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col border-r border-white/[0.06] bg-[#0c0a14] max-lg:hidden">
      {/* Brand */}
      <div className="flex flex-col gap-1 border-b border-white/[0.06] px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <Image
            src="/trident.png"
            alt="Trinetra"
            width={28}
            height={28}
            className="h-7 w-auto drop-shadow-[0_0_10px_rgba(245,197,24,0.2)]"
            priority
          />
          <span className="text-[15px] font-semibold tracking-wide text-white">
            Trinetra AI
          </span>
        </Link>
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-500/70">
          {tierLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.href === pathname
          const Icon = item.icon

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] ${
                  isActive ? 'text-emerald-400' : 'text-white/35 group-hover:text-white/60'
                }`}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col gap-2 border-t border-white/[0.06] px-3 py-4">
        <button
          type="button"
          onClick={onGenerateLink}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-[13px] font-semibold text-black transition hover:bg-emerald-400"
        >
          <Link2 className="h-4 w-4" />
          Generate Link
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-white/45 transition hover:bg-white/[0.04] hover:text-white/70"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          Support
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-white/45 transition hover:bg-white/[0.04] hover:text-red-400"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Logout
        </button>
      </div>
    </aside>
  )
}
