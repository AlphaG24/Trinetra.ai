import { ThemeProvider, DashboardThemeWrapper } from '@/src/components/ui/theme-provider'
import { DashboardShell } from '@/src/components/dashboard/DashboardShell'
import { NetworkStatusBanner } from '@/src/components/shared/NetworkStatusBanner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardThemeWrapper>
        <NetworkStatusBanner />
        <DashboardShell>{children}</DashboardShell>
      </DashboardThemeWrapper>
    </ThemeProvider>
  )
}