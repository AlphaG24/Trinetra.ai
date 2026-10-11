import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ThemeProvider, DashboardThemeWrapper } from '@/src/components/ui/theme-provider'
import { AdminTopbar } from '@/src/components/admin/AdminTopbar'
import { AdminSidebar } from '@/src/components/admin/AdminSidebar'
import { AdminIdleWatcher } from '@/src/components/admin/AdminIdleWatcher'

export const metadata = {
  title: 'Admin Control Center — Trinetra AI',
  description: 'Enterprise Management & Platform Administration',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  let profile: any = null
  try {
    const { data } = await adminClient
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', user.id)
      .maybeSingle()
    profile = data
  } catch (err) {
    console.warn('[AdminLayout] Profile fetch error, falling back to auth metadata & email:', err)
  }

  const userEmail = (user.email || profile?.email || '').toLowerCase().trim()
  const isSuperAdminByEmail = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').includes(userEmail)
  const metaRole = (user.app_metadata?.role || user.user_metadata?.role || '').toLowerCase().trim()
  const dbRole = (profile?.role || '').toLowerCase().trim()

  const userRole = isSuperAdminByEmail ? 'super_admin' : (dbRole || metaRole || 'client')
  const isAdmin = isSuperAdminByEmail || userRole === 'admin' || userRole === 'super_admin'

  // Auto-heal profiles table: ensure superadmin is properly stamped in database
  if (isAdmin && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
    try {
      await adminClient.from('profiles').upsert({
        id: user.id,
        email: user.email,
        role: isSuperAdminByEmail ? 'super_admin' : userRole,
        full_name: profile?.full_name || user.user_metadata?.full_name || 'Super Admin',
      }, { onConflict: 'id' })
    } catch (err) {
      console.warn('[AdminLayout] Failed to auto-heal profile role:', err)
    }
  }

  if (!isAdmin) {
    console.warn(`[Security Alert] Non-admin user ${userEmail} (${user.id}) denied access to /admin. Redirecting to /dashboard.`)
    redirect('/dashboard')
  }

  return (
    <ThemeProvider>
      <DashboardThemeWrapper>
        <AdminTopbar />
        <AdminSidebar />
        <main className="pt-16 md:pl-64 pl-0 transition-all duration-300 min-h-screen">
          <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>
        <AdminIdleWatcher />
      </DashboardThemeWrapper>
    </ThemeProvider>
  )
}

