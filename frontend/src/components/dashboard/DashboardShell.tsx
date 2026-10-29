'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/src/components/dashboard/Sidebar'
import { Topbar } from '@/src/components/dashboard/Topbar'
import { useDashboardStore } from '@/src/store/dashboardStore'
import { useAuth } from '@/src/components/providers/AuthProvider'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [mounted, setMounted] = useState(false)
  const { isSidebarCollapsed } = useDashboardStore()

  useEffect(() => {
    setMounted(true)
    const email = (user?.email || profile?.email || '').toLowerCase().trim()
    if (email === 'raghav00424@gmail.com' || email === 'raghav@trinetra.ai') {
      router.replace('/admin')
    }
  }, [user?.email, profile?.email, router])

  // Hydration-safe: always use expanded layout (pl-60) for SSR baseline.
  // After mount, switch to real collapsed state. This matches what Sidebar renders on server.
  const collapsed = mounted ? isSidebarCollapsed : false

  return (
    <>
      <Sidebar />
      <Topbar />
      <main
        suppressHydrationWarning
        className={`pt-16 transition-all duration-300 ease-in-out ${
          collapsed ? 'md:pl-16' : 'md:pl-60'
        } pl-0`}
      >
        <div className="px-4 pt-2.5 pb-6 md:px-6 md:pt-3.5 md:pb-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </>
  )
}

export default DashboardShell

