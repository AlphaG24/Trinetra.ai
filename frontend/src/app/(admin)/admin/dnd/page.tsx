import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DNDRegistryClient } from './DNDRegistryClient'

export const dynamic = 'force-dynamic'

export default async function AdminDndPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'super_admin'].includes(profile?.role || '')) {
    redirect('/dashboard')
  }

  return <DNDRegistryClient />
}
