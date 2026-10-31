'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, LogOut, User, CheckCheck, Globe } from 'lucide-react'
import { useAuth, UserProfile } from '@/src/components/providers/AuthProvider'
import { VaakritiWordmark } from '@/components/ui/VaakritiWordmark'

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user: authUser, profile: authProfile, signOut: authSignOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string; name?: string; [key: string]: any } } | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (authProfile) setProfile(authProfile)
    if (authUser) setUser(authUser)
  }, [authProfile, authUser])

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

  const fetchNotifsRef = useRef<() => void>(() => {})

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()
    let activeChannel: any = null
    let pollInterval: any = null

    const handleCallCompleted = () => {
      fetchNotifsRef.current?.()
    }
    window.addEventListener('trinetra:call_completed', handleCallCompleted)

    const fetchNotifs = async () => {
      if (!isMounted) return
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          if (!isMounted) return
          const rawList = data.notifications || []
          const seen = new Set()
          const list = rawList.filter((n: any) => {
            const key = `${n.title || ''}-${(n.message || n.body || '').slice(0, 40)}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          const count = data.unreadCount ?? list.filter((n: any) => !n.is_read).length
          setNotifications(list.slice(0, 5))
          setUnreadCount(count)
          return
        }
      } catch {
        // Fallback to client Supabase below
      }

      if (!isMounted) return
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser || !isMounted) return

        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .eq('is_read', false)
        if (!isMounted) return
        setUnreadCount(count || 0)

        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(15)
        
        if (notifs && isMounted) {
          const seen = new Set()
          const deduped = notifs.filter((n: any) => {
            const key = `${n.title || ''}-${(n.message || n.body || '').slice(0, 40)}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          setNotifications(deduped.slice(0, 5))
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      }
    }

    fetchNotifsRef.current = fetchNotifs

    async function loadUserAndSubscribe() {
      try {
        const currentUser = authUser || (await supabase.auth.getUser()).data?.user
        if (!currentUser || !isMounted) return

        if (!user) setUser(currentUser)
        if (authProfile) {
          setProfile(authProfile)
        } else if (!profile) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', currentUser.id)
            .maybeSingle()
          if (data && isMounted) setProfile(data as unknown as UserProfile)
        }

        if (!isMounted) return
        await fetchNotifs()

        // Clean up any existing topbar notification channels for this user to avoid duplicate subscription errors
        try {
          const existingChannels = supabase.getChannels().filter((c: any) => c.topic?.includes(`topbar-notifs-${currentUser.id}`))
          for (const ch of existingChannels) {
            supabase.removeChannel(ch)
          }
        } catch {}

        if (!isMounted) return

        // Deterministic channel name to reuse existing connection and prevent replication slot leak
        const channelName = `topbar-notifs-${currentUser.id}`
        try {
          const ch = supabase.channel(channelName)
          activeChannel = ch
          ch.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`
            },
            () => {
              if (isMounted) fetchNotifsRef.current?.()
            }
          ).subscribe((status: string) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn('[Topbar Realtime] Realtime notification channel error')
            }
          })
        } catch (realtimeErr) {
          console.warn('[Topbar Realtime] Error initializing realtime notification channel:', realtimeErr)
        }

        // Heartbeat fallback poll every 60s
        pollInterval = setInterval(() => {
          if (isMounted) fetchNotifsRef.current?.()
        }, 60000)
      } catch (err) {
        console.error('Error loading user profile or subscribing to notifications in Topbar:', err)
      }
    }

    loadUserAndSubscribe()

    return () => {
      isMounted = false
      window.removeEventListener('trinetra:call_completed', handleCallCompleted)
      if (pollInterval) clearInterval(pollInterval)
      if (activeChannel) {
        try {
          supabase.removeChannel(activeChannel)
        } catch {}
      }
    }
  }, [authUser?.id, authProfile?.id])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      // Enforce a 600ms ceiling on supabase.auth.signOut() so it NEVER hangs
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 600))
      ])
    } catch {}
    try {
      sessionStorage.clear()
      localStorage.removeItem('trinetra_auth_profile_cache')
      localStorage.removeItem('trinetra_user_role')
      localStorage.removeItem('supabase.auth.token')
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    } catch {}
    window.location.href = '/login?signed_out=true'
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Instant hydration fallback from client storage only after mount to prevent SSR mismatch
  let cachedDisplayName = ''
  if (mounted && typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem('trinetra_auth_profile_cache') || localStorage.getItem('trinetra_auth_profile_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        cachedDisplayName = parsed?.profile?.full_name || parsed?.user?.user_metadata?.full_name || ''
      }
    } catch {}
  }

  const isPlaceholderName = (val?: string | null) => {
    if (!val) return true
    const l = val.toLowerCase().trim()
    return l === 'partner' || l === 'nexus' || l === 'nexus.ai.ops' || l === 'user'
  }

  const rawDisplayName = (
    (!isPlaceholderName(profile?.full_name) ? profile?.full_name : '') ||
    (!isPlaceholderName(authProfile?.full_name) ? authProfile?.full_name : '') ||
    (!isPlaceholderName(cachedDisplayName) ? cachedDisplayName : '') ||
    (!isPlaceholderName(user?.user_metadata?.full_name) ? user?.user_metadata?.full_name : '') ||
    (!isPlaceholderName(authUser?.user_metadata?.full_name) ? authUser?.user_metadata?.full_name : '') ||
    (!isPlaceholderName(user?.user_metadata?.name) ? user?.user_metadata?.name : '') ||
    (!isPlaceholderName(authUser?.user_metadata?.name) ? authUser?.user_metadata?.name : '') ||
    (profile?.full_name || authProfile?.full_name || 'Raghav')
  ).trim()
  const displayName = isPlaceholderName(rawDisplayName) ? 'Raghav' : rawDisplayName
  const avatarUrl = profile?.avatar_url || authProfile?.avatar_url

  return (
    <header className="fixed top-0 right-0 left-0 h-16 bg-[var(--card-bg)] border-b border-[var(--border)] z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side: Text Logo Only */}
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center group py-1" aria-label="Vaakriti Dashboard">
            <VaakritiWordmark className="h-4 md:h-4.5 w-auto text-zinc-900 dark:text-white transition-colors" />
          </Link>
        </div>

        {/* Right side: notifications, theme toggle, profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              suppressHydrationWarning
              onClick={() => {
                const next = !showNotifDropdown
                setShowNotifDropdown(next)
                if (next && fetchNotifsRef.current) {
                  fetchNotifsRef.current()
                }
              }}
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


          {/* User Dropdown */}
          <div className="relative">
            <button
              suppressHydrationWarning
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 hover:bg-[var(--hover-bg)] rounded-xl transition-colors"
            >
              <div suppressHydrationWarning className="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-white border border-[var(--border)] flex items-center justify-center font-bold text-sm shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName[0]?.toUpperCase()
                )}
              </div>
              <span suppressHydrationWarning className="text-sm font-bold text-gray-400 hidden sm:block max-w-[120px] truncate font-playfair">
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
                  <Link
                    href="/"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-[var(--body)] hover:bg-[var(--hover-bg)] hover:text-[var(--heading)] transition-colors font-playfair font-extrabold"
                  >
                    <Globe className="w-4 h-4 text-[var(--muted)]" /> View Website
                  </Link>
                  <button
                    suppressHydrationWarning
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