'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Building, Globe, Languages, Clock, ShieldCheck, Sun, Moon, Loader2, Camera } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useTheme } from '@/src/components/ui/theme-provider'
import toast from 'react-hot-toast'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ProfileTab() {
  const { theme: globalTheme, toggleTheme: globalToggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    industry: 'Other',
    country: 'Other',
    language: 'English',
    timezone: 'Asia/Kolkata',
    theme: 'dark',
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const res = await fetch('/api/profiles')
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        const prof = data.profile

        setProfile((prev) => ({
          ...prev,
          fullName: prof?.full_name || '',
          email: user.email || '',
          companyName: prof?.company_name || '',
          industry: prof?.business_type || 'Other',
          country: prof?.country || 'Other',
          theme: prof?.theme || globalTheme,
        }))

        if (prof?.avatar_url) {
          setAvatarUrl(prof.avatar_url)
        }
      } catch (err) {
        console.error('Error loading settings profile:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
    setMounted(true)
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please select a JPG, PNG, or WebP image.')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 2MB.')
      return
    }

    try {
      setUploading(true)

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Session expired. Please log in again.')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/settings/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!uploadRes.ok) {
        const errData = await uploadRes.json()
        throw new Error(errData.error || 'Upload failed')
      }

      const { publicUrl } = await uploadRes.json()

      // Save avatar_url to profile via PATCH
      const patchRes = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })

      if (!patchRes.ok) {
        throw new Error('Failed to save avatar URL to profile')
      }

      setAvatarUrl(publicUrl)
      toast.success('Profile photo updated!')
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      toast.error(err.message || 'Failed to upload avatar.')
    } finally {
      setUploading(false)
      // Reset file input so re-selecting same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: profile.fullName,
          company_name: profile.companyName,
          business_type: profile.industry,
          country: profile.country,
          theme: globalTheme,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const resData = await res.json()
      if (resData.profile) {
        const prof = resData.profile
        setProfile((prev) => ({
          ...prev,
          fullName: prof.full_name || '',
          companyName: prof.company_name || '',
          industry: prof.business_type || 'Other',
          country: prof.country || 'Other',
          theme: prof.theme || globalTheme,
        }))
      }

      toast.success('Profile settings saved successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to save settings: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  // Use the global theme toggle so the entire page (navbar, sidebar, footer) updates immediately
  const toggleTheme = () => {
    globalToggleTheme()
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-64 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-4 pb-4 border-b border-[var(--border)]">
            {/* Avatar with upload overlay */}
            <div className="relative group shrink-0">
              <div className="w-14 h-14 rounded-full bg-[var(--primary-bg)] border border-[var(--border)] flex items-center justify-center text-xl font-bold font-display text-[var(--heading)] overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile.fullName)
                )}
              </div>
              {/* Upload overlay on hover */}
              {!uploading && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  title="Change photo"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold font-montserrat text-sm text-[var(--heading)]">Profile Avatar</h3>
              <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">JPG, PNG, or WebP. Max size 2MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--hover-bg)] text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold font-display text-[var(--heading)] uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                placeholder="Enter your full name"
                className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] placeholder-[var(--muted)] text-xs font-semibold font-merriweather rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-display text-[var(--heading)] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full bg-[var(--hover-bg)]/20 border border-[var(--border)] text-[var(--muted)] text-xs font-semibold font-merriweather rounded-xl p-3 cursor-not-allowed shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-display text-[var(--heading)] uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] placeholder-[var(--muted)] text-xs font-semibold font-merriweather rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
            <Building className="w-5 h-5 text-[var(--muted)]" />
            <h3 className="font-bold font-montserrat text-sm text-[var(--heading)] uppercase tracking-wider">Company Information</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider mb-2">
                Company Name
              </label>
              <input
                type="text"
                required
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                placeholder="Enter your organization name"
                className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] placeholder-[var(--muted)] text-xs font-semibold font-merriweather rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider mb-2">
                  Industry
                </label>
                <select
                  value={profile.industry}
                  onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs font-semibold font-montserrat rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all cursor-pointer"
                >
                  <option value="Real Estate">Real Estate</option>
                  <option value="EdTech">EdTech</option>
                  <option value="BFSI">BFSI</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider mb-2">
                  Country/Region
                </label>
                <select
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs font-semibold font-montserrat rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all cursor-pointer"
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="UAE">UAE</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider mb-2">
                  Language Preference
                </label>
                <select
                  value={profile.language}
                  onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs font-semibold font-montserrat rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Hinglish">Hinglish</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider mb-2">
                  Timezone
                </label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs font-semibold font-montserrat rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all cursor-pointer"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Theme Toggle & Submit Button */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div>
            <h4 className="font-bold font-montserrat text-sm text-[var(--heading)]">Theme Preference</h4>
            <p className="text-[10px] text-[var(--muted)] font-merriweather mt-0.5">Toggle between dark violet and clean white modes</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--heading)] transition-all cursor-pointer"
          >
            {globalTheme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold font-montserrat">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold font-montserrat">Dark Mode</span>
              </>
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
