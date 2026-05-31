'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Settings, CreditCard, HelpCircle, Menu, Phone, MessageCircle, Calendar, Target, AlertTriangle, CheckCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/client'
import { useDashboardStore } from '@/store/dashboardStore'

const TYPE_ICONS: Record<string, any> = {
  appointment_booked: Calendar,
  lead_captured: Target,
  call_completed: Phone,
  chat_session: MessageCircle,
  usage_alert: AlertTriangle,
}

export function Topbar({ user, profile, plan }: { user: any, profile: any, plan: any }) {
  const router = useRouter()
  const supabase = createClient()
  const { toggleMobileSidebar } = useDashboardStore()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: any) => !n.is_read).length)
    }
    fetchNotifs()
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const timeAgo = (ts: string) => {
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    return `${Math.floor(m / 60)}h ago`
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
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false) }}
            className="relative p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
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
                  <h3 className="font-semibold text-white">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 text-xs font-bold text-rose-400">{unreadCount} new</span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[320px] overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-sm text-gray-400 text-center">
                      <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      No new notifications
                    </div>
                  ) : (
                    notifications.map(n => {
                      const Icon = TYPE_ICONS[n.type] || Bell
                      return (
                        <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.is_read ? 'bg-white/[0.02]' : ''}`}>
                          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                            !n.is_read ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${!n.is_read ? 'text-white' : 'text-white/60'}`}>
                              {n.title || n.type?.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-white/40 mt-0.5 truncate">{n.message || n.body || '—'}</p>
                            <p className="text-[10px] text-white/30 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.is_read && <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />}
                        </div>
                      )
                    })
                  )}
                </div>

                <Link 
                  href="/dashboard/notifications" 
                  onClick={() => setIsNotifOpen(false)}
                  className="block p-3 text-sm text-center text-gray-400 hover:text-white border-t border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors"
                >
                  View all notifications →
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
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false) }}
            className="flex items-center gap-2 p-1 hover:bg-white/5 rounded-full lg:rounded-xl transition-colors"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/80 to-purple-600/80 flex items-center justify-center text-sm font-bold text-white border border-white/10">
              {getInitials(profile?.full_name || user?.user_metadata?.full_name || user?.email)}
            </div>
            <span className="text-sm font-medium text-gray-200 hidden lg:block max-w-[120px] truncate">
              {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
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
                  <p className="text-sm font-semibold text-white truncate">{profile?.full_name || user?.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                
                <Link href="/dashboard/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                  <Settings className="w-4 h-4 text-gray-500" /> Profile Settings
                </Link>
                <Link href="/dashboard/billing" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                  <CreditCard className="w-4 h-4 text-gray-500" /> Billing & Plan
                </Link>
                <Link href="/dashboard/support" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                  <HelpCircle className="w-4 h-4 text-gray-500" /> Help & Support
                </Link>
                
                <div className="h-px bg-white/5 my-1" />
                
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left transition-colors"
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

