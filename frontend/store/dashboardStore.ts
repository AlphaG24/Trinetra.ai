import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  onboarding_complete?: boolean
  purchased_agent_id?: string | null
}

export interface Agent {
  id: string
  name: string
  role?: string
  status?: string
  agent_type?: string
  [key: string]: any
}

export interface Plan {
  id: string
  name: string
  max_agents: number
  max_voice_minutes: number
}

interface DashboardState {
  profile: UserProfile | null
  plan: Plan | null
  agents: Agent[]
  isLoading: boolean
  isMobileSidebarOpen: boolean
  setProfile: (profile: UserProfile | null) => void
  setPlan: (plan: Plan | null) => void
  setAgents: (agents: Agent[]) => void
  fetchAgents: (userId: string) => Promise<void>
  setLoading: (isLoading: boolean) => void
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (isOpen: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  profile: null,
  plan: null,
  agents: [],
  isLoading: true,
  isMobileSidebarOpen: false,
  setProfile: (profile) => set({ profile }),
  setPlan: (plan) => set({ plan }),
  setAgents: (agents) => set({ agents }),
  fetchAgents: async (userId) => {
    const supabase = createClient()
    const { data } = await supabase.from('user_agents').select('*').eq('user_id', userId)
    set({ agents: data || [] })
  },
  setLoading: (isLoading) => set({ isLoading }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
}))
