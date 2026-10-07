import { Suspense } from 'react'
import { KYCTab } from '@/src/components/settings/KYCTab'
import { ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'KYC & Regulatory Compliance | Trinetra AI',
  description: 'Statutory identity verification and telecommunication compliance documents.',
}

export default function KYCPage() {
  return (
    <div className="space-y-6 text-left pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold font-display text-[var(--heading)] tracking-tight leading-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-violet-500" />
          KYC & Regulatory Compliance
        </h1>
        <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">
          Manage entity verification, statutory consent, and telecom carrier compliance documents.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }>
        <KYCTab />
      </Suspense>
    </div>
  )
}
