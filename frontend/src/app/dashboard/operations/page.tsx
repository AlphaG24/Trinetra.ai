'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Boxes,
  Truck,
  Package,
  Calendar,
  Layers,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  X,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'

interface OperationsItem {
  id: string
  title: string
  identifier_code: string | null
  category: 'logistics' | 'containers' | 'appointment_slots' | 'inventory' | 'pricing' | 'general'
  route_origin: string | null
  route_destination: string | null
  available_units: number
  base_price_inr: number | null
  minimum_price_inr: number | null
  booking_slot_start: string | null
  booking_slot_end: string | null
  status: 'available' | 'reserved' | 'booked' | 'in_transit'
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: Boxes },
  { id: 'logistics', label: 'Logistics & Routes', icon: Truck },
  { id: 'containers', label: 'Containers', icon: Layers },
  { id: 'appointment_slots', label: 'Booking Slots', icon: Calendar },
  { id: 'inventory', label: 'Inventory & Pricing', icon: Package }
]

export default function OperationsBrainPage() {
  const [items, setItems] = useState<OperationsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OperationsItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    identifier_code: '',
    category: 'logistics',
    route_origin: '',
    route_destination: '',
    available_units: 1,
    base_price_inr: '',
    minimum_price_inr: '',
    booking_slot_start: '',
    booking_slot_end: '',
    status: 'available'
  })

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/business-catalog')
      const json = await res.json()
      if (json.success && json.data) {
        setItems(json.data.items || [])
      } else {
        toast.error('Failed to load operations catalog')
      }
    } catch (err) {
      console.error('Failed to load items:', err)
      toast.error('Network error loading catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.identifier_code && item.identifier_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.route_origin && item.route_origin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.route_destination && item.route_destination.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory

      const matchesStatus =
        statusFilter === 'all' || item.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [items, searchQuery, selectedCategory, statusFilter])

  // KPIs
  const stats = useMemo(() => {
    return {
      total: items.length,
      logistics: items.filter(i => i.category === 'logistics' && i.status === 'available').length,
      containers: items.filter(i => i.category === 'containers' && i.status === 'available').length,
      slots: items.filter(i => i.category === 'appointment_slots' && i.status === 'available').length
    }
  }, [items])

  const handleOpenAdd = () => {
    setEditingItem(null)
    setFormData({
      title: '',
      identifier_code: '',
      category: 'logistics',
      route_origin: '',
      route_destination: '',
      available_units: 1,
      base_price_inr: '',
      minimum_price_inr: '',
      booking_slot_start: '',
      booking_slot_end: '',
      status: 'available'
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: OperationsItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      identifier_code: item.identifier_code || '',
      category: item.category,
      route_origin: item.route_origin || '',
      route_destination: item.route_destination || '',
      available_units: item.available_units,
      base_price_inr: item.base_price_inr !== null ? String(item.base_price_inr) : '',
      minimum_price_inr: item.minimum_price_inr !== null ? String(item.minimum_price_inr) : '',
      booking_slot_start: item.booking_slot_start ? item.booking_slot_start.slice(0, 16) : '',
      booking_slot_end: item.booking_slot_end ? item.booking_slot_end.slice(0, 16) : '',
      status: item.status
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    try {
      setSaving(true)
      const payload: Record<string, any> = {
        title: formData.title.trim(),
        identifier_code: formData.identifier_code.trim() || null,
        category: formData.category,
        route_origin: formData.route_origin.trim() || null,
        route_destination: formData.route_destination.trim() || null,
        available_units: Number(formData.available_units) || 1,
        base_price_inr: formData.base_price_inr !== '' ? Number(formData.base_price_inr) : null,
        minimum_price_inr: formData.minimum_price_inr !== '' ? Number(formData.minimum_price_inr) : null,
        booking_slot_start: formData.booking_slot_start ? new Date(formData.booking_slot_start).toISOString() : null,
        booking_slot_end: formData.booking_slot_end ? new Date(formData.booking_slot_end).toISOString() : null,
        status: formData.status
      }

      if (editingItem) {
        payload.id = editingItem.id
        const res = await fetch('/api/business-catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const json = await res.json()
        if (json.success) {
          toast.success('Operations item updated')
          setIsModalOpen(false)
          fetchItems()
        } else {
          toast.error(json.error || 'Failed to update item')
        }
      } else {
        const res = await fetch('/api/business-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const json = await res.json()
        if (json.success) {
          toast.success('New operations item added to AI brain')
          setIsModalOpen(false)
          fetchItems()
        } else {
          toast.error(json.error || 'Failed to add item')
        }
      }
    } catch (err) {
      console.error('Error saving item:', err)
      toast.error('Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete item "${title}" from AI operations brain?`)) return

    try {
      const res = await fetch(`/api/business-catalog?id=${id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Item deleted')
        setItems(prev => prev.filter(i => i.id !== id))
      } else {
        toast.error(json.error || 'Failed to delete item')
      }
    } catch (err) {
      console.error('Error deleting item:', err)
      toast.error('Failed to delete item')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Available
          </span>
        )
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Reserved
          </span>
        )
      case 'booked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Boxes className="w-3.5 h-3.5" /> Booked
          </span>
        )
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Truck className="w-3.5 h-3.5" /> In Transit
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            {status}
          </span>
        )
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'logistics':
        return <Truck className="w-4 h-4 text-cyan-400" />
      case 'containers':
        return <Layers className="w-4 h-4 text-indigo-400" />
      case 'appointment_slots':
        return <Calendar className="w-4 h-4 text-amber-400" />
      default:
        return <Package className="w-4 h-4 text-emerald-400" />
    }
  }

  return (
    <div className="min-h-screen bg-[#080010] text-zinc-100 p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Live Operations & Inventory Brain
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                  In-Call Sync Active
                </span>
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Real-time operational knowledge base for truck routes, containers, appointment slots, and strict negotiation floor prices accessed live during voice calls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-colors"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Operations Item
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Catalog Items</span>
            <Boxes className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.total}</div>
          <div className="text-xs text-zinc-500">Live items indexed in voice bot brain</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Available Routes / Trucks</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-300">{stats.logistics}</div>
          <div className="text-xs text-zinc-500">Open logistics routes ready for booking</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Available Containers</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-300">{stats.containers}</div>
          <div className="text-xs text-zinc-500">20ft / 40ft units in stock</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Active Booking Slots</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-300">{stats.slots}</div>
          <div className="text-xs text-zinc-500">Appointment slots open for clients</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-xl overflow-x-auto w-full md:w-auto">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const active = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search route, item or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#0d0417] border border-white/10 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="booked">Booked</option>
            <option value="in_transit">In Transit</option>
          </select>
        </div>
      </div>

      {/* Main Items Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-sm">Loading live operational catalog...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white/[0.02] border border-white/10 p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No items found</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Add your routes (e.g. Purvi Roadlines Delhi-Mumbai), container inventory, daily booking slots, or pricing rules to let the voice agent negotiate and query live data.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white line-clamp-1">{item.title}</h3>
                      {item.identifier_code && (
                        <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                          {item.identifier_code}
                        </span>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                {/* Route information if applicable */}
                {(item.route_origin || item.route_destination) && (
                  <div className="flex items-center gap-2 text-xs bg-black/20 p-2 rounded-xl border border-white/5 text-zinc-300">
                    <span className="font-medium text-white">{item.route_origin || 'Any Origin'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-medium text-white">{item.route_destination || 'Any Destination'}</span>
                  </div>
                )}

                {/* Available Units & Slots */}
                <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                  <span>Available Units:</span>
                  <span className="font-semibold text-white font-mono">{item.available_units} units</span>
                </div>

                {item.booking_slot_start && (
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Slot Time:</span>
                    <span className="text-zinc-300 font-mono text-[11px]">
                      {new Date(item.booking_slot_start).toLocaleDateString()} {new Date(item.booking_slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {/* Negotiation Pricing Box */}
                {(item.base_price_inr !== null || item.minimum_price_inr !== null) && (
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Base Quoted Price:</span>
                      <span className="font-bold text-white font-mono">
                        {item.base_price_inr !== null ? `₹${item.base_price_inr.toLocaleString('en-IN')}` : 'Variable'}
                      </span>
                    </div>
                    {item.minimum_price_inr !== null && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-500/10">
                        <span className="text-amber-400 flex items-center gap-1 font-medium">
                          <TrendingDown className="w-3.5 h-3.5" /> AI Floor Price:
                        </span>
                        <span className="font-bold text-amber-300 font-mono">
                          ₹{item.minimum_price_inr.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className="text-[11px] text-zinc-500">
                  Updated {new Date(item.updated_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                    title="Edit Item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#0f041c] border border-white/15 rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-400" />
                {editingItem ? 'Edit Operations Item' : 'Add Item to AI Brain'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-300">
                    Title / Route Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Delhi to Mumbai 32ft MX Container Truck"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#17082a] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="logistics">Logistics & Transport</option>
                    <option value="containers">Containers & Storage</option>
                    <option value="appointment_slots">Appointment / Booking Slots</option>
                    <option value="inventory">Inventory & Pricing</option>
                    <option value="general">General Operations</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Identifier / SKU / Code</label>
                  <input
                    type="text"
                    placeholder="e.g., TRK-DL-MUM-01"
                    value={formData.identifier_code}
                    onChange={e => setFormData({ ...formData, identifier_code: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Route Origin City</label>
                  <input
                    type="text"
                    placeholder="e.g., Delhi NCR"
                    value={formData.route_origin}
                    onChange={e => setFormData({ ...formData, route_origin: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Route Destination City</label>
                  <input
                    type="text"
                    placeholder="e.g., Mumbai JNPT"
                    value={formData.route_destination}
                    onChange={e => setFormData({ ...formData, route_destination: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Available Units</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.available_units}
                    onChange={e => setFormData({ ...formData, available_units: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#17082a] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="booked">Booked</option>
                    <option value="in_transit">In Transit</option>
                  </select>
                </div>

                {/* Pricing Fields */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Base Quoted Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 45000"
                    value={formData.base_price_inr}
                    onChange={e => setFormData({ ...formData, base_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500">The standard price the bot quotes first.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-amber-300 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Strict Negotiation Floor (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 41000"
                    value={formData.minimum_price_inr}
                    onChange={e => setFormData({ ...formData, minimum_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-amber-400/80">The bot will NEVER negotiate below this floor.</p>
                </div>

                {/* Slots */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Slot Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.booking_slot_start}
                    onChange={e => setFormData({ ...formData, booking_slot_start: e.target.value })}
                    className="w-full px-3 py-2 bg-[#17082a] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Slot End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.booking_slot_end}
                    onChange={e => setFormData({ ...formData, booking_slot_end: e.target.value })}
                    className="w-full px-3 py-2 bg-[#17082a] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-medium shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to AI Brain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
