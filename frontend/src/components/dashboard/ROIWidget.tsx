'use client'

import { TrendingUp, Phone, MessageCircle, Calendar, Target, Share2, Download, Loader2 } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'

export function ROIWidget() {
  const { stats, isLoading } = useDashboardStats([])

  // Using calculation logic as per design.md:
  // (voice_minutes × 15) + (chat_count × 20) + (appointments × 200) + (leads × 280)
  
  const metrics = {
    calls: stats?.total_calls || 0,
    chats: stats?.total_conversations || 0,
    appointments: stats?.appointments || 0,
    leads: stats?.total_leads || 0,
    planCost: 4999 // Example fixed plan cost for now
  }

  const values = {
    callsValue: metrics.calls * 15,
    chatsValue: metrics.chats * 20,
    appointmentsValue: metrics.appointments * 200,
    leadsValue: metrics.leads * 280,
  }

  const totalValue = values.callsValue + values.chatsValue + values.appointmentsValue + values.leadsValue
  // Only calculate ROI if cost is not zero and value is greater than cost
  const roiPercentage = totalValue > 0 ? Math.round(((totalValue - metrics.planCost) / metrics.planCost) * 100) : 0

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-[#0f1117]/90 border border-amber-500/30 rounded-2xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full bg-[#0f1117]/90 border border-amber-500/30 rounded-2xl p-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column */}
        <div className="flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Your ROI This Month
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
              <span className="text-sm text-white/60">You paid:</span>
              <span className="text-sm font-semibold text-white">₹{metrics.planCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <span className="text-sm text-amber-500/80">Your AI generated/saved:</span>
              <span className="text-sm font-bold text-amber-500">₹{totalValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Center Column - Big Number */}
        <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 px-4">
          <div className="text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 drop-shadow-sm mb-2">
            {roiPercentage}%
          </div>
          <p className="text-sm uppercase tracking-widest text-amber-500/70 font-semibold">
            Return on Investment
          </p>
        </div>

        {/* Right Column - Breakdown */}
        <div className="flex flex-col justify-center pl-0 md:pl-4">
          <h3 className="text-xs uppercase tracking-wider text-white/40 mb-4 font-semibold">Value Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <Phone className="w-4 h-4 text-blue-400" />
                <span>{metrics.calls} calls × ₹15</span>
              </div>
              <span className="font-medium text-white">₹{values.callsValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <MessageCircle className="w-4 h-4 text-green-400" />
                <span>{metrics.chats} chats × ₹20</span>
              </div>
              <span className="font-medium text-white">₹{values.chatsValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span>{metrics.appointments} booked × ₹200</span>
              </div>
              <span className="font-medium text-white">₹{values.appointmentsValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <Target className="w-4 h-4 text-amber-400" />
                <span>{metrics.leads} leads × ₹280</span>
              </div>
              <span className="font-medium text-white">₹{values.leadsValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="pt-3 border-t border-white/10 flex justify-between items-center mt-2">
              <span className="text-sm font-semibold text-white/80">Total Value</span>
              <span className="text-base font-bold text-amber-500">₹{totalValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button className="flex-1 flex justify-center items-center gap-2 text-xs font-semibold py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button className="flex-1 flex justify-center items-center gap-2 text-xs font-semibold py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
