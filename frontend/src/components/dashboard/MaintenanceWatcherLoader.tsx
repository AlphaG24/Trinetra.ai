'use client'

import React, { Suspense, useState, useEffect } from 'react'
import MaintenanceWatcher from '@/src/components/dashboard/MaintenanceWatcher'

export function MaintenanceWatcherLoader({
  initialMaintenanceMode,
}: {
  initialMaintenanceMode?: boolean
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <MaintenanceWatcher initialMaintenanceMode={initialMaintenanceMode} />
    </Suspense>
  )
}

