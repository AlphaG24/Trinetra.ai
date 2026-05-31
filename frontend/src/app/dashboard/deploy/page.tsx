import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { DeployPageClient } from '@/src/components/pages/DeployPageClient'

export const metadata = {
  title: 'Deploy Custom AI — Trinetra AI',
  description: 'Deploy your custom voice and chat agents to production.',
}

export default async function DeployPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <DeployPageClient user={user} />
}
