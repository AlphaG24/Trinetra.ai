'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Settings, CreditCard, HelpCircle, Menu, Phone, MessageCircle, Calendar, Target, AlertTriangle, CheckCheck, User, Check } from 'lucide-react'
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

export function Topbar({ user, profile: initialProfile, plan }: { user: any, profile: any, plan: any }) {
  const router = useRouter()
  const supabase = createClient()
  const { toggleMobileSidebar, profile: storeProfile } = useDashboardStore()
  const profile = (storeProfile as any) || initialProfile
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeImportantMsg, setActiveImportantMsg] = useState<any | null>(null)

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: notifs } = await supabase
        .from('official_notifications')
        .select('*, user_read_notifications!left(read_at)')
        .order('created_at', { ascending: false })
        .limit(5)

      const parsed = (notifs || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        created_at: n.created_at,
        is_read: n.user_read_notifications && n.user_read_notifications.length > 0
      }))

      setNotifications(parsed)
      setUnreadCount(parsed.filter((n: any) => !n.is_read).length)

      // Find first unread important message for tier 2 modal popup
      const unreadImportant = parsed.find((n: any) => n.type === 'important' && !n.is_read)
      if (unreadImportant) {
        setActiveImportantMsg(unreadImportant)
      }
    }

    fetchNotifs()

    const channel = supabase
      .channel('official_notifications_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'official_notifications' }, () => {
        fetchNotifs()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.rpc('mark_all_notifications_read', { p_user_id: user.id })
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const markOneRead = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_read_notifications').insert({ user_id: user.id, notification_id: id })
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const dismissImportantMsg = async () => {
    if (!activeImportantMsg) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('user_read_notifications')
        .insert({ user_id: user.id, notification_id: activeImportantMsg.id })
    }
    setNotifications(prev => prev.map(n => n.id === activeImportantMsg.id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    setActiveImportantMsg(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
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

        <Link href="/dashboard" className="relative group flex items-center justify-center ml-6 -mt-2">
          <div className="w-20 h-20 relative flex items-center justify-center z-10">
            <Image
              src="/trident.png"
              alt="Trinetra Logo"
              width={78}
              height={78}
              className="object-contain scale-110 transition-all duration-300 group-hover:scale-120"
            />
          </div>
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
              <>
                <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={() => setIsNotifOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
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
                          <div key={n.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.is_read ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}>
                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                              !n.is_read ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className={`text-sm font-medium leading-snug truncate ${!n.is_read ? 'text-white' : 'text-white/60'}`}>
                                  {n.title || 'Notification'}
                                </p>
                                {!n.is_read && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); markOneRead(n.id) }}
                                    className="p-0.5 text-purple-400/60 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors shrink-0"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-white/40 mt-0.5 truncate">{n.message || '—'}</p>
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
              </>
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
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-[#0C0118]/80 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="object-cover w-full h-full"
                />
              ) : (
                getInitials(profile?.full_name || user?.user_metadata?.full_name || user?.email)
              )}
            </div>
            <span className="text-sm font-medium text-gray-200 hidden lg:block max-w-[120px] truncate">
              {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </span>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={() => setIsProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                >
                  <div className="px-4 py-3 border-b border-white/5 mb-1">
                    <p className="text-sm font-semibold text-white truncate">{profile?.full_name || user?.user_metadata?.full_name || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  
                  <Link href="/dashboard/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                    <User className="w-4 h-4 text-gray-500" /> My Account
                  </Link>
                  <Link href="/dashboard/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                    <Settings className="w-4 h-4 text-gray-500" /> Settings & Preferences
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
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2-Tier Important Message Popup Modal */}
      <AnimatePresence>
        {activeImportantMsg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-lg w-full bg-[#0c0c12] border border-amber-500/20 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              {/* Alert Glow Background */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500/10 to-transparent blur-2xl rounded-full -z-10" />

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <div className="space-y-2 w-full">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                    Important Announcement
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-white pt-2 leading-snug">
                    {activeImportantMsg.title}
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed pt-2 break-words whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar px-2">
                    {activeImportantMsg.message}
                  </p>
                </div>

                <button
                  onClick={dismissImportantMsg}
                  className="w-full py-4 px-6 rounded-xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/10 text-center transition-all inline-block hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  I Understand / Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  )
}

