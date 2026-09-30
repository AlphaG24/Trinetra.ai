import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function DeprecatedRevenuePage() {
  redirect('/dashboard/analytics?tab=revenue')
}
