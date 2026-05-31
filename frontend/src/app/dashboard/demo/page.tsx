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

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)

  return <DemoCenter agents={agents || []} />
}
