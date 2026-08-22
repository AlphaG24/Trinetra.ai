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
} from 'recharts'
import { Bot } from 'lucide-react'

interface AgentCallPoint {
  agentName: string
  count: number
}

interface CallsByAgentChartProps {
  data: AgentCallPoint[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg text-left">
      <p className="text-xs font-semibold text-[var(--heading)] font-montserrat">
        {data.agentName}: <span className="font-mono">{data.count} calls</span>
      </p>
    </div>
  )
}

export function CallsByAgentChart({ data }: CallsByAgentChartProps) {
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

  // Filter out agents with 0 calls to keep chart clean
  const chartData = data.filter((d) => d.count > 0)

  if (chartData.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
              Calls by Agent
            </h3>
            <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">
              Traffic distribution across custom voice assistants
            </p>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
            <Bot className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <Bot className="w-8 h-8 text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)] font-merriweather">No agent call traffic recorded in this range.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
            Calls by Agent
          </h3>
          <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">
            Traffic distribution across custom voice assistants
          </p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
          <Bot className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex-1 min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="agentName"
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
            <Bar dataKey="count" fill="var(--secondary)" radius={[6, 6, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
