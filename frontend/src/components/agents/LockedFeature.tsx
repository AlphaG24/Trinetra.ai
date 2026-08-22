import { Lock } from 'lucide-react'
import Link from 'next/link'

interface LockedFeatureProps {
  title: string
  description: string
  upgradeUrl: string
}

export function LockedFeature({ title, description, upgradeUrl }: LockedFeatureProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm">
      <div className="w-16 h-16 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] mb-5 shadow-inner">
        <Lock className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold font-display text-[var(--heading)] mb-2">{title}</h3>
      <p className="text-sm font-sans text-[var(--body)] max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <Link 
        href={upgradeUrl} 
        className="px-6 py-3 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] shadow-md cursor-pointer"
      >
        Upgrade to Unlock →
      </Link>
    </div>
  )
}
