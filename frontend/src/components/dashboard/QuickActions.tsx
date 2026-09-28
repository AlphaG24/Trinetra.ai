'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Store, Plus, FlaskConical } from 'lucide-react'

interface QuickActionsProps {}

export function QuickActions({}: QuickActionsProps) {
  const router = useRouter()
  return (
    <div suppressHydrationWarning className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Link
        suppressHydrationWarning
        href="/dashboard/marketplace"
        className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-[var(--border)] text-[var(--heading)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-xs font-semibold transition hover:scale-[1.01] shadow-sm cursor-pointer"
      >
        <Store className="w-4 h-4 text-violet-500" />
        <span>Browse Marketplace</span>
      </Link>

      <button
        suppressHydrationWarning
        type="button"
        onClick={() => router.push('/dashboard/demo')}
        className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-[var(--border)] text-[var(--heading)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-xs font-semibold transition hover:scale-[1.01] shadow-sm cursor-pointer"
      >
        <FlaskConical className="w-4 h-4 text-violet-500" />
        <span>View Demo Tools</span>
      </button>
    </div>
  )
}
