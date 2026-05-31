'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'

export default function PartnerResetPasswordPage() {
  const supabase = createBrowserClient()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'submitted' | 'error'>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/partners/update-password`,
      }
    )

    if (resetError) {
      setState('error')
      setError(resetError.message)
      setLoading(false)
      return
    }

    setState('submitted')
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),transparent_38%)]" />
      <div className="relative w-full max-w-[480px] rounded-2xl border border-purple-500/15 bg-[#100d1f] p-8 shadow-2xl sm:p-10">
        <div className="mb-8 text-center">
          <Image
            src="/trident.png"
            alt="Trinetra AI"
            width={100}
            height={100}
            className="mx-auto h-24 md:h-28 w-auto object-contain drop-shadow-[0_0_25px_rgba(245,197,24,0.15)]"
            priority
          />
          <h1 className="mt-6 text-3xl font-semibold text-white">Reset Password</h1>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Enter your partner email and we&apos;ll send a secure reset link.
          </p>
        </div>

        {state === 'submitted' ? (
          <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
            <p className="font-medium text-white">Check your inbox.</p>
            <p>A reset link has been sent to {email} if it exists in our system.</p>
            <p>Didn&apos;t receive it? Check your spam folder or contact support.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-white/75">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-purple-500/15 bg-[#130f22] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500/40"
              />
            </label>

            {state === 'error' ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5c518] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send Reset Link
            </button>
          </form>
        )}

        <div className="mt-6">
          <Link href="/partners/login" className="text-sm text-white/55 transition hover:text-white">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
