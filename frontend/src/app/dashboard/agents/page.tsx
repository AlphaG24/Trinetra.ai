'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Bot, Plus, ChevronRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface UserAgent {
  id: string
  agent_name: string
  agent_type: string
  status: string
  is_demo?: boolean
  vapi_agent_id: string
  created_at: string
}

export default function AgentsDashboardPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<UserAgent[]>([])
  const [loading, setLoading] = useState(true)

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'live' || s === 'active') return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
    if (s === 'beta') return 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
    if (s === 'in_development') return 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
    if (s === 'paused') return 'bg-red-500/15 border-red-500/30 text-red-650 dark:text-red-400'
    return 'bg-zinc-100 border-zinc-205 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch user agents
      const { data: agentsData, error: agentsErr } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (agentsErr) throw agentsErr

      const mappedAgents = (agentsData || []).map((agent: any) => {
        const rawName = agent.name || ''
        const displayName = rawName
          .replace(/^\[[^\]]+\]\s*/, '')           // remove [slug] prefix
          .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')  // prettify " - Demo" suffix
          .replace(/\s*-\s*Trial\s*$/i, ' (Trial)') // prettify " - Trial" suffix
        return {
          ...agent,
          agent_name: displayName,
          raw_name: rawName
        }
      })
      setAgents(mappedAgents)

    } catch (err: any) {
      console.error("Failed to load agents page data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [router])

  const handleDeleteAgent = async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this agent? All logs and configurations will be permanently removed.")) {
      return
    }

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      setAgents(prev => prev.filter(a => a.id !== agentId))
      toast.success("Agent deleted successfully.")
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to delete agent: " + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 gap-2">
        <span className="w-6 h-6 rounded-full border-2 border-zinc-200 dark:border-zinc-800 border-t-violet-400 animate-spin" />
        <p className="text-xs">Loading agents console...</p>
      </div>
    )
  }

  // Group Agents into Demo vs Deployed
  const demoAgents = agents.filter(a => a.is_demo === true || a.status === 'draft' || a.status === 'beta' || a.agent_type === 'free_demo')
  const deployedAgents = agents.filter(a => !(a.is_demo === true || a.status === 'draft' || a.status === 'beta' || a.agent_type === 'free_demo'))

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--heading)] font-display">
            AI Agents Workspace
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1 font-sans">
            Build custom voice assistants or launch pre-configured workspace templates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push('/dashboard/marketplace')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Deploy Agent
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      {agents.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] rounded-2xl p-16 text-center max-w-xl mx-auto space-y-4 bg-[var(--card-bg)]">
          <div className="w-12 h-12 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] mx-auto shadow-inner">
            <Bot className="w-6 h-6 animate-bounce" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-[var(--heading)] font-display">No custom agents</h3>
            <p className="text-xs text-[var(--body)] mt-1">You haven&apos;t provisioned any custom voice agents yet.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/marketplace')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all flex items-center gap-1.5 mx-auto hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Deploy your first agent
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Deployed Agents Section */}
          {deployedAgents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold font-montserrat uppercase tracking-wider text-[var(--muted)] text-left">Deployed Agents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deployedAgents.map((agent) => {
                  const agentId = agent.vapi_agent_id || agent.id
                  return (
                    <div
                      key={agent.id}
                      onClick={() => router.push(`/dashboard/agents/${agentId}`)}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:bg-[var(--hover-bg)]/40 transition-all cursor-pointer group flex flex-col justify-between min-h-[140px] relative overflow-hidden shadow-md text-left"
                    >
                      <div className="flex items-start justify-between relative z-10">
                        <div>
                          <h3 className="font-bold text-[var(--heading)] font-display transition-colors">
                            {agent.agent_name}
                          </h3>
                          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mt-0.5">{agent.agent_type} workflow</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getStatusStyle(agent.status)}`}>
                            {(agent.status.toLowerCase() === 'live' || agent.status.toLowerCase() === 'active') && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {agent.status.replace('_', ' ')}
                          </span>
                          <button
                            onClick={(e) => handleDeleteAgent(e, agent.id)}
                            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)]/35 hover:border-red-500/30 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all cursor-pointer relative z-20 shrink-0"
                            title="Delete Agent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-4 relative z-10">
                        <span className="text-[10px] text-[var(--muted)] font-mono">ID: {agentId.slice(0, 8)}...</span>
                        <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--heading)] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Demo Agents Section */}
          {demoAgents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold font-montserrat uppercase tracking-wider text-[var(--muted)] text-left">Demo Agents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoAgents.map((agent) => {
                  const agentId = agent.vapi_agent_id || agent.id
                  return (
                    <div
                      key={agent.id}
                      onClick={() => router.push(`/dashboard/agents/${agentId}`)}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:bg-[var(--hover-bg)]/40 transition-all cursor-pointer group flex flex-col justify-between min-h-[140px] relative overflow-hidden shadow-md text-left"
                    >
                      <div className="flex items-start justify-between relative z-10">
                        <div>
                          <h3 className="font-bold text-[var(--heading)] font-display transition-colors">
                            {agent.agent_name}
                          </h3>
                          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mt-0.5">{agent.agent_type} workflow</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Demo
                          </span>
                          <button
                            onClick={(e) => handleDeleteAgent(e, agent.id)}
                            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)]/35 hover:border-red-500/30 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all cursor-pointer relative z-20 shrink-0"
                            title="Delete Agent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-4 relative z-10">
                        <span className="text-[10px] text-[var(--muted)] font-mono">ID: {agentId.slice(0, 8)}...</span>
                        <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--heading)] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
