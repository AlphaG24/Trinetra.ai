import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

interface AgentCallingStatusProps {
  phoneNumber: string | null
  providerType?: string | null // e.g. 'twilio', 'exotel', 'sandbox', 'simulated', etc.
  className?: string
}

export function AgentCallingStatus({ phoneNumber, providerType, className = '' }: AgentCallingStatusProps) {
  // Determine states
  let status: 'ready' | 'test' | 'not_configured' = 'not_configured'
  let label = 'Not Configured'
  let description = 'No number assigned'
  
  if (phoneNumber) {
    const isSimulated = !providerType || providerType === 'sandbox' || providerType === 'simulated'
    if (isSimulated) {
      status = 'test'
      label = 'Test Mode Only'
      description = 'Simulated provider active'
    } else {
      status = 'ready'
      label = 'Ready for Calls'
      description = 'Number assigned + provider active'
    }
  }

  const baseBadgeStyle = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all"
  
  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      {status === 'ready' && (
        <span className={`${baseBadgeStyle} bg-emerald-500/10 border-emerald-500/20 text-emerald-500`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <CheckCircle2 className="w-3.5 h-3.5" />
          {label}
        </span>
      )}
      {status === 'test' && (
        <span className={`${baseBadgeStyle} bg-amber-500/10 border-amber-500/20 text-amber-500`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <AlertTriangle className="w-3.5 h-3.5" />
          {label}
        </span>
      )}
      {status === 'not_configured' && (
        <span className={`${baseBadgeStyle} bg-rose-500/10 border-rose-500/20 text-rose-500`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <XCircle className="w-3.5 h-3.5" />
          {label}
        </span>
      )}
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-1 font-mono">
        {phoneNumber ? `${phoneNumber} (${description})` : 'No phone number assigned'}
      </span>
    </div>
  )
}
