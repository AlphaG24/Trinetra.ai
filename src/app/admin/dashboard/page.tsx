import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDashboardClient } from '@/src/components/admin/AdminDashboardClient'

export default async function AdminDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  // Fetch all data
  const [postsRes, commentsRes, likesRes, subscribersRes] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('comments')
      .select('*, posts(title)')
      .order('created_at', { ascending: false }),
    supabase
      .from('post_likes')
      .select('*, posts(title)')
      .order('created_at', { ascending: false }),
    supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  return (
    <AdminDashboardClient
      initialPosts={postsRes.data || []}
      initialComments={commentsRes.data || []}
      initialLikes={likesRes.data || []}
      initialSubscribers={subscribersRes.data || []}
    />
  )
}
