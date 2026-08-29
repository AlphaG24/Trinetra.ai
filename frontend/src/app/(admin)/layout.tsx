import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { AdminSidebar } from '@/src/components/admin/AdminSidebar'
import { ThemeProvider, DashboardThemeWrapper } from '@/src/components/ui/theme-provider'

export const metadata = {
  title: 'Admin Control Center — Trinetra AI',
  description: 'Enterprise Management & Platform Administration',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const host = (await headers()).get('host') || ''
  const cleanHost = host.split(':')[0].toLowerCase()
  const isProd = process.env.NODE_ENV === 'production' && !cleanHost.includes('localhost') && !cleanHost.includes('127.0.0.1')
  const adminBase = 'https://admin.trinetraedu-ai.com'

  if (isProd && cleanHost !== 'admin.trinetraedu-ai.com') {
    redirect(adminBase)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Authoritative server-side role check
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  const userRole = profile?.role
  const userEmail = (user.email || profile?.email || '').toLowerCase()
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  if (!isAdmin) {
    console.warn(`[Security Alert] Non-admin user ${userEmail} (${user.id}) denied access to /admin. Redirecting to /dashboard.`)
    redirect('/dashboard')
  }

  return (
    <ThemeProvider>
      <DashboardThemeWrapper>
        <div className="flex min-h-screen font-sans antialiased selection:bg-violet-500/30 bg-[#080010] text-[#E2E0FD]">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </DashboardThemeWrapper>
    </ThemeProvider>
  )
}
