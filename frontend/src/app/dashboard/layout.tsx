import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { Topbar } from '@/src/components/dashboard/Topbar'
import { Sidebar } from '@/src/components/dashboard/Sidebar'
import { DashboardInitializer } from '@/src/components/dashboard/DashboardInitializer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch initial state
  const [
    { data: profile },
    { data: subscription },
    { data: agents }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*, plan:plans(*)').eq('user_id', user.id).single(),
    supabase.from('user_agents').select('*').eq('user_id', user.id)
  ])

  // No profile guard here — the Overview page (/dashboard) uses a soft redirect
  // to guide users to /dashboard/profile if their profile is incomplete.
  // Users can freely navigate to any other dashboard route.

  return (
    <DashboardInitializer profile={profile} plan={subscription?.plan} agents={agents || []}>
      <div className="flex h-screen bg-[#080810] text-white overflow-hidden">
        <Topbar user={user} profile={profile} plan={subscription?.plan} />
        <Sidebar agents={agents || []} />
        <main className="flex-1 overflow-y-auto pt-16 p-6 lg:ml-60 transition-all duration-300">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </DashboardInitializer>
  )
}
