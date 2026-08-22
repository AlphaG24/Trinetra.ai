'use client'

import { Phone, Clock, TrendingUp, Target } from 'lucide-react'

interface KPICardsProps {
  totalCalls: number
  totalMinutes: number
  avgDuration: number
  leadsGenerated: number
}

export function KPICards({
  totalCalls,
  totalMinutes,
  avgDuration,
  leadsGenerated,
}: KPICardsProps) {
  const cards = [
    {
      label: 'Total Calls',
      value: totalCalls.toLocaleString('en-IN'),
      icon: Phone,
      description: 'Connected call attempts',
    },
    {
      label: 'Total Minutes',
      value: `${totalMinutes.toLocaleString('en-IN')}m`,
      icon: Clock,
      description: 'Cumulative usage duration',
    },
    {
      label: 'Avg Call Duration',
      value: `${avgDuration}m`,
      icon: TrendingUp,
      description: 'Average conversation length',
    },
    {
      label: 'Leads Generated',
      value: leadsGenerated.toLocaleString('en-IN'),
      icon: Target,
      description: 'Interactions capturing contact info',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div
            key={i}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between shadow-sm min-h-[120px] transition-all hover:translate-y-[-2px]"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-[var(--muted)] font-montserrat uppercase tracking-wider">
                {card.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold font-display text-[var(--heading)] tracking-tight">
                {card.value}
              </h3>
              <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">
                {card.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
