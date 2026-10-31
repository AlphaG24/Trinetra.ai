import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DeployPageClient } from '@/src/components/pages/DeployPageClient'

export const metadata = {
  title: 'Deploy Custom Agent — Vaakriti AI',
  description: 'Deploy custom voice and communication agents for your enterprise.',
}

export default async function DeployPage() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) redirect('/login')

    // Fetch active platform services safely
    const { data: services } = await supabase
      .from('platform_services')
      .select('*')
      .eq('is_visible_in_marketplace', true)
      .order('name', { ascending: true })

    return <DeployPageClient user={user} services={services || []} />
  } catch (err: any) {
    console.error('[DeployPage Server Error]', err)
    return <DeployPageClient user={{ id: 'current_user' }} services={[]} />
  }
}
