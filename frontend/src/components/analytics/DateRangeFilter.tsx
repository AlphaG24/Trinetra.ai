'use client'

import { Calendar, Bot } from 'lucide-react'

interface AgentOption {
  id: string
  agent_name: string
}

interface DateRangeFilterProps {
  range: number
  onRangeChange: (range: number) => void
  agentId: string
  onAgentIdChange: (id: string) => void
  agents: AgentOption[]
}

export function DateRangeFilter({
  range,
  onRangeChange,
  agentId,
  onAgentIdChange,
  agents,
}: DateRangeFilterProps) {
  const ranges = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
  ]

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-sm w-full">
      {/* Date Range Selection */}
      <div className="flex items-center gap-1.5 bg-[var(--background)] border border-[var(--border)] rounded-xl p-1 self-start sm:self-auto">
        <span className="p-1.5 text-[var(--muted)]">
          <Calendar className="w-4 h-4" />
        </span>
        {ranges.map((r) => (
          <button
            key={r.value}
            onClick={() => onRangeChange(r.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-montserrat uppercase tracking-wider transition-all cursor-pointer ${
              range === r.value
                ? 'bg-[var(--primary-bg)] text-[var(--heading)] border border-[var(--border)]'
                : 'text-[var(--body)] hover:text-[var(--heading)]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Agent Dropdown Filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[var(--muted)] font-montserrat flex items-center gap-1.5 uppercase tracking-wider">
          <Bot className="w-4 h-4 text-[var(--muted)]" />
          Filter by Agent:
        </span>
        <div className="relative">
          <select
            value={agentId}
            onChange={(e) => onAgentIdChange(e.target.value)}
            className="appearance-none bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs font-semibold font-montserrat rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all shadow-inner cursor-pointer"
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.agent_name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--muted)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
