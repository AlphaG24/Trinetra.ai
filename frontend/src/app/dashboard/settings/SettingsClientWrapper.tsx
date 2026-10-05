'use client'

import dynamic from 'next/dynamic'

// ssr:false is only valid inside a Client Component, so we wrap it here
const SettingsClient = dynamic(
  () => import('@/src/components/settings/SettingsClient').then(mod => mod.SettingsClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    ),
  }
)

export function SettingsClientWrapper({ initialTab }: { initialTab: string }) {
  return <SettingsClient initialTab={initialTab} />
}
