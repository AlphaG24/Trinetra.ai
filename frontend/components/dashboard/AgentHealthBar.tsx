import { Bot, Activity, Phone, PhoneOff } from 'lucide-react'
import Link from 'next/link'
import { Agent } from '@/lib/utils/agentDetection'

export function AgentHealthBar({ agents }: { agents: Agent[] }) {
  return (
    <div className="w-full bg-[#0f1117]/80 border border-white/5 rounded-xl p-3 mb-6 flex items-center justify-between">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:block">
        Your AI Agents
      </div>

      <div className="flex gap-2 items-center flex-1 sm:justify-center overflow-x-auto custom-scrollbar px-2">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 whitespace-nowrap">
            <Bot className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">{agent.name}</span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`w-2 h-2 rounded-full ${
                agent.status === 'active' ? 'bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite]' :
                agent.status === 'idle' ? 'bg-gray-500' :
                agent.status === 'error' ? 'bg-rose-500 animate-[pulse_1s_ease-in-out_infinite]' :
                'bg-violet-500 animate-[pulse_2s_ease-in-out_infinite]'
              }`} />
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="text-sm text-gray-400">No agents deployed yet</div>
        )}
      </div>

      <Link 
        href="/dashboard/demo"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-400 text-sm font-medium hover:bg-violet-500/10 transition-colors whitespace-nowrap"
      >
        <Activity className="w-4 h-4" />
        <span className="hidden sm:inline">Test Your Agent</span>
        <span className="sm:hidden">Test</span>
      </Link>
    </div>
  )
}
