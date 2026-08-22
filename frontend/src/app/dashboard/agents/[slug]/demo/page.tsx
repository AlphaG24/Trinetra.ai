'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function AgentDemoPageRedirect({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const slug = resolvedParams.slug

  useEffect(() => {
    router.replace(`/dashboard/agents/${slug}`)
  }, [slug, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-zinc-400 gap-2">
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      <p className="text-xs">Redirecting to unified workspace...</p>
    </div>
  )
}
