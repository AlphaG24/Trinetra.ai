import { useState, useEffect } from 'react'
import { Agent } from '@/lib/utils/agentDetection'

interface DashboardStats {
  total_calls: number
  minutes_used: number
  total_conversations: number
  resolution_rate: number
  appointments: number
  appointments_week: number
  total_leads: number
  qualified_leads: number
  active_now: number
  trends: {
    calls: number
    minutes: number
    conversations: number
    appointments: number
    leads: number
  }
}

export function useDashboardStats(agents: Agent[]) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        setStats(data)
      } catch (err: any) {
        console.error("Failed to load dashboard stats:", err)
        setError(err)
        // Fallback so it doesn't get stuck loading forever if API fails
        setStats({
          total_calls: 0,
          minutes_used: 0,
          total_conversations: 0,
          resolution_rate: 0,
          appointments: 0,
          appointments_week: 0,
          total_leads: 0,
          qualified_leads: 0,
          active_now: 0,
          trends: { calls: 0, minutes: 0, conversations: 0, appointments: 0, leads: 0 }
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, isLoading, error }
}
