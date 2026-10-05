'use client'

import dynamic from 'next/dynamic'

// ssr:false must live in a Client Component; MaintenanceWatcher uses
// useSearchParams + Supabase Realtime so it cannot be SSR-rendered anyway
const MaintenanceWatcher = dynamic(
  () => import('@/src/components/dashboard/MaintenanceWatcher'),
  { ssr: false }
)

export function MaintenanceWatcherLoader({
  initialMaintenanceMode,
}: {
  initialMaintenanceMode?: boolean
}) {
  return <MaintenanceWatcher initialMaintenanceMode={initialMaintenanceMode} />
}
