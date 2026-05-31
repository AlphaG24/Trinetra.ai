'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Settings, CreditCard, HelpCircle, Menu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/client'
import { useDashboardStore } from '@/store/dashboardStore'

export function Topbar({ user, profile, plan }: { user: any, profile: any, plan: any }) {
  const router = useRouter()
  const supabase = createClient()
  const { toggleMobileSidebar } = useDashboardStore()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#080810]/90 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            T
          </div>
          <span className="text-xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 hidden sm:block">
            Trinetra
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-80 bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-medium text-white">Notifications</h3>
                  <button className="text-xs text-violet-400 hover:text-violet-300">Mark all read</button>
                </div>
                <div className="p-2 max-h-[300px] overflow-y-auto">
                  <div className="p-3 text-sm text-gray-400 text-center">No new notifications</div>
                </div>
                <Link href="/dashboard/notifications" className="block p-3 text-sm text-center text-gray-400 hover:text-white border-t border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                  View all &rarr;
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plan Badge */}
        {plan && (
          <Link href="/dashboard/billing" className="hidden sm:flex items-center">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-600/20 to-blue-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-600/30 transition-colors">
              {plan.name}
            </span>
          </Link>
        )}

        {/* User Dropdown */}
        <div className="relative ml-1">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 hover:bg-white/5 rounded-full lg:rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-sm font-medium text-white border border-white/10">
              {getInitials(profile?.full_name || user?.email)}
            </div>
            <span className="text-sm font-medium text-gray-200 hidden lg:block max-w-[120px] truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </span>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-56 bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
              >
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                  <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                
                <Link href="/dashboard/settings/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5">
                  <Settings className="w-4 h-4 text-gray-500" /> Profile Settings
                </Link>
                <Link href="/dashboard/billing" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5">
                  <CreditCard className="w-4 h-4 text-gray-500" /> Billing & Plan
                </Link>
                <Link href="/dashboard/support" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5">
                  <HelpCircle className="w-4 h-4 text-gray-500" /> Help & Support
                </Link>
                
                <div className="h-px bg-white/5 my-1" />
                
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
