import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { findOrCreatePartnerForUser } from '@/lib/partners'
import DashboardNav from './components/DashboardNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/partners/login')
  }

  const partner = await findOrCreatePartnerForUser(user)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <DashboardNav partner={partner} />
      {children}
    </div>
  )
}
