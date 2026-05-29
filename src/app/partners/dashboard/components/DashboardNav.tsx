'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Search, User } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

interface DashboardNavProps {
  partner: {
    full_name: string | null
    tier: string | null
    status: string | null
    referral_code: string | null
  }
}

export default function DashboardNav({ partner }: DashboardNavProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/partners')
    router.refresh()
  }

  const initials = (partner.full_name || 'P')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0c0a14]/90 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        {/* Left: Mobile logo + Tabs */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Image
              src="/trident.png"
              alt="Trinetra"
              width={28}
              height={28}
              className="h-7 w-auto"
              priority
            />
            <span className="text-sm font-semibold text-white">Trinetra AI</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {['Overview', 'Referrals', 'Payouts', 'Settings'].map((tab, i) => (
              <button
                key={tab}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                  i === 0
                    ? 'text-white underline underline-offset-[16px] decoration-2 decoration-emerald-400'
                    : 'text-white/45 hover:text-white/70'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Search data..."
              className="w-[200px] rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          <button className="relative rounded-lg p-2 text-white/40 transition hover:bg-white/[0.04] hover:text-white/70">
            <Bell className="h-[18px] w-[18px]" />
          </button>

          <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-400">
              {initials}
            </div>
            <span className="hidden text-sm font-medium text-white sm:block">
              {partner.full_name || 'Partner'}
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
