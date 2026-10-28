'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, PhoneOff, Calendar, Target, 
  MessageCircle, PhoneMissed, AlertTriangle, FlaskConical, Activity
} from 'lucide-react'
import { createClient } from '@/lib/client'

export type ActivityType = 
  | 'call_started' 
  | 'call_ended' 
  | 'appointment_booked' 
  | 'lead_captured' 
  | 'chat_started' 
  | 'missed_call' 
  | 'usage_alert' 
  | 'demo_call'

export interface ActivityItem {
  id: string
  type?: ActivityType
  activity_type?: ActivityType
  title: string
  description: string
  created_at: string
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'call_started': return <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full"><Phone className="w-4 h-4" /></div>
    case 'call_ended': return <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full"><PhoneOff className="w-4 h-4" /></div>
    case 'appointment_booked': return <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full"><Calendar className="w-4 h-4" /></div>
    case 'lead_captured': return <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full"><Target className="w-4 h-4" /></div>
    case 'chat_started': return <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full"><MessageCircle className="w-4 h-4" /></div>
    case 'missed_call': return <div className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full"><PhoneMissed className="w-4 h-4" /></div>
    case 'usage_alert': return <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full"><AlertTriangle className="w-4 h-4" /></div>
    case 'demo_call': return <div className="p-2 bg-zinc-500/10 text-zinc-900 dark:text-white rounded-full"><FlaskConical className="w-4 h-4" /></div>
    default: return <div className="p-2 bg-gray-500/10 text-gray-600 dark:text-gray-400 rounded-full"><AlertTriangle className="w-4 h-4" /></div>
  }
}

// Simple time ago formatter
const timeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  return `${Math.floor(hours / 24)}d ago`
}

interface ActivityFeedProps {
  activities?: ActivityItem[]
  loading?: boolean
  error?: any
  onRetry?: () => void
}

export function ActivityFeed({
  activities: propActivities,
  loading,
  error,
  onRetry
}: ActivityFeedProps = {}) {
  const [localActivities, setLocalActivities] = useState<ActivityItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createClient()

  const isControlled = propActivities !== undefined
  const rawActivities = isControlled ? propActivities : localActivities
  
  // Strictly filter to live activity from the last 6 hours (never show days-old messages)
  const now = Date.now()
  const displayActivities = (rawActivities || []).filter(item => {
    if (!item?.created_at) return true
    const itemTime = new Date(item.created_at).getTime()
    return (now - itemTime) <= 6 * 60 * 60 * 1000
  })

  useEffect(() => {
    if (isControlled) return

    let channel: any = null

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      // Fetch initial data strictly within last 5 hours
      const fiveHoursAgoIso = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      const { data: initialActivities } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', fiveHoursAgoIso)
        .order('created_at', { ascending: false })
        .limit(50)

      if (initialActivities) {
        setLocalActivities(initialActivities as ActivityItem[])
      }

      setIsConnected(true)

      const channelName = `activity-feed-${user.id}`
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_log',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            const newActivity = payload.new as ActivityItem
            setLocalActivities(prev => [newActivity, ...prev].slice(0, 50)) // Keep last 50
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, isControlled])

  return (
    <div className="bg-transparent h-full flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
        <h2 className="text-sm md:text-base font-bold font-montserrat text-zinc-900 dark:text-white uppercase tracking-wider">Recent Activity</h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`relative inline-flex rounded-full h-2 w-2 ${(isConnected || isControlled) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}></span>
          </span>
          <span className={`text-xs font-semibold ${(isConnected || isControlled) ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400'}`}>
            {(isConnected || isControlled) ? 'Active' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <div suppressHydrationWarning className="w-8 h-8 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-zinc-400">Loading activity...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
            <p className="text-sm text-red-500 mb-3">{error.message || 'Failed to load activity'}</p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        ) : displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center py-6">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 border border-zinc-200/80 dark:border-zinc-700">
              <Activity className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold font-montserrat text-zinc-900 dark:text-white mb-1">No recent activity</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">Events from the last 5 hours will appear here in real time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {displayActivities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  layout
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--hover-bg)] transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon((activity.type || activity.activity_type || 'call_ended') as ActivityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--heading)] truncate">{activity.title}</h4>
                    <p className="text-xs text-[var(--body)] mt-0.5 break-words">{activity.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-[10px] text-[var(--muted)] whitespace-nowrap">
                    {timeAgo(activity.created_at)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
