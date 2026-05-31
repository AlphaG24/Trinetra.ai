'use client'

import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'

export function DashboardInitializer({ 
  profile, 
  plan, 
  children 
}: { 
  profile: any
  plan: any
  children: React.ReactNode 
}) {
  const { setProfile, setPlan, setLoading } = useDashboardStore()

  useEffect(() => {
    setProfile(profile)
    setPlan(plan)
    setLoading(false)
  }, [profile, plan, setProfile, setPlan, setLoading])

  return <>{children}</>
}
