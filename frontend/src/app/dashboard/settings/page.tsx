'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { 
  Lock, Shield, Eye, EyeOff, AlertTriangle, 
  LogOut, Trash2, RefreshCw, Bell, Mail, Loader2
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // App & Profile States
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [emailAlerts, setEmailAlerts] = useState(false)
  const [weeklyReports, setWeeklyReports] = useState(false)

  // Password Management States
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Danger Zone States
  const [signingOutAll, setSigningOutAll] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Load Preferences on Mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoading(true)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        const { data: dbProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, notification_preferences')
          .eq('id', user.id)
          .single()

        if (!profileError && dbProfile) {
          setProfile(dbProfile)
          const prefs = dbProfile.notification_preferences || {}
          setEmailAlerts(prefs.email_alerts ?? false)
          setWeeklyReports(prefs.weekly_reports ?? false)
        } else {
          // Fallback if profile doesn't exist yet or has error
          const fallbackProfile = { id: user.id, notification_preferences: { email_alerts: false, weekly_reports: false } }
          setProfile(fallbackProfile)
          setEmailAlerts(false)
          setWeeklyReports(false)
        }
      } catch (err) {
        console.error('Error loading settings:', err)
        toast.error('Failed to load settings preferences.')
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [router, supabase])

  // Toggle Email Alerts
  const toggleEmailAlerts = async () => {
    if (!userId || !profile) return
    const newVal = !emailAlerts
    setEmailAlerts(newVal)

    try {
      const updatedPrefs = {
        ...(profile.notification_preferences || {}),
        email_alerts: newVal
      }

      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: updatedPrefs })
        .eq('id', userId)

      if (error) throw error

      setProfile((prev: any) => ({ ...prev, notification_preferences: updatedPrefs }))
      toast.success(`Instant Lead Alerts ${newVal ? 'enabled' : 'disabled'}.`)
    } catch (err: any) {
      console.error('Email alerts toggle error:', err)
      toast.error('Failed to save preference.')
      setEmailAlerts(!newVal) // rollback
    }
  }

  // Toggle Weekly Reports
  const toggleWeeklyReports = async () => {
    if (!userId || !profile) return
    const newVal = !weeklyReports
    setWeeklyReports(newVal)

    try {
      const updatedPrefs = {
        ...(profile.notification_preferences || {}),
        weekly_reports: newVal
      }

      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: updatedPrefs })
        .eq('id', userId)

      if (error) throw error

      setProfile((prev: any) => ({ ...prev, notification_preferences: updatedPrefs }))
      toast.success(`Weekly Summary Reports ${newVal ? 'enabled' : 'disabled'}.`)
    } catch (err: any) {
      console.error('Weekly reports toggle error:', err)
      toast.error('Failed to save preference.')
      setWeeklyReports(!newVal) // rollback
    }
  }

  // Password Update Logic
  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    try {
      setSavingPassword(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Credentials updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Password update error:', err)
      toast.error(err.message || 'Failed to update credentials.')
    } finally {
      setSavingPassword(false)
    }
  }

  // Sign out all devices logic
  const handleSignOutAllDevices = async () => {
    if (!confirm('Are you sure you want to sign out of all device sessions? This will force-log out your current session as well.')) return
    
    try {
      setSigningOutAll(true)
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) throw error

      toast.success('Successfully signed out of all devices.')
      router.push('/login')
    } catch (err: any) {
      console.error('Global signout error:', err)
      toast.error(err.message || 'Error logging out from all devices.')
    } finally {
      setSigningOutAll(false)
    }
  }

  // Delete workspace/account logic
  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: This action is irreversible. All of your AI agents, webhook configurations, and leads will be permanently deleted. Are you sure you want to delete your workspace?')) {
      return
    }

    const confirmation = prompt('To confirm workspace deletion, please type "DELETE MY ACCOUNT" in the box below:')
    if (confirmation !== 'DELETE MY ACCOUNT') {
      if (confirmation !== null) {
        toast.error('Confirmation string does not match.')
      }
      return
    }

    try {
      setDeletingAccount(true)
      const { error } = await supabase.rpc('delete_user')
      if (error) throw error

      await supabase.auth.signOut()
      toast.success('Your workspace has been deleted successfully.')
      router.push('/login')
    } catch (err: any) {
      console.error('Delete account error:', err)
      toast.error(err.message || 'Failed to delete workspace. Please contact support.')
    } finally {
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        <p className="text-violet-300/60 mt-4 text-sm font-medium animate-pulse">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 py-8">
      
      {/* Header */}
      <div className="space-y-2 text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 font-display">
          ⚙️ Advanced Settings
        </h1>
        <p className="text-violet-300/60 text-sm">
          Configure your notification preferences, credentials, and administrative workspace options.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* Row 1: Instant Lead Alerts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="space-y-1 text-left max-w-xl">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Bell className="w-4 h-4 text-violet-400" />
              <span>Instant Lead Alerts</span>
            </div>
            <p className="text-xs text-zinc-400">
              Receive an immediate email notification when the AI captures a new lead or books an appointment.
            </p>
          </div>
          <div className="shrink-0 flex items-center">
            <button
              onClick={toggleEmailAlerts}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-amber-500/50 ${
                emailAlerts ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  emailAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Row 2: Weekly Summary Reports */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="space-y-1 text-left max-w-xl">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Mail className="w-4 h-4 text-violet-400" />
              <span>Weekly Summary Reports</span>
            </div>
            <p className="text-xs text-zinc-400">
              Receive a weekly email breakdown of your agent's total call volume and average duration.
            </p>
          </div>
          <div className="shrink-0 flex items-center">
            <button
              onClick={toggleWeeklyReports}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-amber-500/50 ${
                weeklyReports ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  weeklyReports ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Row 3: Update Password */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-1 text-left max-w-xl">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-violet-400" />
              <span>Update Password</span>
            </div>
            <p className="text-xs text-zinc-400">
              Change the password associated with your account credentials.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end w-full lg:max-w-lg shrink-0">
            <div className="relative w-full">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full px-4 py-2 bg-[#12101A] border border-white/10 rounded-xl text-white placeholder-white/20 text-xs focus:ring-2 focus:ring-amber-500/50 outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            <div className="relative w-full">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full px-4 py-2 bg-[#12101A] border border-white/10 rounded-xl text-white placeholder-white/20 text-xs focus:ring-2 focus:ring-amber-500/50 outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            <button
              onClick={handleUpdatePassword}
              disabled={savingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold text-xs rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              {savingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>

        {/* Row 4: Danger Zone */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-red-500/[0.02] border border-red-500/10 p-6 rounded-2xl mt-6">
          <div className="space-y-1.5 text-left max-w-xl">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>Danger Zone</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              These actions are extremely sensitive. Revoking all sessions will force log out everywhere. Deleting your workspace will permanently wipe all agents and credentials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleSignOutAllDevices}
              disabled={signingOutAll}
              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-rose-400 hover:text-rose-300 text-xs font-bold rounded-xl transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            >
              {signingOutAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              <span>Sign Out All Devices</span>
            </button>

            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            >
              {deletingAccount ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Delete Workspace</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}
