'use client'

import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'
import EmptyState from './EmptyState'

interface PerformanceChartProps {
  referrals: Array<{
    created_at: string | null
    commission_amount: number | string | null
  }>
  currency: string
}

export default function PerformanceChart({
  referrals,
  currency,
}: PerformanceChartProps) {
  const data = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = startOfMonth(subMonths(new Date(), 5 - index))

      return {
        key: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'MMM'),
        referrals: 0,
        commission: 0,
      }
    })

    referrals.forEach((referral) => {
      if (!referral.created_at) return

      const key = format(startOfMonth(new Date(referral.created_at)), 'yyyy-MM')
      const month = months.find((entry) => entry.key === key)

      if (!month) return

      month.referrals += 1
      month.commission += Number(referral.commission_amount ?? 0)
    })

    return months
  }, [referrals])

  const hasData = data.some((item) => item.referrals > 0 || item.commission > 0)

  return (
    <section className="rounded-xl border border-amber-500/15 bg-[#100d1f] p-6">
      <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
        Trends
      </p>
      <h2 className="mb-6 text-xl font-semibold text-white">Performance Chart</h2>

      {!hasData ? (
        <div className="rounded-xl border border-amber-500/10 bg-[#130f22]">
          <EmptyState
            icon={BarChart3}
            title="No referral activity yet."
            description="Performance data will appear here once referrals start moving through your pipeline."
          />
        </div>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid stroke="rgba(245, 197, 24,0.1)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.45)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="rgba(255,255,255,0.45)"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="rgba(255,255,255,0.45)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(Number(value), currency)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(124,58,237,0.08)' }}
                contentStyle={{
                  backgroundColor: '#130f22',
                  borderColor: 'rgba(245, 197, 24, 0.15)',
                  borderRadius: 12,
                }}
                formatter={(value, name) => {
                  if (name === 'commission') {
                    return [formatCurrency(Number(value), currency), 'Commission']
                  }

                  return [value, 'Referrals']
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="referrals"
                name="Referrals"
                fill="#f5c518"
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="right"
                dataKey="commission"
                name="Commission"
                stroke="#f5c518"
                strokeWidth={3}
                dot={{ fill: '#f5c518', strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
