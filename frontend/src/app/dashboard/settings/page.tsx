import { Suspense } from 'react'
import SettingsClient from '@/src/components/settings/SettingsClient'

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedParams = await searchParams
  const initialTab = resolvedParams?.tab || 'profile'

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    }>
      <SettingsClient initialTab={initialTab} />
    </Suspense>
  )
}
