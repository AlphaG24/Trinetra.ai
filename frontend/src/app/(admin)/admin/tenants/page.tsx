import { createClient } from '@/utils/supabase/server'
import { TenantTable } from '@/src/components/admin/TenantTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminTenantsPage() {
  const supabase = await createClient()

  // Fetch Organizations
  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  let tenants: any[] = orgs || []

  // Fallback to profiles table if organizations is empty
  if (tenants.length === 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    tenants = profiles || []
  }

  // Fetch all wallets for prepaid balance overview
  const { data: wallets } = await supabase
    .from('wallets')
    .select('organization_id, balance_paisa, current_spend_paisa')

  const walletMap: Record<string, any> = {}
  wallets?.forEach((w) => {
    if (w.organization_id) walletMap[w.organization_id] = w
  })

  // Fetch voice calls for minutes used overview
  const { data: calls } = await supabase
    .from('voice_calls')
    .select('organization_id, duration_seconds')

  const minutesMap: Record<string, number> = {}
  calls?.forEach((c) => {
    if (c.organization_id) {
      minutesMap[c.organization_id] = (minutesMap[c.organization_id] || 0) + (c.duration_seconds || 0)
    }
  })

  // Fetch latest KYC document status per organization / user
  const { data: kycDocs } = await supabase
    .from('kyc_documents')
    .select('organization_id, user_id, status, created_at')
    .order('created_at', { ascending: false })

  const kycMap: Record<string, string> = {}
  kycDocs?.forEach((doc) => {
    if (doc.organization_id && !kycMap[doc.organization_id]) {
      kycMap[doc.organization_id] = doc.status
    }
    if (doc.user_id && !kycMap[doc.user_id]) {
      kycMap[doc.user_id] = doc.status
    }
  })

  // Enrich each tenant with accurate minutes, wallet, plan, and KYC status (Task 5.7)
  const enrichedTenants = tenants.map((t) => {
    const orgId = t.id
    const wallet = walletMap[orgId]
    const totalSecs = minutesMap[orgId] || 0
    const totalMinutes = Math.ceil(totalSecs / 60)
    const kycStatus = kycMap[orgId] || t.kyc_status || 'unsubmitted'

    return {
      ...t,
      minutes_used: totalMinutes,
      wallet_balance_paisa: wallet?.balance_paisa ?? 0,
      current_spend_paisa: wallet?.current_spend_paisa ?? 0,
      plan_tier: t.metadata?.billing_model || t.plan_tier || 'starter',
      kyc_status: kycStatus,
      status: t.is_trial ? 'trial' : t.is_active === false ? 'suspended' : (t.status || 'active'),
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
          Tenant Management
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Complete customer overview: minutes used, prepaid wallet, active plan, and KYC status.
        </p>
      </div>

      <TenantTable tenants={enrichedTenants} />
    </div>
  )
}
