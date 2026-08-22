'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Target } from 'lucide-react'

interface FunnelPoint {
  stage: string
  count: number
}

interface LeadFunnelChartProps {
  data: FunnelPoint[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg text-left">
      <p className="text-xs font-semibold text-[var(--heading)] font-montserrat">
        {data.stage}: <span className="font-mono">{data.count} leads</span>
      </p>
    </div>
  )
}

export function LeadFunnelChart({ data }: LeadFunnelChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-80 flex items-center justify-center">
        <div className="w-full h-full animate-pulse bg-[var(--background)] rounded-xl" />
      </div>
    )
  }

  // Define colors from variables for each bar stage
  const STAGE_COLORS = [
    'var(--primary-bg)',
    'var(--secondary)',
    'var(--muted)',
    'var(--body)',
    'var(--heading)',
  ]

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
            Lead Capture Funnel
          </h3>
          <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">
            Stage distribution of identified prospects
          </p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
          <Target className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex-1 min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              stroke="var(--muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              dataKey="stage"
              type="category"
              stroke="var(--muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
