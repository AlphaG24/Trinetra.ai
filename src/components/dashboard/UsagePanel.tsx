'use client'

import { Zap, AlertTriangle, Loader2 } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'

interface UsagePanelProps {
  subscription: any
}

export function UsagePanel({ subscription }: UsagePanelProps) {
  // Use empty array for agents to get overall stats
  const { stats, isLoading } = useDashboardStats([])
  
  const planName = subscription?.plan?.name || 'Free Plan'
  
  // Real usage data mapped from stats hook, limits from subscription or default
  const voiceLimit = subscription?.plan?.features?.voice_minutes_limit || 100
  const chatLimit = subscription?.plan?.features?.chat_sessions_limit || 500
  
  const usage = [
    { resource: 'Voice Calls', used: stats?.total_calls || 0, limit: voiceLimit },
    { resource: 'Chat Sessions', used: stats?.total_conversations || 0, limit: chatLimit },
  ]

  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Plan Usage This Month
        </h2>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
          {planName}
        </span>
      </div>

      <div className="flex-1 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-amber-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          usage.map((item, idx) => {
            const percent = Math.min(100, Math.round((item.used / item.limit) * 100)) || 0
            let colorClass = 'from-purple-500 to-purple-600'
            if (percent > 70) colorClass = 'from-amber-500 to-amber-600'
            if (percent > 90) colorClass = 'from-red-500 to-red-600'

            return (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80 font-medium">{item.resource}</span>
                  <span className="text-white/60">
                    <span className="text-white font-medium">{item.used}</span> / {item.limit}
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {percent > 90 && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    Running low
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-white/5 text-center">
        <p className="text-sm text-white/50 mb-4">
          Renews {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'soon'}
        </p>
        
        {usage.some(u => (u.used / u.limit) > 0.8) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-left">
            <h4 className="text-sm font-semibold text-amber-500 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Running low on resources
            </h4>
            <p className="text-xs text-white/70 mb-3">
              Upgrade your plan to ensure your AI agents don't stop working.
            </p>
            <button className="text-xs w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors">
              Upgrade Plan →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
