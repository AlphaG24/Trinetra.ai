'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SettingsClient } from '@/src/components/settings/SettingsClient'

function SettingsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'profile'

  return <SettingsClient initialTab={initialTab} />
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}

