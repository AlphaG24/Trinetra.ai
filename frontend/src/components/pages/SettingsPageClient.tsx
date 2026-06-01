'use client'

import { useState } from 'react'
import { User, Bot, Puzzle, Bell, Loader2, Save, Camera } from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'agents', label: 'Agent Settings', icon: Bot },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const BUSINESS_TYPES = ['Clinic / Hospital', 'Real Estate', 'Education', 'E-commerce', 'Restaurant', 'Law Firm', 'Other']
const LANGUAGES = ['English', 'Hindi', 'Hinglish']

function ProfileTab({ user, profile }: { user: any; profile: any }) {
  const [form, setForm] = useState({
    full_name: user?.user_metadata?.full_name || profile?.full_name || '',
    phone: profile?.phone || '',
    company_name: profile?.company_name || '',
    business_type: profile?.business_type || '',
    city: profile?.city || '',
    state: profile?.state || '',
    language: profile?.language || 'English',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const initials = form.full_name ? form.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold select-none">
            {initials}
          </div>
          <button className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </button>
        </div>
        <div>
          <p className="text-white font-semibold">{form.full_name || 'Your Name'}</p>
          <p className="text-white/50 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          { key: 'full_name', label: 'Full Name', placeholder: 'Rahul Sharma' },
          { key: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210' },
          { key: 'company_name', label: 'Company Name', placeholder: 'Acme Pvt. Ltd.' },
          { key: 'city', label: 'City', placeholder: 'Mumbai' },
          { key: 'state', label: 'State', placeholder: 'Maharashtra' },
        ].map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">{f.label}</label>
            <input
              type="text"
              value={(form as any)[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              suppressHydrationWarning
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        ))}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Business Type</label>
          <select
            value={form.business_type}
            onChange={e => setForm(prev => ({ ...prev, business_type: e.target.value }))}
            suppressHydrationWarning
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none"
          >
            <option value="">Select type</option>
            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Preferred Language</label>
          <select
            value={form.language}
            onChange={e => setForm(prev => ({ ...prev, language: e.target.value }))}
            suppressHydrationWarning
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none"
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Timezone</label>
          <input
            type="text"
            value="Asia/Kolkata (IST)"
            readOnly
            suppressHydrationWarning
            className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white/40 text-sm cursor-not-allowed"
          />
          <p className="text-xs text-white/30">Locked to Indian Standard Time</p>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Profile
      </button>
    </div>
  )
}

function AgentsTab({ agents }: { agents: any[] }) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <Bot className="w-10 h-10 text-white/20 mb-3" />
        <p className="text-white/50">No agents configured yet.</p>
        <p className="text-white/30 text-sm mt-1">Contact support to set up your AI agents.</p>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {agents.map(agent => (
        <div key={agent.id} className="border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">{agent.name}</h3>
              <span className="text-xs text-white/40 uppercase tracking-wider">{agent.agent_type} agent</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
              agent.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {agent.status || 'inactive'}
            </span>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">System Prompt</label>
            <textarea
              defaultValue={agent.system_prompt || ''}
              rows={5}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white/80 text-sm font-mono focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
              placeholder="You are a helpful AI agent for..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Escalation Email</label>
            <input
              type="email"
              defaultValue={agent.escalation_email || ''}
              placeholder="support@yourcompany.com"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors text-sm">
            <Save className="w-4 h-4" /> Save Agent Settings
          </button>
        </div>
      ))}
    </div>
  )
}

function IntegrationsTab() {
  const integrations = [
    {
      name: 'Google Calendar',
      description: 'Auto-book appointments directly in your calendar',
      icon: '📅',
      status: 'not_connected',
    },
    {
      name: 'WhatsApp Business',
      description: 'Send automated follow-ups and confirmations',
      icon: '📱',
      status: 'not_connected',
    },
    {
      name: 'Razorpay',
      description: 'Payment processing for your subscription',
      icon: '💳',
      status: 'connected',
    },
  ]
  return (
    <div className="space-y-4">
      {integrations.map((intg, i) => (
        <div key={i} className="flex items-center justify-between p-5 bg-black/20 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{intg.icon}</span>
            <div>
              <h3 className="text-white font-semibold">{intg.name}</h3>
              <p className="text-sm text-white/50">{intg.description}</p>
            </div>
          </div>
          {intg.status === 'connected' ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full">Connected</span>
              <button className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Disconnect</button>
            </div>
          ) : (
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm transition-colors">
              Connect
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function NotificationsTab() {
  const notifications = [
    { key: 'new_appointment', label: 'New Appointment', desc: 'When your AI books a new appointment' },
    { key: 'new_lead', label: 'New Lead Captured', desc: 'When a high-scoring lead is detected' },
    { key: 'usage_alert', label: 'Usage Alerts', desc: 'When you hit 80% of your plan limits' },
    { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Weekly performance digest every Monday' },
    { key: 'payment_receipt', label: 'Payment Receipts', desc: 'Invoice and payment confirmation emails' },
  ]
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifications.map(n => [n.key, true]))
  )
  return (
    <div className="space-y-4">
      {notifications.map(n => (
        <div key={n.key} className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-xl">
          <div>
            <p className="text-white font-medium text-sm">{n.label}</p>
            <p className="text-white/40 text-xs mt-0.5">{n.desc}</p>
          </div>
          <button
            onClick={() => setPrefs(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${prefs[n.key] ? 'bg-amber-500' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[n.key] ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      ))}
      <button className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors text-sm mt-4">
        <Save className="w-4 h-4" /> Save Preferences
      </button>
    </div>
  )
}

export function SettingsPageClient({ user, profile, agents }: { user: any; profile: any; agents: any[] }) {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          ⚙️ Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">Manage your profile, agents, and preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6">
        {activeTab === 'profile' && <ProfileTab user={user} profile={profile} />}
        {activeTab === 'agents' && <AgentsTab agents={agents} />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  )
}
