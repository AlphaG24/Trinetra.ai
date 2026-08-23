'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sun, Moon, Menu, Bell, LogOut, User } from 'lucide-react'
import { useTheme } from '@/src/components/ui/theme-provider'
import { ThemeToggle } from '@/src/components/ui/theme-toggle'

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, toggleTheme, mounted } = useTheme()
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null)
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const router = useRouter()

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
            const { data: notifs } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', currentUser.id)
              .order('created_at', { ascending: false })
              .limit(5)
            
            if (notifs) {
              setNotifications(notifs)
              setUnreadCount(notifs.filter((n: any) => !n.is_read).length)
            }
          }

          await fetchNotifs()

          // Subscribe to Postgres changes on notifications table
          channel = supabase
            .channel('topbar-notifications-realtime')
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
    <header className="fixed top-0 right-0 left-0 h-16 bg-[var(--card-bg)] border-b border-[var(--border)] z-30 transition-colors duration-200">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side: Logo + Mobile Menu */}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden text-[var(--muted)] hover:text-[var(--heading)] transition-colors mr-1"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          <Link href="/dashboard" className="flex items-center ml-1">
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
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowNotifDropdown(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden z-50 py-1">
                  <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                    <span className="font-playfair font-bold text-sm text-gray-300">Recent Notifications</span>
                    {unreadCount > 0 && <span className="text-[10px] font-bold bg-rose-500/15 text-rose-500 px-1.5 py-0.5 rounded-full">{unreadCount} new</span>}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border)]">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-[var(--muted)] font-merriweather">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-left ${!n.is_read ? 'bg-violet-500/5 dark:bg-violet-500/10' : ''}`}>
                          <p className="text-xs font-semibold text-[var(--heading)] font-playfair">{n.title}</p>
                          <p className="text-[10px] text-[var(--body)] mt-0.5 font-merriweather line-clamp-2">{n.message || n.body}</p>
                          <span className="text-[9px] text-[var(--muted)] font-merriweather mt-1 block">
                            {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
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
                      className="w-full text-center py-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-all cursor-pointer"
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
              <div className="w-8 h-8 rounded-full overflow-hidden bg-violet-600/10 text-violet-600 dark:text-violet-400 border border-[var(--border)] flex items-center justify-center font-bold text-sm shrink-0">
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
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden py-1 z-50">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--body)] hover:bg-[var(--hover-bg)] hover:text-[var(--heading)] transition-colors font-playfair font-bold"
                  >
                    <User className="w-4 h-4 text-[var(--muted)]" /> My Profile
                  </Link>
                  <button
                    onClick={() => { setIsDropdownOpen(false); handleSignOut() }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--hover-bg)] hover:text-red-400 text-left transition-colors font-playfair font-bold"
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