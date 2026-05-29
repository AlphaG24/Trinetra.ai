import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  actionHref,
  actionOnClick 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#0f1117]/50 border border-white/5 rounded-2xl border-dashed">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">{description}</p>
      
      {actionLabel && actionHref && (
        <Link 
          href={actionHref}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 text-white font-medium hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && actionOnClick && (
        <button 
          onClick={actionOnClick}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 text-white font-medium hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
