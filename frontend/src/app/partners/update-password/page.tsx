'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'

export default function PartnerUpdatePasswordPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    toast.success('Password updated successfully')
    // Bypass Next.js client-side router cache for proper real-time auth fetch
    window.location.href = '/partners/dashboard'
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
          <h1 className="mt-6 text-3xl font-semibold text-white">Update Password</h1>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Set your new partner portal password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-white/75">New Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-purple-500/15 bg-[#130f22] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500/40"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/75">Confirm Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-purple-500/15 bg-[#130f22] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500/40"
            />
          </label>

          {error ? (
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
            Update Password
          </button>
        </form>
      </div>
    </main>
  )
}
