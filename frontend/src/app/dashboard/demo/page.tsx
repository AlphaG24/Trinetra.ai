export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { DemoCenter } from '@/src/components/demo/DemoCenter'

export const metadata = {
  title: 'Demo Center — Trinetra AI',
  description: 'Test your AI agents live before sharing with customers.',
}

export default async function DemoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Highly efficient check for deployed agents
  const { count } = await supabase
    .from('user_agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (count && count > 0) {
    redirect('/dashboard')
  }

  return <DemoCenter agents={[]} />
}
