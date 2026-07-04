'use client'

import React, { useTransition } from 'react'
import { deployDemoService } from '../../../actions/marketplace'
import { Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeployButtonProps {
  slug: string
}

export function DeployButton({ slug }: DeployButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleDeploy = () => {
    startTransition(async () => {
      try {
        const result = await deployDemoService(slug)
        if (result && result.error) {
          toast.error(result.error)
        } else {
          toast.success("AI Service deployed successfully!")
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to deploy demo service")
      }
    })
  }

  return (
    <button
      onClick={handleDeploy}
      disabled={isPending}
      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed group"
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          <span>Provisioning Sandbox...</span>
        </>
      ) : (
        <>
          <Play className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          <span>Deploy Demo Tool</span>
        </>
      )}
    </button>
  )
}
