import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { SupportPageClient } from '@/src/components/pages/SupportPageClient'

export const metadata = {
  title: 'Help & Support — Trinetra AI',
  description: 'Get help, raise tickets, and contact the Trinetra AI team.',
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <SupportPageClient user={user} />
}
