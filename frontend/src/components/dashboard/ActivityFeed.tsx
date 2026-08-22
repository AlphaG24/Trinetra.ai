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
  type: ActivityType
  title: string
  description: string
  created_at: string
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'call_started': return <div className="p-2 bg-blue-500/10 text-blue-400 rounded-full"><Phone className="w-4 h-4" /></div>
    case 'call_ended': return <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full"><PhoneOff className="w-4 h-4" /></div>
    case 'appointment_booked': return <div className="p-2 bg-orange-500/10 text-orange-400 rounded-full"><Calendar className="w-4 h-4" /></div>
    case 'lead_captured': return <div className="p-2 bg-amber-500/10 text-amber-400 rounded-full"><Target className="w-4 h-4" /></div>
    case 'chat_started': return <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full"><MessageCircle className="w-4 h-4" /></div>
    case 'missed_call': return <div className="p-2 bg-red-500/10 text-red-400 rounded-full"><PhoneMissed className="w-4 h-4" /></div>
    case 'usage_alert': return <div className="p-2 bg-amber-500/10 text-amber-400 rounded-full"><AlertTriangle className="w-4 h-4" /></div>
    case 'demo_call': return <div className="p-2 bg-purple-500/10 text-purple-400 rounded-full"><FlaskConical className="w-4 h-4" /></div>
    default: return <div className="p-2 bg-gray-500/10 text-gray-400 rounded-full"><AlertTriangle className="w-4 h-4" /></div>
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
  const displayActivities = isControlled ? propActivities : localActivities

  useEffect(() => {
    if (isControlled) return

    let channel: any = null

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      // Fetch initial data
      const { data: initialActivities } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (initialActivities) {
        setLocalActivities(initialActivities as ActivityItem[])
      }

      setIsConnected(true)

      channel = supabase
        .channel('activity-feed')
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--heading)]">Live Activity</h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {(isConnected || isControlled) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${(isConnected || isControlled) ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}></span>
          </span>
          <span className={`text-sm font-medium ${(isConnected || isControlled) ? 'text-emerald-500' : 'text-[var(--muted)]'}`}>
            {(isConnected || isControlled) ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-[var(--muted)]">Loading activity...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
            <p className="text-sm text-red-400 mb-3">{error.message || 'Failed to load activity'}</p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        ) : displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hover-bg)] flex items-center justify-center mb-4 border border-[var(--border)]">
              <Activity className="w-8 h-8 text-[var(--muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--heading)] mb-2">No activity yet</h3>
            <p className="text-[var(--muted)] mb-6 text-sm max-w-xs">Activity will appear here as your agents start handling interactions</p>
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
                    {getActivityIcon(activity.type)}
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
