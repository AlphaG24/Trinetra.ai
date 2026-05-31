'use client'

import { useRouter } from 'next/navigation'
import { Phone, Clock, MessageCircle, Calendar, Target, Activity, IndianRupee } from 'lucide-react'
import { StatCard } from './StatCard'
import { getCardsForUser, Agent, Subscription } from '@/lib/utils/agentDetection'
import { calculateROI } from '@/lib/utils/roiCalculator'
import { useDashboardStats } from '@/hooks/useDashboardStats'

interface StatCardsGridProps {
  agents: Agent[]
  plan?: Subscription
}

export function StatCardsGrid({ agents, plan }: StatCardsGridProps) {
  const router = useRouter()
  const { stats, isLoading } = useDashboardStats(agents)
  
  const activeCards = getCardsForUser(agents, plan)

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCard key={i} title="" icon={Activity} value={0} sublabel="" isLoading />
        ))}
      </div>
    )
  }

  const costSaved = calculateROI({
    voice_minutes: stats.minutes_used,
    chat_count: stats.total_conversations,
    appointments: stats.appointments,
    leads: stats.total_leads
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {activeCards.includes('voice_calls') && (
        <StatCard
          title="Voice Calls"
          icon={Phone}
          iconColor="text-blue-400"
          value={stats.total_calls}
          sublabel="this month"
          trend={stats.trends.calls}
          onClick={() => router.push('/dashboard/calls')}
        />
      )}
      
      {activeCards.includes('voice_minutes') && (
        <StatCard
          title="Minutes Used"
          icon={Clock}
          iconColor="text-violet-400"
          value={stats.minutes_used}
          sublabel="this month"
          trend={stats.trends.minutes}
          onClick={() => router.push('/dashboard/billing')}
        />
      )}

      {activeCards.includes('chat_conversations') && (
        <StatCard
          title="Conversations"
          icon={MessageCircle}
          iconColor="text-emerald-400"
          value={stats.total_conversations}
          sublabel={`${stats.resolution_rate}% resolved by AI`}
          trend={stats.trends.conversations}
          onClick={() => router.push('/dashboard/conversations')}
        />
      )}

      {activeCards.includes('appointments') && (
        <StatCard
          title="Appointments"
          icon={Calendar}
          iconColor="text-orange-400"
          value={stats.appointments}
          sublabel={`${stats.appointments_week} this week`}
          trend={stats.trends.appointments}
          onClick={() => router.push('/dashboard/appointments')}
        />
      )}

      {activeCards.includes('leads') && (
        <StatCard
          title="Leads Generated"
          icon={Target}
          iconColor="text-yellow-400"
          value={stats.total_leads}
          sublabel={`${stats.qualified_leads} qualified`}
          trend={stats.trends.leads}
          onClick={() => router.push('/dashboard/leads')}
        />
      )}

      {activeCards.includes('active_now') && (
        <StatCard
          title="Active Now"
          icon={Activity}
          iconColor="text-emerald-400"
          value={stats.active_now}
          sublabel="live interactions"
          isLive
        />
      )}

      {activeCards.includes('cost_saved') && (
        <StatCard
          title="Saved This Month"
          icon={IndianRupee}
          iconColor="text-amber-500"
          value={costSaved}
          sublabel="vs hiring human staff"
          isCurrency
        />
      )}
    </div>
  )
}
