import { Metadata } from 'next'
import { ThemeProvider, DashboardThemeWrapper } from '@/src/components/ui/theme-provider'
import { DashboardShell } from '@/src/components/dashboard/DashboardShell'
import { NetworkStatusBanner } from '@/src/components/shared/NetworkStatusBanner'
import { EntryLoader } from '@/src/components/shared/EntryLoader'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Dashboard — Vaakriti',
  description: 'Enterprise AI Voice Agent Management Dashboard',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const userEmail = (user.email || '').toLowerCase().trim()
    if (userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai') {
      redirect('/admin')
    }
  }

  return (
    <ThemeProvider>
      <DashboardThemeWrapper>
        <EntryLoader />
        <NetworkStatusBanner />
        <DashboardShell>{children}</DashboardShell>
      </DashboardThemeWrapper>
    </ThemeProvider>
  )
}
