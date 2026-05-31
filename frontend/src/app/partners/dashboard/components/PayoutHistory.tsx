'use client'

import { CircleDollarSign } from 'lucide-react'
import {
  formatCurrency,
  formatDate,
  formatPayoutMethod,
  getNextPayoutDate,
} from '@/lib/formatters'
import EmptyState from './EmptyState'
import StatusBadge from './StatusBadge'

interface PayoutHistoryProps {
  payouts: Array<{
    id: string
    period_start: string | null
    period_end: string | null
    amount: number | string | null
    payout_method: string | null
    reference_number: string | null
    status: string | null
    paid_on: string | null
  }>
  currency: string
  approvedCommission: number
  minimumThreshold: number
  payoutDay: number
}

export default function PayoutHistory({
  payouts,
  currency,
  approvedCommission,
  minimumThreshold,
  payoutDay,
}: PayoutHistoryProps) {
  const ready = approvedCommission >= minimumThreshold

  return (
    <section className="rounded-xl border border-amber-500/15 bg-[#100d1f] p-6">
      <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
        Payouts
      </p>
      <h2 className="mb-6 text-xl font-semibold text-white">Payout History</h2>

      <div
        className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
          ready
            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
        }`}
      >
        <p className="font-medium">
          Approved &amp; ready for payout:{' '}
          {formatCurrency(approvedCommission, currency)}
        </p>
        <p className="mt-1">
          {ready
            ? `You will receive payment on ${getNextPayoutDate(payoutDay)}`
            : `You need ${formatCurrency(minimumThreshold - approvedCommission, currency)} more approved commission to qualify for next payout`}
        </p>
      </div>

      {payouts.length === 0 ? (
        <div className="rounded-xl border border-amber-500/10 bg-[#130f22]">
          <EmptyState
            icon={CircleDollarSign}
            title="No payouts processed yet."
            description={`Once your approved commission reaches ${formatCurrency(
              minimumThreshold,
              currency
            )}, a payout will be scheduled.`}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-amber-500/10">
          <table className="min-w-full">
            <thead className="bg-[#130f22]">
              <tr>
                {['Period', 'Amount', 'Method', 'Reference', 'Status', 'Paid On'].map(
                  (head) => (
                    <th
                      key={head}
                      className="px-4 py-3 text-left text-[11px] font-normal uppercase tracking-widest text-white/45"
                    >
                      {head}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr
                  key={payout.id}
                  className="border-t border-amber-500/10 transition-colors hover:bg-[#130f22]"
                >
                  <td className="px-4 py-4 text-sm text-white/80">
                    {formatDate(payout.period_start)} to {formatDate(payout.period_end)}
                  </td>
                  <td className="px-4 py-4 text-sm text-white">
                    {formatCurrency(Number(payout.amount ?? 0), currency)}
                  </td>
                  <td className="px-4 py-4 text-sm text-white/80">
                    {formatPayoutMethod(payout.payout_method)}
                  </td>
                  <td className="px-4 py-4 text-sm text-white/55">
                    {payout.reference_number || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <StatusBadge status={payout.status || 'pending'} />
                  </td>
                  <td className="px-4 py-4 text-sm text-white/80">
                    {formatDate(payout.paid_on)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
