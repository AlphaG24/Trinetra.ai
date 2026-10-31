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
  let user: any = null

  try {
    const supabase = await createClient()
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error('Auth timeout') }), 1500)
    )
    const res = await Promise.race([authPromise, timeoutPromise])
    user = res?.data?.user
  } catch (err) {
    // Proceed - client handles auth state via AuthProvider
  }

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
