'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { createClient } from '@/lib/client'

interface IntentChartProps {
  hasData: boolean
}

export function IntentChart({ hasData }: IntentChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { data } = await supabase
          .from('intent_metrics')
          .select('*')
          .eq('user_id', user.id)
          .order('value', { ascending: false })
          .limit(4)

        if (data && data.length > 0) {
          setChartData(data)
        }
      } catch (err) {
        console.error("Intent metrics table might not exist yet", err)
      }
    }
    
    if (hasData) {
      fetchData()
    }
  }, [hasData])

  const totalCount = chartData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 w-full h-full flex flex-col">
      <h2 className="text-xl font-bold text-white mb-6">What People Ask About</h2>

      <div className="flex-1 w-full min-h-[300px] flex flex-col justify-center relative">
        {!hasData || chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/60 font-medium mb-1">Not enough data yet</p>
              <p className="text-white/40 text-sm max-w-[200px] mx-auto">This fills in as your agents handle more conversations</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[200px] w-full min-w-0 relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15,17,23,0.95)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-white/50 font-medium">Total</span>
                <span className="text-2xl font-bold text-white">{totalCount}</span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 grid grid-cols-2 gap-3 px-2">
              {chartData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || '#3b82f6' }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-white/80 truncate" title={item.name}>{item.name}</span>
                    <span className="text-xs font-semibold text-white">{Math.round((item.value / totalCount) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
