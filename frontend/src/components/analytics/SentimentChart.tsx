'use client'

import { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Smile } from 'lucide-react'

interface SentimentPoint {
  name: string
  value: number
}

interface SentimentChartProps {
  data: SentimentPoint[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg text-left">
      <p className="text-xs font-semibold text-[var(--heading)] font-montserrat">
        {data.name}: <span className="font-mono">{data.value} calls</span>
      </p>
    </div>
  )
}

export function SentimentChart({ data }: SentimentChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const totalCalls = data.reduce((sum, item) => sum + item.value, 0)

  if (!mounted) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-80 flex items-center justify-center">
        <div className="w-full h-full animate-pulse bg-[var(--background)] rounded-xl" />
      </div>
    )
  }

  // Use only CSS variables as requested
  const SENTIMENT_COLORS = {
    Positive: 'var(--heading)',
    Neutral: 'var(--body)',
    Negative: 'var(--muted)',
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
            Call Sentiment Analysis
          </h3>
          <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">
            Breakdown of transcript-derived mood
          </p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
          <Smile className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 min-h-[200px]">
        {/* Donut Container */}
        <div className="relative w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS] || 'var(--secondary)'}
                    stroke="var(--card-bg)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold font-display text-[var(--heading)]">
              {totalCalls}
            </span>
            <span className="text-[9px] font-semibold font-montserrat text-[var(--muted)] uppercase tracking-wider">
              Total Calls
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 w-full sm:w-auto">
          {data.map((item) => {
            const color = SENTIMENT_COLORS[item.name as keyof typeof SENTIMENT_COLORS] || 'var(--secondary)'
            const pct = totalCalls > 0 ? Math.round((item.value / totalCalls) * 100) : 0
            return (
              <div key={item.name} className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-[var(--border)]" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-[var(--body)] font-montserrat min-w-[70px]">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--heading)] font-mono">
                  {item.value} ({pct}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
