import { createClient } from '@/utils/supabase/server'
import { TenantTable } from '@/components/admin/TenantTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminTenantsPage() {
  const supabase = await createClient()

  // Fetch Organizations
  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  let tenants = orgs || []

  // Fallback to profiles table if organizations is empty
  if (tenants.length === 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    tenants = profiles || []
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
          Tenant Management
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Monitor, inspect, and manage enterprise client organizations and accounts.
        </p>
      </div>

      <TenantTable tenants={tenants} />
    </div>
  )
}
