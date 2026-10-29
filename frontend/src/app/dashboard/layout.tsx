import { ThemeProvider, DashboardThemeWrapper } from '@/src/components/ui/theme-provider'
import { DashboardShell } from '@/src/components/dashboard/DashboardShell'
import { NetworkStatusBanner } from '@/src/components/shared/NetworkStatusBanner'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'

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
        <NetworkStatusBanner />
        <DashboardShell>{children}</DashboardShell>
      </DashboardThemeWrapper>
    </ThemeProvider>
  )
}