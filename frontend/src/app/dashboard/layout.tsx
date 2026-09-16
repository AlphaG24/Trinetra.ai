import { ThemeProvider, DashboardThemeWrapper } from '@/src/components/ui/theme-provider'
import { Sidebar } from '@/src/components/dashboard/Sidebar'
import { Topbar } from '@/src/components/dashboard/Topbar'
import { NetworkStatusBanner } from '@/src/components/shared/NetworkStatusBanner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardThemeWrapper>
        <NetworkStatusBanner />
        <Sidebar />
        <Topbar />
        <main className="lg:pl-60 pt-16">
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </DashboardThemeWrapper>
    </ThemeProvider>
  )
}