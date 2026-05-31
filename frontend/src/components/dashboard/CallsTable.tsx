'use client'

import { useState, useEffect } from 'react'
import { Agent, hasAgentType } from '@/lib/utils/agentDetection'
import { Play, FileText, MoreVertical, Phone } from 'lucide-react'
import { createClient } from '@/lib/client'

interface CallsTableProps {
  agents: Agent[]
}

const getSentimentDetails = (sentiment: string) => {
  switch (sentiment) {
    case 'positive': return { emoji: '😊', color: 'bg-emerald-500/10 text-emerald-400' }
    case 'negative': return { emoji: '😞', color: 'bg-red-500/10 text-red-400' }
    default: return { emoji: '😐', color: 'bg-white/10 text-white/70' }
  }
}

const getOutcomeDetails = (outcome: string) => {
  switch (outcome) {
    case 'appointment': return '📅 Appointment Booked'
    case 'lead': return '🎯 Lead Captured'
    case 'resolved': return '✅ Resolved'
    case 'escalated': return '↗️ Escalated'
    case 'unresolved': return '❌ Unresolved'
    default: return '❓ Unknown'
  }
}

export function CallsTable({ agents }: CallsTableProps) {
  const [activeTab, setActiveTab] = useState('voice')
  const [calls, setCalls] = useState<any[]>([])

  useEffect(() => {
    async function fetchCalls() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { data } = await supabase
          .from('calls')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (data) setCalls(data)
      } catch (err) {
        console.error("Calls table might not exist yet", err)
      }
    }
    fetchCalls()
  }, [])
  
  const hasVoice = hasAgentType(agents, 'voice')
  const hasChat = hasAgentType(agents, 'chat')
  const hasWhatsApp = hasAgentType(agents, 'whatsapp')

  // If they have no agents, we just show empty state
  if (agents.length === 0) {
    return (
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Recent Interactions</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Phone className="w-12 h-12 text-white/20 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No calls yet this month</h3>
          <p className="text-white/50 text-sm">Your voice agent's call history will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent Interactions</h2>
          <button className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors">
            View All →
          </button>
        </div>

        <div className="flex gap-6 border-b border-white/5">
          {hasVoice && (
            <button 
              onClick={() => setActiveTab('voice')}
              className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'voice' ? 'border-amber-500 text-amber-500' : 'border-transparent text-white/50 hover:text-white'}`}
            >
              Voice Calls
            </button>
          )}
          {hasChat && (
            <button 
              onClick={() => setActiveTab('chat')}
              className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'chat' ? 'border-amber-500 text-amber-500' : 'border-transparent text-white/50 hover:text-white'}`}
            >
              Chat
            </button>
          )}
          {hasWhatsApp && (
            <button 
              onClick={() => setActiveTab('whatsapp')}
              className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'whatsapp' ? 'border-amber-500 text-amber-500' : 'border-transparent text-white/50 hover:text-white'}`}
            >
              WhatsApp
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
              <th className="py-4 px-6 font-medium">Caller</th>
              <th className="py-4 px-6 font-medium">Agent</th>
              <th className="py-4 px-6 font-medium">Duration</th>
              <th className="py-4 px-6 font-medium">Time</th>
              <th className="py-4 px-6 font-medium">Sentiment</th>
              <th className="py-4 px-6 font-medium">Outcome</th>
              <th className="py-4 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {calls.map((call) => {
              const sentiment = getSentimentDetails(call.sentiment || 'neutral')
              return (
                <tr key={call.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium text-xs">
                        {call.caller_name && call.caller_name !== 'Unknown' ? call.caller_name.charAt(0) : '?'}
                      </div>
                      <div>
                        <div className="font-medium text-white">{call.caller_name || 'Unknown'}</div>
                        <div className="text-xs text-white/40">{call.caller_phone || 'Hidden'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{call.agent_name || 'Agent'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white/5 text-white/60">
                        {call.agent_type || 'voice'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-medium ${call.missed ? 'text-red-400' : 'text-white/70'}`}>
                      {call.duration || '0:00'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-white/50">
                    {call.created_at ? new Date(call.created_at).toLocaleTimeString() : 'Unknown'}
                  </td>
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sentiment.color}`}>
                      <span>{sentiment.emoji}</span>
                      <span className="capitalize">{call.sentiment || 'neutral'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-white/70">{getOutcomeDetails(call.outcome || 'unknown')}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="Play Recording">
                        <Play className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="View Transcript">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="More Options">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
