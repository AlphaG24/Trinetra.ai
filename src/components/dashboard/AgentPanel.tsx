'use client'

import { Cpu, Phone, MessageCircle, MoreHorizontal } from 'lucide-react'
import { Agent } from '@/lib/utils/agentDetection'
import { useRouter } from 'next/navigation'

interface AgentPanelProps {
  agents: Agent[]
}

export function AgentPanel({ agents }: AgentPanelProps) {
  const router = useRouter()

  const getIcon = (type: string) => {
    switch (type) {
      case 'voice': return <Phone className="w-5 h-5 text-blue-400" />
      case 'chat': return <MessageCircle className="w-5 h-5 text-emerald-400" />
      default: return <Cpu className="w-5 h-5 text-purple-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500'
      case 'error': return 'bg-red-500'
      case 'setting_up': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Your AI Agents</h2>
        <button 
          onClick={() => router.push('/dashboard/onboarding')}
          className="px-4 py-2 text-sm font-medium text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
        >
          + Add Agent
        </button>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <Cpu className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No agents deployed yet</h3>
            <p className="text-white/50 mb-6 text-sm max-w-xs">Your AI agents will appear here once configured</p>
            <button 
              onClick={() => router.push('/dashboard/onboarding')}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              Get Started
            </button>
          </div>
        ) : (
          agents.map(agent => (
            <div key={agent.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#05050a] flex items-center justify-center border border-white/10">
                    {getIcon(agent.agent_type)}
                  </div>
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0f1117] ${getStatusColor(agent.status)}`}>
                    {agent.status === 'active' && <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-lg">{agent.name}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60 bg-white/10 rounded-full">
                      {agent.agent_type}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400/80 bg-amber-400/10 rounded-full hidden sm:inline-block">
                      {/* Using fallback since language might not exist on minimal Agent type */}
                      {(agent as any).language || 'English'}
                    </span>
                  </div>
                  <p className="text-sm text-white/50">
                    {agent.agent_type === 'voice' ? '32 calls | 4m avg | 8 booked' : '89 chats | 84% resolved | 12 leads'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                  className="px-4 py-2 text-sm font-medium text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                  Details →
                </button>
                <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
