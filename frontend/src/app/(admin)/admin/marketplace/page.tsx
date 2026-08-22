'use client'

import { useState, useEffect } from 'react'
import { 
  Store, 
  Sparkles, 
  ArrowLeft, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Globe, 
  Bot, 
  MessageSquare, 
  ShieldAlert,
  Loader2,
  Video
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface PlatformService {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  icon_url: string | null
  subdomain_url: string | null
  is_active: boolean
  is_visible_in_marketplace: boolean
  is_demo_allowed: boolean
  monthly_reset_enabled: boolean
  marketplace_metadata: {
    tagline?: string
    price?: string
    features?: string[]
    video_url?: string
  } | null
}

export default function AdminMarketplacePage() {
  const [services, setServices] = useState<PlatformService[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<PlatformService | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('voice')
  const [iconUrl, setIconUrl] = useState('')
  const [subdomainUrl, setSubdomainUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isVisibleInMarketplace, setIsVisibleInMarketplace] = useState(true)
  const [isDemoAllowed, setIsDemoAllowed] = useState(true)
  const [monthlyResetEnabled, setMonthlyResetEnabled] = useState(true)
  
  // Metadata fields
  const [tagline, setTagline] = useState('')
  const [price, setPrice] = useState('')
  const [featuresInput, setFeaturesInput] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  const [saving, setSaving] = useState(false)

  const fetchServices = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketplace')
      if (!res.ok) throw new Error('Failed to fetch platform services')
      const data = await res.json()
      setServices(data.services || [])
    } catch (err: any) {
      toast.error(err.message || 'Error loading services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const openAddModal = () => {
    setEditingService(null)
    setName('')
    setSlug('')
    setDescription('')
    setType('voice')
    setIconUrl('')
    setSubdomainUrl('')
    setIsActive(true)
    setIsVisibleInMarketplace(true)
    setIsDemoAllowed(true)
    setMonthlyResetEnabled(true)
    setTagline('')
    setPrice('')
    setFeaturesInput('')
    setVideoUrl('')
    setIsModalOpen(true)
  }

  const openEditModal = (service: PlatformService) => {
    setEditingService(service)
    setName(service.name || '')
    setSlug(service.slug || '')
    setDescription(service.description || '')
    setType(service.type || 'voice')
    setIconUrl(service.icon_url || '')
    setSubdomainUrl(service.subdomain_url || '')
    setIsActive(service.is_active)
    setIsVisibleInMarketplace(service.is_visible_in_marketplace)
    setIsDemoAllowed(service.is_demo_allowed)
    setMonthlyResetEnabled(service.monthly_reset_enabled)
    setTagline(service.marketplace_metadata?.tagline || '')
    setPrice(service.marketplace_metadata?.price || '')
    setFeaturesInput(service.marketplace_metadata?.features?.join(', ') || '')
    setVideoUrl(service.marketplace_metadata?.video_url || '')
    setIsModalOpen(true)
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (!editingService) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug || !type) {
      toast.error('Name, Slug and Type are required')
      return
    }

    setSaving(true)
    const features = featuresInput
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)

    const payload = {
      name,
      slug,
      description,
      type,
      icon_url: iconUrl || null,
      subdomain_url: subdomainUrl || null,
      is_active: isActive,
      is_visible_in_marketplace: isVisibleInMarketplace,
      is_demo_allowed: isDemoAllowed,
      monthly_reset_enabled: monthlyResetEnabled,
      marketplace_metadata: {
        tagline,
        price,
        features,
        video_url: videoUrl
      }
    }

    try {
      let res
      if (editingService) {
        res = await fetch('/api/admin/marketplace', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingService.id, ...payload })
        })
      } else {
        res = await fetch('/api/admin/marketplace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save service')

      toast.success(editingService ? 'Service updated successfully!' : 'Service created successfully!')
      setIsModalOpen(false)
      fetchServices()
    } catch (err: any) {
      toast.error(err.message || 'Error saving service')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service? All linked client configurations might be affected.')) return

    try {
      const res = await fetch(`/api/admin/marketplace?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete service')

      toast.success('Service deleted successfully')
      fetchServices()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting service')
    }
  }

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 font-display">
            <Store className="w-8 h-8 text-violet-500" /> Marketplace Console
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Publish platform templates, configure trial packages, adjust prices, and toggle visibility.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-violet-600/10"
          >
            <Plus className="w-4 h-4" /> Add Platform Service
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, type, description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-zinc-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" /> Fetching platform services...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-zinc-950/40 border border-dashed border-white/5 rounded-3xl p-16 text-center text-zinc-500 text-xs flex flex-col items-center justify-center min-h-[300px]">
          <Store className="w-10 h-10 text-zinc-700 mb-2" />
          No platform services found. Add a service to show it in the marketplace.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => (
            <div 
              key={service.id} 
              className={`bg-[#0f111a]/60 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-white/10 ${
                service.is_active ? 'border-white/5' : 'border-zinc-800/80 opacity-70'
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-zinc-400 font-bold shrink-0">
                    {service.type === 'voice' ? <Bot className="w-4 h-4 text-violet-400" /> : <Globe className="w-4 h-4 text-sky-400" />}
                  </div>
                  <div className="flex gap-1">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      service.is_active 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {service.is_visible_in_marketplace && (
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        Live
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mt-3 truncate">{service.name}</h3>
                <span className="text-[10px] font-mono text-zinc-500 block mb-2">{service.slug}</span>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                  {service.description || 'No description provided.'}
                </p>

                {service.marketplace_metadata?.tagline && (
                  <div className="text-[10px] italic text-zinc-400 bg-black/30 border border-white/5 p-2 rounded-lg mb-3">
                    &ldquo;{service.marketplace_metadata.tagline}&rdquo;
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-black/20 p-2.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-zinc-500 block">Type</span>
                    <span className="font-semibold text-white capitalize">{service.type}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Price</span>
                    <span className="font-semibold text-white">{service.marketplace_metadata?.price || 'Free'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                <button
                  onClick={() => openEditModal(service)}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/10 border border-rose-500/10 text-rose-400 hover:bg-rose-600/20 font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Slide-Over Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f111a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-violet-400" />
                {editingService ? 'Edit Platform Service' : 'Add Platform Service'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none"
                    placeholder="e.g. MSME Navigator"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Slug</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none font-mono"
                    placeholder="e.g. msme-navigator"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-white focus:border-violet-500 outline-none"
                  placeholder="Enter detailed description of the platform service..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none cursor-pointer"
                  >
                    <option value="voice">Voice Agent</option>
                    <option value="chat">Chat Agent</option>
                    <option value="heavy_tool">Heavy Tool / Scheme Navigator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Icon URL / Preset</label>
                  <input
                    type="text"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none"
                    placeholder="/presets/custom.svg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Subdomain URL (if heavy_tool)</label>
                  <input
                    type="text"
                    value={subdomainUrl}
                    onChange={(e) => setSubdomainUrl(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none"
                    placeholder="https://msme.trinetraedu-ai.com"
                  />
                </div>
              </div>

              {/* Switches Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-black/40 border border-white/5 rounded-xl text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded accent-violet-500"
                  />
                  Active Status
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={isVisibleInMarketplace}
                    onChange={(e) => setIsVisibleInMarketplace(e.target.checked)}
                    className="rounded accent-violet-500"
                  />
                  Show in Marketplace
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={isDemoAllowed}
                    onChange={(e) => setIsDemoAllowed(e.target.checked)}
                    className="rounded accent-violet-500"
                  />
                  Allow Free Demo
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={monthlyResetEnabled}
                    onChange={(e) => setMonthlyResetEnabled(e.target.checked)}
                    className="rounded accent-violet-500"
                  />
                  Monthly Quota Reset
                </label>
              </div>

              {/* Marketplace Metadata section */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">Marketplace Metadata</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Tagline / Short description</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none"
                      placeholder="e.g. Direct voice schemes and filing support"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Price Label</label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none"
                      placeholder="e.g. ₹99 Trial / ₹999 Month"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block flex items-center gap-1">
                      <Video className="w-3 h-3 text-zinc-400" /> Demo Video URL
                    </label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none"
                      placeholder="e.g. https://www.youtube.com/embed/dQw4w9WgXcQ"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Features List (Comma-separated)</label>
                    <input
                      type="text"
                      value={featuresInput}
                      onChange={(e) => setFeaturesInput(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none"
                      placeholder="e.g. Live transcription, 24/7 Availability, Dedicated number"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-violet-600/10 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingService ? 'Save Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
