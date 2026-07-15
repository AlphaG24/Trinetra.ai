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
    .from('official_notifications')
    .select('*, user_read_notifications!left(read_at)')
    .order('created_at', { ascending: false })
    .limit(50)

  const mappedNotifications = (notifications || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    created_at: n.created_at,
    is_read: n.user_read_notifications && n.user_read_notifications.length > 0
  }))

  return <NotificationsPageClient initialNotifications={mappedNotifications} userId={user.id} />
}
