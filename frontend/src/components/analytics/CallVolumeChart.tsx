'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Activity } from 'lucide-react'

interface VolumePoint {
  date: string
  count: number
}

interface CallVolumeChartProps {
  data: VolumePoint[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg text-left">
      <p className="text-[var(--muted)] text-[10px] font-mono mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <p className="text-xs font-semibold text-[var(--heading)] font-montserrat">
            Calls: <span className="font-mono">{p.value}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

export function CallVolumeChart({ data }: CallVolumeChartProps) {
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

  // Format date labels for X axis
  const chartData = data.map((d) => {
    const parts = d.date.split('-')
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return {
      ...d,
      formattedDate: label,
    }
  })

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
            Call Volume Over Time
          </h3>
          <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">
            Daily inbound and outbound call count
          </p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
          <Activity className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex-1 min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary-bg)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--primary-bg)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="formattedDate"
              stroke="var(--muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--heading)"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorCalls)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
