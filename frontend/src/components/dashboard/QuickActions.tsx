'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Store, Plus, FlaskConical } from 'lucide-react'

interface QuickActionsProps {}

export function QuickActions({}: QuickActionsProps) {
  const router = useRouter()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Link
        href="/dashboard/marketplace"
        data-tour="marketplace"
        className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-sm font-semibold transition hover:scale-[1.01] shadow-sm cursor-pointer"
      >
        <Store className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        <span>Browse Marketplace</span>
      </Link>

      <button
        type="button"
        onClick={() => router.push('/dashboard/demo')}
        className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-sm font-semibold transition hover:scale-[1.01] shadow-sm cursor-pointer"
      >
        <FlaskConical className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        <span>View Demo Tools</span>
      </button>
    </div>
  )
}
