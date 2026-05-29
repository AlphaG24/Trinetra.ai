'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Agent } from '@/lib/utils/agentDetection'
import { createClient } from '@/lib/client'

interface VolumeChartProps {
  agents: Agent[]
}

export function VolumeChart({ agents }: VolumeChartProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '3m'>('7d')
  const [chartData, setChartData] = useState<any[]>([])
  
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { data } = await supabase
          .from('volume_metrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('period', period)
          .order('date', { ascending: true })

        if (data) setChartData(data)
      } catch (err) {
        console.error("Volume metrics table might not exist yet", err)
      }
    }
    fetchData()
  }, [period])

  const hasVoice = agents.some(a => a.agent_type === 'voice')
  const hasChat = agents.some(a => a.agent_type === 'chat')
  const hasWhatsApp = agents.some(a => a.agent_type === 'whatsapp')

  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Interactions Over Time</h2>
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
          <button 
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === '7d' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            7 days
          </button>
          <button 
            onClick={() => setPeriod('30d')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === '30d' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            30 days
          </button>
          <button 
            onClick={() => setPeriod('3m')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === '3m' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            3 months
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[300px]">
        {agents.length === 0 || chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl">
            <div className="text-center">
              <p className="text-white/60 font-medium mb-1">No data for this period</p>
              <p className="text-white/40 text-sm">Deploy an agent to see metrics</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(15,17,23,0.95)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ color: '#fff', fontSize: '14px' }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}
              />
              
              {hasVoice && (
                <Area 
                  type="monotone" 
                  dataKey="voice" 
                  name="Voice Calls"
                  stroke="#7c3aed" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#purpleGradient)" 
                  animationDuration={1000}
                />
              )}
              {hasChat && (
                <Area 
                  type="monotone" 
                  dataKey="chat" 
                  name="Chat"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#blueGradient)" 
                  animationDuration={1000}
                />
              )}
              {hasWhatsApp && (
                <Area 
                  type="monotone" 
                  dataKey="whatsapp" 
                  name="WhatsApp"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#greenGradient)" 
                  animationDuration={1000}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
