'use client'

import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

interface StatCardProps {
  title: string
  icon: LucideIcon
  value: number | string
  sublabel: string
  trend?: number | null
  iconColor?: string
  isCurrency?: boolean
  isPercentage?: boolean
  isLoading?: boolean
  onClick?: () => void
  isLive?: boolean
}

export function StatCard({
  title,
  icon: Icon,
  value,
  sublabel,
  trend,
  iconColor = 'text-gray-400',
  isCurrency,
  isPercentage,
  isLoading,
  onClick,
  isLive
}: StatCardProps) {
  
  // Use count up only if value is a number
  const numericValue = typeof value === 'number' ? value : 0
  const displayValueNum = useCountUp(numericValue, 1500)
  
  // Format the display value
  let finalDisplayValue = typeof value === 'string' ? value : displayValueNum.toString()
  if (typeof value === 'number') {
    if (isCurrency) {
      finalDisplayValue = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(displayValueNum)
    } else if (isPercentage) {
      finalDisplayValue = `${displayValueNum}%`
    } else {
      finalDisplayValue = new Intl.NumberFormat('en-IN').format(displayValueNum)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="w-24 h-3 rounded bg-white/10 animate-pulse" />
          <div className="w-6 h-6 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="w-20 h-10 rounded bg-white/10 animate-pulse mb-2" />
        <div className="flex justify-between items-center">
          <div className="w-24 h-3 rounded bg-white/10 animate-pulse" />
          <div className="w-12 h-3 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div 
      onClick={onClick}
      className={`bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-white tracking-tight">
          {finalDisplayValue}
        </span>
        {isLive && numericValue > 0 && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{sublabel}</span>
        
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center text-xs font-medium ${
            trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-gray-400'
          }`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : 
             trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : 
             <Minus className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  )
}
