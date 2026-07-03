'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, FlaskConical, Bot, Target, BarChart3, 
  Phone, MessageCircle, MessageSquare, Settings, 
  HeadphonesIcon, Rocket 
} from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'
import { hasAgentType } from '@/lib/utils/agentDetection'

interface SidebarAgent {
  agent_type: string
  [key: string]: unknown
}

interface SidebarLink {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export function Sidebar({ agents: propAgents }: { agents?: any[] }) {
  const pathname = usePathname()
  const { isMobileSidebarOpen, setMobileSidebarOpen, agents: storeAgents } = useDashboardStore()
  
  const agents = propAgents || storeAgents || []
  const hasVoice = hasAgentType(agents, 'voice')
  const hasChat = hasAgentType(agents, 'chat')
  const hasWhatsApp = hasAgentType(agents, 'whatsapp')

  const showDemo = !agents || agents.length === 0

  const topLinks: SidebarLink[] = [
    { name: 'Overview', href: '/dashboard', icon: Home },
  ]

  if (showDemo) {
    topLinks.push({ name: 'Demo', href: '/dashboard/demo', icon: FlaskConical })
  }

  topLinks.push(
    { name: 'Agents', href: '/dashboard/agents', icon: Bot },
    { name: 'Leads', href: '/dashboard/leads', icon: Target },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  )

  const channelLinks: SidebarLink[] = []
  if (hasVoice) channelLinks.push({ name: 'Voice Calls', href: '/dashboard/calls', icon: Phone })
  if (hasChat) channelLinks.push({ name: 'Chat', href: '/dashboard/conversations', icon: MessageCircle })
  if (hasWhatsApp) channelLinks.push({ name: 'WhatsApp', href: '/dashboard/whatsapp', icon: MessageSquare })

  const bottomLinks: SidebarLink[] = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Deploy Agent', href: '/dashboard/deploy', icon: Rocket },
    { name: 'Support', href: '/dashboard/support', icon: HeadphonesIcon },
  ]

  const NavLink = ({ item }: { item: SidebarLink }) => {
    const isActive = pathname === item.href
    const Icon = item.icon

    return (
      <Link 
        href={item.href}
        onClick={() => setMobileSidebarOpen(false)}
        className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 ${
          isActive 
            ? 'bg-violet-600/15 text-white border-l-2 border-violet-500' 
            : 'text-gray-400 hover:text-gray-300 hover:bg-white/5 border-l-2 border-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isActive ? 'text-violet-500' : ''}`} />
          <span className="font-medium text-sm">{item.name}</span>
        </div>
        {item.badge && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-400">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <div className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-60 bg-[#080810]/95 backdrop-blur-xl border-r border-white/5 z-40 transition-transform duration-300 lg:translate-x-0 flex flex-col ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {topLinks.map(link => <NavLink key={link.name} item={link} />)}
          </div>

          {channelLinks.length > 0 && (
            <>
              <div className="mt-8 mb-2 px-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</span>
              </div>
              <div className="space-y-1">
                {channelLinks.map(link => <NavLink key={link.name} item={link} />)}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/5 space-y-1">
          {bottomLinks.map(link => <NavLink key={link.name} item={link} />)}
        </div>
      </div>
    </>
  )
}
