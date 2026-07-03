import React from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// Harmonious UI theme colors matching Trinetra's premium aesthetics
const DEFAULT_COLOR = '#7c3aed' // Violet
const PIE_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

interface ChartProps {
  data: any[]
  xKey: string
  yKey: string
  label: string
  color?: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export const LineChartComponent: React.FC<ChartProps> = ({ data, xKey, yKey, label, color = DEFAULT_COLOR }) => {
  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl w-full h-[320px] flex flex-col">
      <h3 className="text-lg font-bold text-white mb-6">{label}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey={xKey} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey={yKey} name={label} stroke={color} strokeWidth={2} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export const BarChartComponent: React.FC<ChartProps> = ({ data, xKey, yKey, label, color = DEFAULT_COLOR }) => {
  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl w-full h-[320px] flex flex-col">
      <h3 className="text-lg font-bold text-white mb-6">{label}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey={xKey} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={yKey} name={label} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export const AreaChartComponent: React.FC<ChartProps> = ({ data, xKey, yKey, label, color = DEFAULT_COLOR }) => {
  const gradientId = `grad-${yKey}`
  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl w-full h-[320px] flex flex-col">
      <h3 className="text-lg font-bold text-white mb-6">{label}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey={xKey} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey={yKey} name={label} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export const PieChartComponent: React.FC<ChartProps> = ({ data, xKey, yKey, label }) => {
  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl w-full h-[320px] flex flex-col">
      <h3 className="text-lg font-bold text-white mb-6">{label}</h3>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey={yKey}
              nameKey={xKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend formatter={(val) => <span className="text-zinc-400 text-xs">{val}</span>} />
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export const StatCardComponent: React.FC<ChartProps> = ({ data, yKey, label, color = 'text-purple-400' }) => {
  // If data is an array, we can sum or average, or take the last value. Let's take the latest or aggregate value.
  const displayValue = Array.isArray(data) && data.length > 0 
    ? data[data.length - 1][yKey] 
    : (data as any)?.[yKey] || 0

  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-5 flex flex-col gap-2 shadow-lg w-full">
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <span>📈</span>
        <span>{label}</span>
      </div>
      <div className={`text-3xl font-bold font-mono ${color}`}>
        {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
      </div>
    </div>
  )
}

// Chart Registry Mapping Object
export const ChartRegistry: Record<string, React.ComponentType<ChartProps>> = {
  line: LineChartComponent,
  bar: BarChartComponent,
  area: AreaChartComponent,
  pie: PieChartComponent,
  stat_card: StatCardComponent,
}
