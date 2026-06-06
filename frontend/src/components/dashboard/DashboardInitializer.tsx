'use client'

import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'

export function DashboardInitializer({ 
  profile, 
  plan, 
  agents,
  children 
}: { 
  profile: any
  plan: any
  agents?: any[]
  children: React.ReactNode 
}) {
  const { setProfile, setPlan, setAgents, setLoading } = useDashboardStore()

  useEffect(() => {
    setProfile(profile)
    setPlan(plan)
    if (agents) setAgents(agents)
    setLoading(false)
  }, [profile, plan, agents, setProfile, setPlan, setAgents, setLoading])

  return <>{children}</>
}
