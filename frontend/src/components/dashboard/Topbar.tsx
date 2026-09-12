'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, Bell, LogOut, User, CheckCheck } from 'lucide-react'
import { ThemeToggle } from '@/src/components/ui/theme-toggle'

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null)
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const router = useRouter()

  const formatTimeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d === 1) return 'Yesterday'
    if (d < 7) return `${d}d ago`
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const markDropdownOneRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  const markDropdownAllRead = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    let channel: any = null

    async function loadUserAndSubscribe() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          setUser(currentUser)
          const { data } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', currentUser.id)
            .single()
          setProfile(data)

          const fetchNotifs = async () => {
            const { count } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', currentUser.id)
              .eq('is_read', false)
            setUnreadCount(count || 0)

            const { data: notifs } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', currentUser.id)
              .order('created_at', { ascending: false })
              .limit(10)
            
            if (notifs) {
              const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
              const recentList = notifs.filter((n: any) => !n.is_read || new Date(n.created_at).getTime() >= sevenDaysAgo).slice(0, 5)
              setNotifications(recentList)
            }
          }

          await fetchNotifs()

          // Subscribe to Postgres changes on notifications table
          const uniqueChannelName = `topbar-notifications-${currentUser.id}-${Math.random().toString(36).slice(2, 9)}`
          channel = supabase
            .channel(uniqueChannelName)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${currentUser.id}`
              },
              () => {
                fetchNotifs()
              }
            )
            .subscribe()
        }
      } catch (err) {
        console.error('Error loading user profile or subscribing to notifications in Topbar:', err)
      }
    }

    loadUserAndSubscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatar_url

  return (
    <header className="fixed top-0 right-0 left-0 h-16 bg-[var(--card-bg)] border-b border-[var(--border)] z-[999]">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side: Logo + Mobile Menu */}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--heading)] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Link href="/dashboard" className="flex items-center gap-2">
            <img
              src="/trident.png"
              alt="Trinetra"
              className="dynamic-logo h-12 md:h-14 w-auto object-contain -mt-0.5"
            />
          </Link>
        </div>

        {/* Right side: notifications, theme toggle, profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--heading)] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[var(--card-bg)]" />
              )}
            </button>
            
            {showNotifDropdown && (
              <>
                <div className="fixed inset-0 z-[9998] bg-transparent" onClick={() => setShowNotifDropdown(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden z-[9999] py-1">
                  <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-playfair font-bold text-sm text-[var(--heading)]">Recent Notifications</span>
                      {unreadCount > 0 && <span className="text-[10px] font-bold bg-rose-500/15 text-rose-500 px-1.5 py-0.5 rounded-full">{unreadCount} new</span>}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markDropdownAllRead}
                        className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-[var(--muted)] font-merriweather">
                        All caught up! No recent notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.is_read) markDropdownOneRead(n.id)
                            if (n.action_url) router.push(n.action_url)
                          }}
                          className={`px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-left cursor-pointer group relative ${!n.is_read ? 'bg-zinc-500/5 dark:bg-white/5' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[var(--heading)] font-playfair">{n.title}</p>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--body)] mt-0.5 font-merriweather line-clamp-2">{n.message || n.body}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[9px] text-[var(--muted)] font-merriweather">
                              {formatTimeAgo(n.created_at)}
                            </span>
                            {!n.is_read && (
                              <button
                                onClick={(e) => markDropdownOneRead(n.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-sans transition-opacity"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-2 border-t border-[var(--border)]">
                    <button
                      onClick={() => {
                        setShowNotifDropdown(false)
                        router.push('/dashboard/notifications')
                      }}
                      className="btn-luxury-animated w-full text-center py-2 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 hover:bg-[var(--hover-bg)] rounded-xl transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-white border border-[var(--border)] flex items-center justify-center font-bold text-sm shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName[0]?.toUpperCase()
                )}
              </div>
              <span className="text-sm font-bold text-gray-400 hidden sm:block max-w-[120px] truncate font-playfair">
                {displayName}
              </span>
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-[9998] bg-transparent"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden py-1 z-[9999]">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-[var(--body)] hover:bg-[var(--hover-bg)] hover:text-[var(--heading)] transition-colors font-playfair font-extrabold"
                  >
                    <User className="w-4 h-4 text-[var(--muted)]" /> My Profile
                  </Link>
                  <button
                    onClick={() => { setIsDropdownOpen(false); handleSignOut() }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-red-500 hover:bg-[var(--hover-bg)] hover:text-red-400 text-left transition-colors font-playfair font-extrabold"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar