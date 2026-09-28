'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/src/components/dashboard/Sidebar'
import { Topbar } from '@/src/components/dashboard/Topbar'
import { useDashboardStore } from '@/src/store/dashboardStore'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const { isSidebarCollapsed } = useDashboardStore()

  useEffect(() => {
    setMounted(true)
  }, [])

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
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </>
  )
}

export default DashboardShell

