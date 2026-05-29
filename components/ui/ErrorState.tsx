import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-500/5 border border-rose-500/20 rounded-2xl">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4 text-rose-500">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">{message}</p>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-400 font-medium hover:bg-rose-500/10 transition-all"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
