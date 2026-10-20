'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Send, RefreshCw, CheckCircle2, AlertTriangle, Loader2, Copy, Check, MessageSquare } from 'lucide-react'

export default function TelegramConnectionCard() {
  const { user: authUser, profile: authProfile, refreshProfile: refreshAuthProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [savingManualId, setSavingManualId] = useState(false)
  const [manualChatId, setManualChatId] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'trinetra_messaging_bot'

  const fetchProfile = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const res = await fetch('/api/profiles')
      if (res.ok) {
        const data = await res.json()
        if (data.profile) {
          setProfile(data.profile)
          return
        }
      }
      // Fallback to auth context profile
      if (authProfile) {
        setProfile(authProfile)
      }
    } catch (err: any) {
      console.warn('Could not refresh profile from server, using cached profile:', err)
      if (authProfile) {
        setProfile(authProfile)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile)
    }
    fetchProfile(false)
  }, [authProfile?.id])

  const effectiveUserId = profile?.id || authUser?.id || authProfile?.id || ''
  const isConnected = !!(profile?.telegram_chat_id || authProfile?.telegram_chat_id)
  const activeChatId = profile?.telegram_chat_id || authProfile?.telegram_chat_id || ''
  const telegramLink = `https://t.me/${botUsername}?start=${effectiveUserId}`

  const getMaskedChatId = (chatId: string) => {
    if (!chatId) return ''
    const str = String(chatId)
    if (str.length <= 4) return str
    return '*'.repeat(str.length - 4) + str.slice(-4)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(telegramLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleSaveManualChatId = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualChatId.trim()) return

    setSavingManualId(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_chat_id: manualChatId.trim(),
          onboarding_complete: true,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to update Telegram Chat ID')
      }

      setSuccessMsg('Telegram Chat ID linked successfully!')
      setManualChatId('')
      setShowManualInput(false)
      await fetchProfile(true)
      if (refreshAuthProfile) await refreshAuthProfile()
    } catch (err: any) {
      setError(err.message || 'Could not link Chat ID')
    } finally {
      setSavingManualId(false)
    }
  }

  if (loading && !profile && !authProfile) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-xs text-[var(--muted)] mt-3 animate-pulse">Loading connection status...</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col gap-6 relative z-10">
        {/* Header Block */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-500 dark:text-violet-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--heading)] text-base font-display">Telegram Alert Link</h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">Receive instant voice transcripts and call alerts</p>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isConnected ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected</span>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Not Linked</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 text-xs items-start">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex gap-2 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs items-start">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Action State */}
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Account Linked Successfully</h4>
                <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                  Your profile is actively mapped to Telegram Chat ID{' '}
                  <code className="px-1.5 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                    {getMaskedChatId(activeChatId)}
                  </code>.
                  No further configuration is required.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchProfile(true)}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--background)] hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-50 text-[var(--heading)] font-medium rounded-xl border border-[var(--border)] transition-all duration-200 text-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[var(--muted)] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Checking status...' : 'Refresh Connection'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={effectiveUserId ? telegramLink : '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!effectiveUserId) {
                    e.preventDefault()
                    setError('Loading your account profile, please wait...')
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-bold rounded-xl transition-all duration-300 shadow-md text-sm text-center"
              >
                <Send className="w-4 h-4" />
                <span>Connect Telegram Bot</span>
              </a>

              <button
                type="button"
                onClick={() => fetchProfile(true)}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-[var(--background)] border border-[var(--border)] hover:border-violet-500/40 disabled:opacity-50 text-[var(--heading)] font-medium rounded-xl transition-all duration-200 text-sm whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-violet-500 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Checking...' : 'Check Status'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-xs text-[var(--muted)] hover:text-violet-500 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Bot link copied!' : 'Copy direct link'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-xs text-violet-500 hover:text-violet-600 font-medium cursor-pointer"
              >
                {showManualInput ? 'Hide manual ID' : 'Enter Telegram ID manually'}
              </button>
            </div>

            {showManualInput && (
              <form onSubmit={handleSaveManualChatId} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Enter your Telegram Chat ID (e.g. 7743675039)"
                  value={manualChatId}
                  onChange={(e) => setManualChatId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={savingManualId || !manualChatId.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl transition cursor-pointer"
                >
                  {savingManualId ? 'Saving...' : 'Save'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
