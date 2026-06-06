'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useDashboardStore } from '@/store/dashboardStore'
import { toast } from 'sonner'
import { 
  Camera, 
  Loader2, 
  Save, 
  User, 
  Mail, 
  Briefcase, 
  Tag, 
  Phone, 
  MapPin, 
  Globe, 
  Clock, 
  Languages
} from 'lucide-react'
import TelegramConnectionCard from '@/src/components/dashboard/TelegramConnectionCard'

const INDUSTRIES = [
  'Clinic / Hospital',
  'Real Estate',
  'Education',
  'E-commerce',
  'Restaurant',
  'Law Firm',
  'Other'
]

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfileState] = useState({
    id: '',
    full_name: '',
    email: '',
    company_name: '',
    business_type: '',
    avatar_url: '',
    phone: '',
    city: '',
    state: '',
    preferred_language: 'en',
    timezone: 'Asia/Kolkata',
    telegram_chat_id: ''
  })

  const supabase = createClient()
  const { setProfile, profile: storeProfile } = useDashboardStore()
  
  const showToast = (msg: string) => toast.success(msg)

  useEffect(() => {
    async function loadProfile() {
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
          .select('full_name, email, company_name, business_type, avatar_url, phone, city, state, preferred_language, timezone, telegram_chat_id')
          .eq('id', user.id)
          .single()

        if (profileError) {
          const fallback = {
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
            email: user.email || '',
            company_name: '',
            business_type: '',
            avatar_url: '',
            phone: '',
            city: '',
            state: '',
            preferred_language: 'en',
            timezone: 'Asia/Kolkata',
            telegram_chat_id: ''
          }
          setProfileState(fallback)
          setProfile(fallback as any)
        } else {
          const loaded = {
            id: user.id,
            full_name: dbProfile.full_name || user.user_metadata?.full_name || '',
            email: dbProfile.email || user.email || '',
            company_name: dbProfile.company_name || '',
            business_type: dbProfile.business_type || '',
            avatar_url: dbProfile.avatar_url || '',
            phone: dbProfile.phone || '',
            city: dbProfile.city || '',
            state: dbProfile.state || '',
            preferred_language: dbProfile.preferred_language || 'en',
            timezone: dbProfile.timezone || 'Asia/Kolkata',
            telegram_chat_id: dbProfile.telegram_chat_id || ''
          }
          setProfileState(loaded)
          setProfile(loaded as any)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        toast.error('Failed to load profile details.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, setProfile])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
      setUploading(true);

      // 1. Delete the old avatar from the public_uploads bucket if it exists
      if (profile.avatar_url) {
        // Extract the exact file path from the public URL string by splitting at /public/public_uploads/
        const oldFilePath = profile.avatar_url.split('/public/public_uploads/')[1];
        if (oldFilePath) {
          await supabase.storage.from("public_uploads").remove([oldFilePath]);
        }
      }

      // 2. Upload the new avatar prepended with folder
      const fileExt = file.name.split(".").pop();
      const fullPath = `avatars/${profile.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("public_uploads")
        .upload(fullPath, file);

      if (uploadError) throw uploadError;

      // 3. Get the new public URL and update state
      const { data: { publicUrl } } = supabase.storage
        .from("public_uploads")
        .getPublicUrl(fullPath);

      setProfileState((prev) => ({ ...prev, avatar_url: publicUrl }));
      
      // Auto-save the new URL directly to the database
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      
      showToast("Profile picture updated successfully!");
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          email: profile.email,
          company_name: profile.company_name,
          business_type: profile.business_type,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          city: profile.city,
          state: profile.state,
          preferred_language: profile.preferred_language,
          timezone: profile.timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      setProfile({ ...profile, id: userId } as any)
      toast.success('Profile updated successfully!')
    } catch (err: any) {
      console.error('Save profile error:', err)
      toast.error(err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        <p className="text-violet-300/60 mt-4 text-sm font-medium animate-pulse">Loading profile...</p>
      </div>
    )
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Profile Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 font-display">
          ⚙️ Profile Settings
        </h1>
        <p className="text-violet-300/60 text-sm mt-1">Manage your identity, company, and regional details</p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-8 relative">
        
        {/* Section 1: Personal Identity */}
        <div className="space-y-6 pb-8 mb-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Personal Identity</h2>
              <p className="text-xs text-white/40">Manage your avatar and primary contact details</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/10 bg-[#0C0118]/80 flex items-center justify-center text-white text-4xl font-bold transition-all duration-300 group-hover:border-violet-500/50 shadow-2xl">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="Profile Avatar"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  initials
                )}
              </div>
              
              {/* Dark Trigger Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5">
                <Camera className="w-5 h-5 text-white" />
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change Photo</span>
              </div>

              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-violet-400" /> Full Name
              </label>
              <input
                type="text"
                required
                value={profile.full_name}
                onChange={e => setProfileState(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="e.g. Raghav Thakur"
                suppressHydrationWarning
                className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white placeholder-white/20 text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-200"
              />
            </div>

            {/* Notification Email field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-violet-400" /> Notification Email
              </label>
              <input
                type="email"
                required
                value={profile.email}
                onChange={e => setProfileState(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. raghav00424@gmail.com"
                suppressHydrationWarning
                className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white placeholder-white/20 text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-200"
              />
            </div>

            {/* Phone Number field */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-violet-400" /> Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => setProfileState(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. +91 98765 43210"
                suppressHydrationWarning
                className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white placeholder-white/20 text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Corporate Details */}
        <div className="space-y-6 pb-8 mb-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Corporate Details</h2>
              <p className="text-xs text-white/40">Provide business and industry information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-violet-400" /> Company Name
              </label>
              <input
                type="text"
                required
                value={profile.company_name}
                onChange={e => setProfileState(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="e.g. Acme Corp"
                suppressHydrationWarning
                className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white placeholder-white/20 text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-200"
              />
            </div>

            {/* Operational Industry dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-violet-400" /> Industry
              </label>
              <div className="relative">
                <select
                  required
                  value={profile.business_type}
                  onChange={e => setProfileState(prev => ({ ...prev, business_type: e.target.value }))}
                  suppressHydrationWarning
                  className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 appearance-none transition-all duration-200"
                >
                  <option value="" disabled className="bg-[#10021E]">Select Industry</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind} className="bg-[#10021E] text-white">
                      {ind}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-violet-300/60">
                  ▼
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Localization & Region */}
        <div className="space-y-6 pb-8 mb-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Localization & Region</h2>
              <p className="text-xs text-white/40">Adjust geographical preference, timezone and language</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* City field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-violet-400" /> City
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={e => setProfileState(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g. Mumbai"
                suppressHydrationWarning
                className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white placeholder-white/20 text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-200"
              />
            </div>

            {/* State field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-violet-400" /> State
              </label>
              <input
                type="text"
                value={profile.state}
                onChange={e => setProfileState(prev => ({ ...prev, state: e.target.value }))}
                placeholder="e.g. Maharashtra"
                suppressHydrationWarning
                className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white placeholder-white/20 text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-200"
              />
            </div>

            {/* Timezone dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-violet-400" /> Timezone
              </label>
              <div className="relative">
                <select
                  required
                  value={profile.timezone}
                  onChange={e => setProfileState(prev => ({ ...prev, timezone: e.target.value }))}
                  suppressHydrationWarning
                  className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 appearance-none transition-all duration-200"
                >
                  <option value="Asia/Kolkata" className="bg-[#10021E]">Asia/Kolkata (IST)</option>
                  <option value="UTC" className="bg-[#10021E]">UTC</option>
                  <option value="America/New_York" className="bg-[#10021E]">America/New_York (EST)</option>
                  <option value="America/Los_Angeles" className="bg-[#10021E]">America/Los_Angeles (PST)</option>
                  <option value="Europe/London" className="bg-[#10021E]">Europe/London (GMT/BST)</option>
                  <option value="Asia/Singapore" className="bg-[#10021E]">Asia/Singapore (SGT)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-violet-300/60">
                  ▼
                </div>
              </div>
            </div>

            {/* Preferred Language dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-violet-300/80 uppercase tracking-wider flex items-center gap-2">
                <Languages className="w-3.5 h-3.5 text-violet-400" /> Preferred Language
              </label>
              <div className="relative">
                <select
                  required
                  value={profile.preferred_language}
                  onChange={e => setProfileState(prev => ({ ...prev, preferred_language: e.target.value }))}
                  suppressHydrationWarning
                  className="w-full px-4 py-3 bg-[#12101A] border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 appearance-none transition-all duration-200"
                >
                  <option value="en" className="bg-[#10021E]">English (en)</option>
                  <option value="hi" className="bg-[#10021E]">Hindi (hi)</option>
                  <option value="es" className="bg-[#10021E]">Spanish (es)</option>
                  <option value="fr" className="bg-[#10021E]">French (fr)</option>
                  <option value="de" className="bg-[#10021E]">German (de)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-violet-300/60">
                  ▼
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Telegram Notification Alerts Config */}
        <TelegramConnectionCard />

        {/* Actions Footer */}
        <div className="pt-6 border-t border-white/5 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] cursor-pointer text-sm tracking-wide"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

    </div>
  )
}
