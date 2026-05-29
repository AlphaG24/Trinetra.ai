import { Info } from 'lucide-react'
import {
  capitalize,
  formatCurrency,
  formatDate,
  ordinal,
} from '@/lib/formatters'

interface CommissionPolicyPanelProps {
  policy: {
    policy_name?: string | null
    commission_on?: string | null
    recurring_months?: number | null
    deal_minimum_value?: number | null
    payout_cycle?: string | null
    payout_day?: number | null
    minimum_payout_threshold?: number | null
    clawback_period_days?: number | null
    cookie_duration_days?: number | null
    notes?: string | null
    updated_at?: string | null
  } | null
  effectiveRate: number
  isOverridden: boolean
  currency: string
}

export default function CommissionPolicyPanel({
  policy,
  effectiveRate,
  isOverridden,
  currency,
}: CommissionPolicyPanelProps) {
  const commissionOn =
    policy?.commission_on === 'first_payment'
      ? 'First payment of each deal'
      : policy?.commission_on === 'recurring'
        ? `Every payment for ${policy.recurring_months ?? 0} months`
        : 'Every payment, lifetime'

  const rows: [string, React.ReactNode][] = [
    ['Policy Name', policy?.policy_name || '-'],
    [
      'Commission Rate',
      isOverridden ? (
        <div key="override" className="space-y-1">
          <div className="inline-flex items-center gap-2 text-white">
            <span>Custom: {effectiveRate}%</span>
            <Info className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <p className="text-xs text-white/45">Your rate has been individually set</p>
        </div>
      ) : (
        `${effectiveRate}%`
      ),
    ],
    ['Commission On', commissionOn],
    [
      'Deal Minimum',
      `Deals must be worth at least ${formatCurrency(
        Number(policy?.deal_minimum_value ?? 0),
        currency
      )} to qualify`,
    ],
    [
      'Payout Schedule',
      `${capitalize(policy?.payout_cycle)}${
        policy?.payout_day
          ? `, on the ${ordinal(policy.payout_day)} of each period`
          : ''
      }`,
    ],
    [
      'Min. Threshold',
      `${formatCurrency(
        Number(policy?.minimum_payout_threshold ?? 0),
        currency
      )} minimum balance required for payout`,
    ],
    [
      'Clawback Period',
      `Commission reversed if client cancels within ${policy?.clawback_period_days ?? 0} days`,
    ],
    ['Cookie Window', `${policy?.cookie_duration_days ?? 0} days`],
    ['Policy Notes', policy?.notes || '-'],
  ]

  return (
    <section className="rounded-xl border border-amber-500/15 bg-[#100d1f] p-6">
      <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
        Commission
      </p>
      <h2 className="mb-6 text-xl font-semibold text-white">Commission Policy</h2>

      <div className="space-y-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="border-b border-amber-500/10 pb-4 last:border-b-0 last:pb-0"
          >
            <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
              {label}
            </p>
            <div className="text-sm leading-6 text-white/85">{value}</div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs leading-5 text-white/45">
        Commission rates are managed by Trinetra AI and may be updated with 30
        days notice. Last updated: {formatDate(policy?.updated_at ?? null)}
      </p>
    </section>
  )
}
