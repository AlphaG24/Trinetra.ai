'use client'

import { useState } from 'react'
import { RefreshCw, Trash2, Loader2, Settings2, AlertTriangle, UserCheck, Check } from 'lucide-react'
import { toast } from 'sonner'

interface AgentSettingsTabProps {
  agent: any
  onDelete: () => void
}

export function AgentSettingsTab({ agent, onDelete }: AgentSettingsTabProps) {
  const [resetting, setResetting] = useState(false)
  const [agentName, setAgentName] = useState(agent?.agent_name || agent?.name || '')
  const [savingName, setSavingName] = useState(false)

  const handleSaveName = async () => {
    const trimmed = agentName.trim()
    if (!trimmed) {
      toast.error("Agent name cannot be empty")
      return
    }

    try {
      setSavingName(true)
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update agent name")
      }

      toast.success(`Agent name updated to "${trimmed}"`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to update agent name")
    } finally {
      setSavingName(false)
    }
  }

  const handleResetAgent = async () => {
    if (!window.confirm("Are you sure you want to reset the entire agent? This will restore both Behavior and Voice configurations to their default templates. This action cannot be undone.")) {
      return
    }

    try {
      setResetting(true)
      const res = await fetch(`/api/agents/${agent.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_type: 'all' })
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      toast.success("Agent reset successfully! Reloading configuration...")
      window.location.reload()
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to reset agent: " + err.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/5">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-violet-500" /> Agent Settings
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage agent identity, advanced settings, configuration resets, and agent deletion.
          </p>
        </div>
      </div>

      {/* Agent Identity & Name Card */}
      <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-violet-500">
            <UserCheck className="w-4 h-4" />
            <h3 className="text-sm font-bold">Agent Name & Identity</h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-merriweather">
            The name your agent introduces itself as during calls (e.g., "Shubh", "Priya", "Dr. Sharma's Assistant"), and how it appears across all dashboards and analytics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName()
            }}
            placeholder="e.g. Shubh, Priya, Nexus Support"
            className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
          />
          <button
            onClick={handleSaveName}
            disabled={savingName || !agentName.trim()}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            {savingName ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Save Name
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Reset Configuration */}
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              <h3 className="text-sm font-bold">Reset Configuration</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-merriweather">
              Restores this agent's system prompt, behavior instructions, and voice preferences to the default marketplace blueprint template. 
              This will overwrite all customizations you have made.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleResetAgent}
              disabled={resetting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-500/20 hover:border-amber-500 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Reset to Default Template
                </>
              )}
            </button>
          </div>
        </div>

        {/* Delete Agent (Danger Zone) */}
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between border-rose-500/15 dark:border-rose-900/20">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-sm font-bold">Danger Zone</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-merriweather">
              Permanently delete this agent and wipe its entire call history, audio transcripts, lead captures, and configuration files. 
              This action is immediate and cannot be recovered.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Agent Permanently
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
