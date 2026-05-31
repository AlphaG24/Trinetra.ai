export interface DashboardMetrics {
  pendingCommission: number
  approvedCommission: number
  paidCommission: number
  totalCommission: number
  totalReferrals: number
  qualifiedReferrals: number
  convertedReferrals: number
  pendingReferrals: number
  rejectedReferrals: number
  revenueGenerated: number
  conversionRate: number
  averageDealValue: number
  averageCommission: number
  totalPayoutsReceived: number
  pendingPayouts: number
  lastReferralDate: string | null
  thisMonthReferrals: number
  thisMonthCommission: number
}

interface MetricReferral {
  commission_status?: string | null
  commission_amount?: number | string | null
  status?: string | null
  deal_value?: number | string | null
  created_at?: string | null
}

interface MetricPayout {
  status?: string | null
  amount?: number | string | null
}

export function computeMetrics(
  referrals: MetricReferral[],
  payouts: MetricPayout[]
): DashboardMetrics {
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  const pendingCommission = referrals
    .filter((r) => r.commission_status === 'pending')
    .reduce((s, r) => s + Number(r.commission_amount), 0)

  const approvedCommission = referrals
    .filter((r) => r.commission_status === 'approved')
    .reduce((s, r) => s + Number(r.commission_amount), 0)

  const paidCommission = referrals
    .filter((r) => r.commission_status === 'paid')
    .reduce((s, r) => s + Number(r.commission_amount), 0)

  const converted = referrals.filter((r) => r.status === 'converted')
  const qualified = referrals.filter((r) =>
    ['qualified', 'converted'].includes(r.status || '')
  )

  const revenueGenerated = converted.reduce(
    (s, r) => s + Number(r.deal_value),
    0
  )

  const conversionRate =
    referrals.length > 0 ? (converted.length / referrals.length) * 100 : 0

  const averageDealValue =
    converted.length > 0 ? revenueGenerated / converted.length : 0

  const allCommission = referrals.reduce(
    (s, r) => s + Number(r.commission_amount),
    0
  )

  const averageCommission =
    referrals.length > 0 ? allCommission / referrals.length : 0

  const totalPayoutsReceived = payouts
    .filter((p) => p.status === 'completed')
    .reduce((s, p) => s + Number(p.amount), 0)

  const pendingPayouts = payouts
    .filter((p) => ['pending', 'processing'].includes(p.status || ''))
    .reduce((s, p) => s + Number(p.amount), 0)

  const sorted = [...referrals].sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )

  const thisMonthReferrals = referrals.filter((r) => {
    const d = new Date(r.created_at || 0)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })

  const thisMonthCommission = thisMonthReferrals.reduce(
    (s, r) => s + Number(r.commission_amount),
    0
  )

  return {
    pendingCommission,
    approvedCommission,
    paidCommission,
    totalCommission: pendingCommission + approvedCommission + paidCommission,
    totalReferrals: referrals.length,
    qualifiedReferrals: qualified.length,
    convertedReferrals: converted.length,
    pendingReferrals: referrals.filter((r) => r.status === 'pending').length,
    rejectedReferrals: referrals.filter((r) => r.status === 'rejected').length,
    revenueGenerated,
    conversionRate,
    averageDealValue,
    averageCommission,
    totalPayoutsReceived,
    pendingPayouts,
    lastReferralDate: sorted[0]?.created_at ?? null,
    thisMonthReferrals: thisMonthReferrals.length,
    thisMonthCommission,
  }
}
