'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy, RefreshCw, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface ApiKeyManagerProps {
  label: string
  configKey: string
  value: string
  onChange: (key: string, newValue: string) => void
  onRotate?: (key: string) => void
  readOnly?: boolean
}

export function ApiKeyManager({
  label,
  configKey,
  value,
  onChange,
  onRotate,
  readOnly = false,
}: ApiKeyManagerProps) {
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRotate = () => {
    if (onRotate) {
      onRotate(configKey)
    }
  }

  const maskValue = (val: string) => {
    if (!val) return '••••••••••••••••'
    if (val.length <= 8) return '••••••••'
    return `${val.substring(0, 4)}••••••••${val.substring(val.length - 4)}`
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
      <div className="space-y-1">
        <label className="text-xs font-bold text-white block">{label}</label>
        <span className="text-[10px] text-zinc-500 font-mono block">{configKey}</span>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-80">
          <input
            type={showKey ? 'text' : 'password'}
            value={showKey ? value : maskValue(value)}
            onChange={(e) => onChange(configKey, e.target.value)}
            readOnly={readOnly}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-violet-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title={showKey ? 'Hide key' : 'Show key'}
        >
          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Copy key"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>

        {onRotate && (
          <button
            type="button"
            onClick={handleRotate}
            className="px-3 py-2 rounded-xl bg-violet-600/10 border border-violet-500/30 text-violet-400 hover:bg-violet-600/20 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Rotate key"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rotate
          </button>
        )}
      </div>
    </div>
  )
}
