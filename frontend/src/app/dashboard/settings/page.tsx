import { SettingsClientWrapper } from './SettingsClientWrapper'

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedParams = await searchParams
  const initialTab = resolvedParams?.tab || 'profile'

  return <SettingsClientWrapper initialTab={initialTab} />
}
