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

  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (notifError) {
    console.error('[Notifications Page] Failed to fetch user notifications:', notifError)
  }

  const mappedNotifications = (notifications || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    payload: n.payload || null,
    created_at: n.created_at,
    is_read: !!n.is_read,
    action_url: n.action_url || null,
    action_text: n.action_text || n.action_label || null
  }))

  return <NotificationsPageClient initialNotifications={mappedNotifications} userId={user.id} />
}
