import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface OnboardingBannerProps {
  progress: {
    is_complete: boolean
    steps_completed: number
    total_steps: number
    next_step_label: string
    next_step_desc: string
    next_step_href: string
  }
}

export function OnboardingBanner({ progress }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (progress.is_complete || dismissed) return null

  return (
    <div className="w-full bg-gradient-to-r from-violet-600/10 to-blue-500/10 border border-violet-500/30 rounded-xl p-4 mb-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        
        {/* Left: Progress */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Setup Progress</span>
          <div className="flex items-center gap-2">
            {Array.from({ length: progress.total_steps }).map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all ${
                  i < progress.steps_completed 
                    ? 'w-6 bg-violet-500' 
                    : 'w-2 bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">{progress.steps_completed} of {progress.total_steps} steps complete</span>
        </div>

        {/* Center: Current Task */}
        <div className="flex-1 md:px-8 md:border-l md:border-white/5">
          <h4 className="text-sm font-medium text-white mb-0.5">Next: {progress.next_step_label}</h4>
          <p className="text-xs text-gray-400">{progress.next_step_desc}</p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link 
            href={progress.next_step_href}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-500 text-white text-sm font-medium rounded-lg hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
          >
            Continue Setup <ArrowRight className="w-4 h-4" />
          </Link>
          <button 
            onClick={() => setDismissed(true)}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
