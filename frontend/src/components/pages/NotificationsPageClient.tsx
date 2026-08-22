'use client'

import { useState } from 'react'
import { Bell, Check, CheckCheck, Phone, MessageCircle, Calendar, Target, AlertTriangle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/client'
import toast from 'react-hot-toast'

const TYPE_META: Record<string, { icon: any; color: string; label: string }> = {
  appointment_booked: { icon: Calendar, color: 'text-green-400 bg-green-500/10 border-green-500/30', label: 'Appointment' },
  lead_captured: { icon: Target, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Lead' },
  call_completed: { icon: Phone, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', label: 'Call' },
  chat_session: { icon: MessageCircle, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'Chat' },
  usage_alert: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'Alert' },
}

export function NotificationsPageClient({ initialNotifications, userId }: { initialNotifications: any[], userId: string }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)
  const supabase = createClient()

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length > 0) {
        const inserts = unreadIds.map(id => ({
          user_id: userId,
          notification_id: id
        }))
        const { error } = await supabase
          .from('user_read_notifications')
          .insert(inserts)
        
        if (error) throw error
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update. Try again.')
    } finally {
      setMarkingAll(false)
    }
  }

  const markOneRead = async (id: string) => {
    await supabase.from('user_read_notifications').insert({ user_id: userId, notification_id: id })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-white/5">
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-display flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-violet-500" /> Notifications
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-sans">
            All your alerts and activity updates
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-violet-600 hover:text-white bg-violet-600/10 hover:bg-violet-600 border border-violet-600/20 rounded-xl transition-all cursor-pointer hover:scale-[1.02]"
          >
            {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-900 dark:text-white font-medium font-playfair">All caught up!</p>
            <p className="text-zinc-500 dark:text-zinc-450 text-sm mt-1 font-merriweather">
              You'll see alerts here when your AI books appointments, captures leads, and more.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-white/5">
            {notifications.map(notif => {
              const meta = TYPE_META[notif.type] || TYPE_META['call_completed']
              const Icon = meta.icon
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                    !notif.is_read 
                      ? 'bg-violet-500/5 dark:bg-violet-500/10' 
                      : 'hover:bg-zinc-50 dark:hover:bg-white/5'
                  }`}
                >
                  {/* Icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold font-montserrat ${
                          notif.is_read ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-white'
                        }`}>
                          {notif.title || meta.label}
                        </p>
                        <p className={`text-xs mt-0.5 leading-relaxed font-merriweather ${
                          notif.is_read ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-650 dark:text-zinc-350'
                        }`}>
                          {notif.message || notif.body || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap font-merriweather">
                          {timeAgo(notif.created_at)}
                        </span>
                        {!notif.is_read && (
                          <button
                            onClick={() => markOneRead(notif.id)}
                            className="p-1 text-violet-600 hover:text-violet-500 hover:bg-violet-600/10 rounded transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <div className="shrink-0 w-2 h-2 rounded-full bg-violet-600 mt-2" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
