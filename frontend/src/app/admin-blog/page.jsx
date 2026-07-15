import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import AdminBlog from "@/src/components/pages/AdminBlog";

export const metadata = {
  title: "Admin Blog | Trinetra AI",
};

export default async function AdminBlogRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check admin role in database
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminBlog />;
}
