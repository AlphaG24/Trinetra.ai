'use client'

import { useEffect, useState } from 'react'
import { CheckCheck, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface CopyButtonProps {
  text: string
  label?: string
}

export default function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!', { duration: 2000 })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 px-3 py-1.5 text-xs text-white/45 transition hover:border-amber-500/50 hover:text-white"
    >
      {copied ? (
        <CheckCheck className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? 'Copied!' : label}
    </button>
  )
}
