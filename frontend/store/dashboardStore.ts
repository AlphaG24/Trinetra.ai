import { create } from 'zustand'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  onboarding_complete?: boolean
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
  isLoading: boolean
  isMobileSidebarOpen: boolean
  setProfile: (profile: UserProfile | null) => void
  setPlan: (plan: Plan | null) => void
  setLoading: (isLoading: boolean) => void
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (isOpen: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  profile: null,
  plan: null,
  isLoading: true,
  isMobileSidebarOpen: false,
  setProfile: (profile) => set({ profile }),
  setPlan: (plan) => set({ plan }),
  setLoading: (isLoading) => set({ isLoading }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
}))
