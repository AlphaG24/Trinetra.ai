import { create } from 'zustand'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  onboarding_complete?: boolean
  purchased_agent_id?: string | null
  tour_completed?: boolean
  plan_tier?: string
  trial_ends_at?: string | null
  trial_started_at?: string | null
  demo_minutes_used?: number
  demo_minutes_limit?: number
  paid_minutes_used?: number
  paid_minutes_limit?: number
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
  runProductTour: boolean
  tourStepIndex: number
  setProfile: (profile: UserProfile | null) => void
  setPlan: (plan: Plan | null) => void
  setAgents: (agents: Agent[]) => void
  fetchAgents: (userId: string) => Promise<void>
  setLoading: (isLoading: boolean) => void
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (isOpen: boolean) => void
  setRunProductTour: (run: boolean) => void
  setTourStepIndex: (index: number) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  profile: null,
  plan: null,
  agents: [],
  isLoading: true,
  isMobileSidebarOpen: false,
  runProductTour: false,
  tourStepIndex: 0,
  setProfile: (profile) => set({ profile }),
  setPlan: (plan) => set({ plan }),
  setAgents: (agents) => set({ agents }),
  fetchAgents: async (userId) => {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.from('agents').select('*').eq('user_id', userId)
    const mapped = (data || []).map((agent: any) => ({
      ...agent,
      agent_name: agent.name
    }))
    set({ agents: mapped })
  },
  setLoading: (isLoading) => set({ isLoading }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
  setRunProductTour: (runProductTour) => set({ runProductTour }),
  setTourStepIndex: (tourStepIndex) => set({ tourStepIndex }),
}))
