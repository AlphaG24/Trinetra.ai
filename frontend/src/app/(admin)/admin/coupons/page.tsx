'use client'

import { useState, useEffect } from 'react'
import {
  TicketPercent,
  Plus,
  Search,
  Check,
  X,
  Edit3,
  Trash2,
  Tag,
  Calendar,
  AlertCircle,
  HelpCircle,
  Layers,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

interface Coupon {
  id: string
  code: string
  title: string
  description?: string
  discount_type: 'percentage' | 'flat'
  discount_value: number
  max_discount_inr?: number | null
  min_order_inr: number
  is_public_offer: boolean
  is_active: boolean
  first_purchase_only: boolean
  max_uses?: number | null
  used_count: number
  max_uses_per_user: number
  valid_from?: string
  expires_at?: string | null
  created_at?: string
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'active'>('all')

  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form Fields
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [maxDiscountInr, setMaxDiscountInr] = useState('')
  const [minOrderInr, setMinOrderInr] = useState('0')
  const [isPublicOffer, setIsPublicOffer] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(false)
  const [maxUses, setMaxUses] = useState('')
  const [maxUsesPerUser, setMaxUsesPerUser] = useState('1')
  const [expiresAt, setExpiresAt] = useState('')

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/coupons')
      if (!res.ok) throw new Error('Failed to load coupons')
      const data = await res.json()
      setCoupons(data.coupons || [])
    } catch (err: any) {
      toast.error(err.message || 'Error loading coupons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const resetForm = () => {
    setEditingCoupon(null)
    setCode('')
    setTitle('')
    setDescription('')
    setDiscountType('percentage')
    setDiscountValue('')
    setMaxDiscountInr('')
    setMinOrderInr('0')
    setIsPublicOffer(true)
    setIsActive(true)
    setFirstPurchaseOnly(false)
    setMaxUses('')
    setMaxUsesPerUser('1')
    setExpiresAt('')
  }

  const openAddModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c)
    setCode(c.code)
    setTitle(c.title)
    setDescription(c.description || '')
    setDiscountType(c.discount_type)
    setDiscountValue(String(c.discount_value))
    setMaxDiscountInr(c.max_discount_inr ? String(c.max_discount_inr) : '')
    setMinOrderInr(String(c.min_order_inr || 0))
    setIsPublicOffer(c.is_public_offer)
    setIsActive(c.is_active)
    setFirstPurchaseOnly(c.first_purchase_only)
    setMaxUses(c.max_uses ? String(c.max_uses) : '')
    setMaxUsesPerUser(String(c.max_uses_per_user || 1))
    setExpiresAt(c.expires_at ? c.expires_at.split('T')[0] : '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !title.trim() || !discountValue) {
      toast.error('Please enter Coupon Code, Title, and Discount Value')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        max_discount_inr: maxDiscountInr ? parseFloat(maxDiscountInr) : null,
        min_order_inr: minOrderInr ? parseFloat(minOrderInr) : 0,
        is_public_offer: isPublicOffer,
        is_active: isActive,
        first_purchase_only: firstPurchaseOnly,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        max_uses_per_user: maxUsesPerUser ? parseInt(maxUsesPerUser, 10) : 1,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
      }

      const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons'
      const method = editingCoupon ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save coupon')

      toast.success(editingCoupon ? 'Coupon updated successfully!' : 'Coupon created successfully!')
      setIsModalOpen(false)
      fetchCoupons()
    } catch (err: any) {
      toast.error(err.message || 'Error saving coupon')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (c: Coupon, field: 'is_active' | 'is_public_offer') => {
    try {
      const updatedVal = !c[field]
      const res = await fetch(`/api/admin/coupons/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: updatedVal })
      })

      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Coupon ${field === 'is_active' ? 'status' : 'visibility'} updated`)
      setCoupons(prev => prev.map(item => item.id === c.id ? { ...item, [field]: updatedVal } : item))
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    }
  }

  const handleDelete = async (id: string, cCode: string) => {
    if (!confirm(`Are you sure you want to delete coupon ${cCode}?`)) return

    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete coupon')
      toast.success(`Coupon ${cCode} deleted`)
      setCoupons(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      toast.error(err.message || 'Error deleting coupon')
    }
  }

  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (filterType === 'public') return c.is_public_offer
    if (filterType === 'private') return !c.is_public_offer
    if (filterType === 'active') return c.is_active

    return true
  })

  const totalCoupons = coupons.length
  const activeCoupons = coupons.filter(c => c.is_active).length
  const publicOffers = coupons.filter(c => c.is_active && c.is_public_offer).length
  const totalRedemptions = coupons.reduce((acc, c) => acc + (c.used_count || 0), 0)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            <Tag className="w-3.5 h-3.5 text-violet-500" />
            <span>Monetization & Growth</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--heading)] tracking-tight flex items-center gap-2.5">
            Coupons & Promotional Offers
          </h1>
          <p className="text-xs text-[var(--body)] mt-1">
            Create discount codes, configure checkout public offers, and monitor redemption limits.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-600/20 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Total Coupons</span>
            <TicketPercent className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)] mt-2 font-mono">{totalCoupons}</div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 block">Configured in registry</span>
        </div>

        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active Coupons</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)] mt-2 font-mono">{activeCoupons}</div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 block">Eligible for checkout redemption</span>
        </div>

        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Public Offers</span>
            <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)] mt-2 font-mono">{publicOffers}</div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 block">Visible in "Check today's Offer"</span>
        </div>

        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Total Redemptions</span>
            <Layers className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)] mt-2 font-mono">{totalRedemptions}</div>
          <span className="text-[11px] text-[var(--muted)] mt-0.5 block">Applied across orders</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--card-bg)] border border-[var(--border)] p-3 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search code, title, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-[var(--heading)] text-[var(--card-bg)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            All Coupons ({coupons.length})
          </button>
          <button
            onClick={() => setFilterType('public')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'public'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-bold'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            Public Offers ({publicOffers})
          </button>
          <button
            onClick={() => setFilterType('private')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'private'
                ? 'bg-[var(--heading)] text-[var(--card-bg)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            Private / Code Only
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'active'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-bold'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            Active ({activeCoupons})
          </button>
          <button
            onClick={fetchCoupons}
            className="p-2 text-[var(--muted)] hover:text-[var(--heading)] rounded-xl hover:bg-[var(--hover-bg)] transition-colors cursor-pointer ml-auto"
            title="Refresh coupons"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-16 px-4">
            <TicketPercent className="w-12 h-12 text-[var(--muted)] mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-[var(--heading)]">No Coupons Found</h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try matching a different keyword or reset filters.' : 'Create your first promotional discount coupon code above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase font-bold text-[var(--muted)] bg-[var(--hover-bg)] tracking-wider">
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">Min. Order</th>
                  <th className="py-3.5 px-4">Today's Offer Visibility</th>
                  <th className="py-3.5 px-4">Redemptions</th>
                  <th className="py-3.5 px-4">Expiry</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {filteredCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--hover-bg)] transition-colors group">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 tracking-wide">
                          {c.code}
                        </span>
                        <div>
                          <div className="font-semibold text-[var(--heading)] text-xs">{c.title}</div>
                          {c.description && (
                            <p className="text-[11px] text-[var(--muted)] line-clamp-1 max-w-xs">{c.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[var(--heading)]">
                        {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                      </div>
                      {c.discount_type === 'percentage' && c.max_discount_inr && (
                        <div className="text-[10px] text-[var(--muted)]">Cap: ₹{c.max_discount_inr}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[var(--body)]">
                      ₹{c.min_order_inr ? c.min_order_inr.toLocaleString('en-IN') : '0'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(c, 'is_public_offer')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          c.is_public_offer
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20'
                            : 'bg-[var(--hover-bg)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)]'
                        }`}
                        title="Click to toggle offer drawer visibility"
                      >
                        {c.is_public_offer ? <Eye className="w-3 h-3 text-amber-500" /> : <EyeOff className="w-3 h-3 text-[var(--muted)]" />}
                        <span>{c.is_public_offer ? 'In Checkout Drawer' : 'Private Only'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[var(--heading)] font-semibold">{c.used_count || 0}</span>
                      <span className="text-[var(--muted)] text-[11px]"> / {c.max_uses ? c.max_uses : '∞'}</span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-[var(--muted)] text-[11px]">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'No Expiry'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(c, 'is_active')}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                          c.is_active
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-[var(--hover-bg)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-[var(--muted)]'}`} />
                        <span>{c.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors cursor-pointer"
                          title="Edit coupon"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.code)}
                          className="p-1.5 text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[var(--heading)] flex items-center gap-2">
                  <TicketPercent className="w-4 h-4 text-violet-500" />
                  {editingCoupon ? 'Edit Coupon Code' : 'Create New Coupon'}
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Configure discount parameters and checkout offer visibility.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[var(--muted)] hover:text-[var(--heading)] rounded-lg hover:bg-[var(--hover-bg)] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                    Coupon Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WELCOME20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[var(--heading)] uppercase placeholder-[var(--muted)] focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                    Title / Badge <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Welcome 20% Off"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                  Description / Terms for Customer
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Get 20% off up to ₹1,000 on your first agent activation."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                    {discountType === 'percentage' ? 'Percentage Value (%)' : 'Flat Amount (₹)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder={discountType === 'percentage' ? '20' : '500'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                    Max Cap (₹) {discountType === 'flat' && <span className="text-[var(--muted)] text-[10px]">(N/A for flat)</span>}
                  </label>
                  <input
                    type="number"
                    disabled={discountType === 'flat'}
                    placeholder="e.g. 1000"
                    value={maxDiscountInr}
                    onChange={(e) => setMaxDiscountInr(e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Min Order & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={minOrderInr}
                    onChange={(e) => setMinOrderInr(e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                    Total Global Uses
                  </label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                    Max Uses Per User
                  </label>
                  <input
                    type="number"
                    placeholder="1"
                    value={maxUsesPerUser}
                    onChange={(e) => setMaxUsesPerUser(e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-semibold text-[var(--heading)] mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 cursor-pointer"
                />
              </div>

              {/* Special Toggles Box */}
              <div className="p-4 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl space-y-3">
                {/* Public Offer Toggle (CRITICAL USER REQUIREMENT) */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="isPublicOffer"
                    checked={isPublicOffer}
                    onChange={(e) => setIsPublicOffer(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card-bg)] text-violet-600 focus:ring-violet-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="isPublicOffer" className="text-xs font-bold text-[var(--heading)] flex items-center gap-1.5 cursor-pointer">
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      <span>Show in "Check today's Offer" drawer at checkout</span>
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      When enabled, clients who click the <strong className="text-[var(--heading)]">"Check today's Offer"</strong> button during checkout will see this offer with a 1-click apply button. When disabled, the code is hidden and must be typed manually.
                    </p>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card-bg)] text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-xs font-medium text-[var(--body)] cursor-pointer">
                    Enable coupon for immediate redemption (Active)
                  </label>
                </div>

                {/* First Purchase Only */}
                <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
                  <input
                    type="checkbox"
                    id="firstPurchaseOnly"
                    checked={firstPurchaseOnly}
                    onChange={(e) => setFirstPurchaseOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card-bg)] text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <label htmlFor="firstPurchaseOnly" className="text-xs font-medium text-[var(--body)] cursor-pointer">
                    Restrict to first-time purchasers only
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingCoupon ? 'Update Coupon' : 'Create Coupon')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
