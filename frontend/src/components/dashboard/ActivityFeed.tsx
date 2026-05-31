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

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let channel: any = null

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      // Fetch initial data
      const { data: initialActivities } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (initialActivities) {
        setActivities(initialActivities as ActivityItem[])
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
            filter: `user_id=eq.${session.user.id}`
          },
          (payload: any) => {
            const newActivity = payload.new as ActivityItem
            setActivities(prev => [newActivity, ...prev].slice(0, 50)) // Keep last 50
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
  }, [supabase])

  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Live Activity</h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-white/20'}`}></span>
          </span>
          <span className={`text-sm font-medium ${isConnected ? 'text-emerald-500' : 'text-white/40'}`}>
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <Activity className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No activity yet</h3>
            <p className="text-white/50 mb-6 text-sm max-w-xs">Activity will appear here as your agents start handling interactions</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  layout
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{activity.title}</h4>
                    <p className="text-xs text-white/50 mt-0.5 break-words">{activity.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-[10px] text-white/40 whitespace-nowrap">
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
