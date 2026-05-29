import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { NotificationsPageClient } from '@/src/components/pages/NotificationsPageClient'

export const metadata = {
  title: 'Notifications — Trinetra AI',
  description: 'All your alerts and activity notifications.',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return <NotificationsPageClient initialNotifications={notifications || []} />
}
