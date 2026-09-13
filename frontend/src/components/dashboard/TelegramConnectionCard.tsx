'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Send, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

export default function TelegramConnectionCard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'trinetra_messaging_bot'

  const fetchProfile = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        throw new Error('User not authenticated. Please log in.')
      }
      setUser(authUser)

      // Get profile details from database
      const { data: dbProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, telegram_chat_id, onboarding_complete')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        throw profileError
      }
      setProfile(dbProfile)
    } catch (err: any) {
      console.error('Error loading Telegram connection details:', err)
      setError(err.message || 'Failed to fetch connection status.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-xs text-[var(--muted)] mt-3 animate-pulse">Loading connection status...</p>
      </div>
    )
  }

  const isConnected = !!(profile?.telegram_chat_id)
  const telegramLink = `https://t.me/${botUsername}?start=${profile?.id || ''}`

  // Mask chat ID for privacy (e.g. 7743675039 -> *****5039)
  const getMaskedChatId = (chatId: string) => {
    if (!chatId) return ''
    const str = String(chatId)
    if (str.length <= 4) return str
    return '*'.repeat(str.length - 4) + str.slice(-4)
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
                    {getMaskedChatId(profile.telegram_chat_id)}
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
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
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

            {/* UX Note banner */}
            <div className="p-4 bg-violet-500/5 border border-violet-500/15 rounded-xl">
              <p className="text-xs text-violet-700 dark:text-violet-300/80 leading-relaxed">
                ℹ️ <strong>Direct Linking:</strong> Clicking this button will securely open Telegram. Press the
                &apos;Start&apos; button inside the chat to automatically map your system alerts directly to your
                phone. No manual ID copying required.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
