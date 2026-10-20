'use client'

import { Suspense } from 'react'
import { RevenueDashboardClient } from '@/src/components/dashboard/revenue/RevenueDashboardClient'

export default function RevenuePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--muted)]">Loading revenue analytics...</div>}>
      <RevenueDashboardClient embedded={false} />
    </Suspense>
  )
}
