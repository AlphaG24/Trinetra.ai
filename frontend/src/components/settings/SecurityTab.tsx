'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock, KeyRound, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function SecurityTab() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Danger Zone states
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!newPassword) return { label: '', color: '' }
    if (newPassword.length < 6) return { label: 'Weak', color: 'text-rose-500 bg-rose-500/10' }
    
    const hasNumbers = /\d/.test(newPassword)
    const hasSymbols = /[^A-Za-z0-9]/.test(newPassword)
    const hasUpper = /[A-Z]/.test(newPassword)

    if (newPassword.length >= 8 && hasNumbers && hasSymbols && hasUpper) {
      return { label: 'Strong', color: 'text-emerald-500 bg-emerald-500/10' }
    }
    return { label: 'Medium', color: 'text-amber-500 bg-amber-500/10' }
  }

  const strength = getPasswordStrength()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update password: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setExporting(true)
      const res = await fetch('/api/profiles/export-data', { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Export failed')
      }

      const json = await res.json()

      // Trigger browser download
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trinetra-data-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Your data has been downloaded.')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.')
      return
    }

    try {
      setDeleting(true)
      const res = await fetch('/api/profiles/delete-account', { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Deletion failed')
      }

      toast.success('Account permanently deleted. Goodbye!')

      // Sign out and redirect to login
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Section 1: Change Password */}
        <form onSubmit={handleUpdatePassword} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
            <KeyRound className="w-5 h-5 text-[var(--muted)]" />
            <h3 className="font-bold font-montserrat text-sm text-[var(--heading)] uppercase tracking-wider">Change Password</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] placeholder-[var(--muted)] text-xs font-semibold font-mono rounded-xl p-3 pr-10 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
                  New Password
                </label>
                {strength.label && (
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md ${strength.color}`}>
                    {strength.label}
                  </span>
                )}
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] placeholder-[var(--muted)] text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] placeholder-[var(--muted)] text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 py-3 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        {/* Section 2: Two-Factor Authentication */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[var(--muted)]" />
              <h3 className="font-bold font-montserrat text-sm text-[var(--heading)] uppercase tracking-wider">Two-Factor Authentication</h3>
            </div>
            <span className="px-2 py-0.5 text-[8px] font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md">
              Coming Soon
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--body)] font-montserrat">
                Require a security code when logging in
              </p>
              <p className="text-[10px] text-[var(--muted)] font-merriweather leading-relaxed">
                Add an extra layer of protection to your account. Two-factor authentication (2FA) is currently in development and will be available in an upcoming security update.
              </p>
            </div>
            
            {/* Mock disabled toggle */}
            <div className="relative inline-flex items-center cursor-not-allowed opacity-30 shrink-0">
              <div className="w-9 h-5 bg-[var(--background)] border border-[var(--border)] rounded-full" />
              <div className="absolute left-0.5 top-0.5 bg-[var(--muted)] w-4 h-4 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Danger Zone */}
      <div className="border border-rose-500/30 rounded-2xl overflow-hidden">
        {/* Red header bar */}
        <div className="bg-rose-500/8 border-b border-rose-500/20 px-6 py-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <h3 className="font-bold font-montserrat text-sm text-rose-500 uppercase tracking-wider">Danger Zone</h3>
        </div>

        <div className="bg-[var(--card-bg)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Data */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 space-y-3 shadow-inner">
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--heading)]">Download My Data</p>
              <p className="text-xs text-[var(--body)] leading-relaxed">
                Export a full copy of your account data including agents, call logs, and consent records. Compliant with DPDP Act 2023.
              </p>
            </div>
            <button
              type="button"
              id="export-data-btn"
              onClick={handleExportData}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--heading)] text-xs font-bold border border-[var(--border)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exporting ? 'Preparing export...' : 'Download My Data'}
            </button>
          </div>

          {/* Delete Account */}
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-3 shadow-inner">
            <div className="space-y-1">
              <p className="text-sm font-bold text-rose-500">Delete Account</p>
              <p className="text-xs text-[var(--body)] leading-relaxed">
                Permanently delete your account and all associated data. This action is irreversible and cannot be undone.
              </p>
            </div>
            <button
              type="button"
              id="delete-account-btn"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete My Account
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-[var(--heading)]">Permanently Delete Account</h3>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[var(--body)] leading-relaxed">
                This will <strong className="text-rose-500">permanently delete</strong> your account, all your agents, call logs, integrations, and consent records.
                This action <strong className="text-[var(--heading)]">cannot be undone</strong>.
              </p>
              <p className="text-xs text-[var(--muted)] mt-3">
                To confirm, type <span className="font-mono font-bold text-rose-500">DELETE</span> below:
              </p>
              <input
                type="text"
                id="delete-confirm-input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all shadow-inner"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--body)] hover:text-[var(--heading)] bg-[var(--background)] border border-[var(--border)] transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-btn"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
