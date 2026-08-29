import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { ThemeProvider, DashboardThemeWrapper } from '@/src/components/ui/theme-provider'
import { Sidebar } from '@/src/components/dashboard/Sidebar'
import { Topbar } from '@/src/components/dashboard/Topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get('host') || ''
  const cleanHost = host.split(':')[0].toLowerCase()
  const isProd = process.env.NODE_ENV === 'production' && !cleanHost.includes('localhost') && !cleanHost.includes('127.0.0.1')
  const appBase = 'https://app.trinetraedu-ai.com'

  if (isProd && cleanHost !== 'app.trinetraedu-ai.com') {
    redirect(appBase)
  }

  return (
    <ThemeProvider>
      <DashboardThemeWrapper>
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