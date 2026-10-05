import { Suspense } from 'react'
import { SettingsClient } from '@/src/components/settings/SettingsClient'

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedParams = await searchParams
  const initialTab = resolvedParams?.tab || 'profile'

  return (
    <Suspense fallback={null}>
      <SettingsClient initialTab={initialTab} />
    </Suspense>
  )
}
