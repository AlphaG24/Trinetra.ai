import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { computeMetrics } from '@/lib/computeMetrics'
import { findOrCreatePartnerForUser, normalizeReferral } from '@/lib/partners'
import { formatCurrency, formatDate } from '@/lib/formatters'
import DashboardShell from './components/DashboardShell'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/partners/login')
  }

  const partner = await findOrCreatePartnerForUser(session.user)

  const { data: policy } = await supabase
    .from('commission_policy')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()

  const { data: referrals } = await supabase
    .from('partner_referrals')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false })

  const { data: payouts } = await supabase
    .from('partner_payouts')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false })

  const normalizedReferrals = (referrals ?? []).map((r) => normalizeReferral(r))
  const metrics = computeMetrics(normalizedReferrals, payouts ?? [])
  const effectiveRate =
    partner.commission_rate_override ?? partner.commission_rate ?? policy?.commission_rate ?? 20
  const currency = policy?.currency ?? partner.currency ?? 'INR'
  const referralLink = `https://trinetra.ai/?ref=${partner.referral_code}`

  return (
    <DashboardShell
      partner={partner}
      policy={policy}
      metrics={metrics}
      referrals={normalizedReferrals}
      payouts={payouts ?? []}
      effectiveRate={effectiveRate}
      currency={currency}
      referralLink={referralLink}
    />
  )
}
