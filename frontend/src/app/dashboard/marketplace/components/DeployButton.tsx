'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface DeployButtonProps {
  slug: string
  subdomainUrl?: string | null
}

export function DeployButton({ slug }: DeployButtonProps) {
  return (
    <Link
      href={`/dashboard/agents/${slug}`}
      className="w-full py-2.5 px-4 bg-zinc-100 text-zinc-900 hover:bg-white font-semibold rounded-md shadow-sm transition-all text-sm border border-transparent flex items-center justify-center gap-2 cursor-pointer text-center group"
    >
      <span>Explore</span>
      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  )
}
