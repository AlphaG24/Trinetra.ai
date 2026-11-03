'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  TrendingUp,
  AlertCircle,
  Boxes,
  IndianRupee,
  ShoppingCart,
  FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'

interface InventoryItem {
  id: string
  title: string
  identifier_code: string | null
  category: string
  base_price_inr: number | null
  minimum_price_inr: number | null
  available_units: number
  status: string
  created_at: string
  updated_at: string
  metadata?: {
    initial_units?: number
    sold_units?: number
    unit_label?: string
    notes?: string
    [key: string]: any
  }
}

export default function InventoryPricingSheetPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Inline editing state: { itemId: { field: value } }
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<InventoryItem> & { initial_units?: number; sold_units?: number }>({})

  // Add row modal / state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newRow, setNewRow] = useState({
    title: '',
    identifier_code: '',
    category: 'inventory',
    base_price_inr: '',
    minimum_price_inr: '',
    initial_units: '10',
    sold_units: '0'
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchItems = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true)
      const res = await fetch('/api/business-catalog?category=all')
      const json = await res.json()
      if (json.success && json.data?.items) {
        // Exclude voice directives from this inventory spreadsheet
        const catalogItems = json.data.items.filter((i: any) => i.category !== 'voice_directive')
        setItems(catalogItems)
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
      if (isManual) toast.error('Failed to load inventory spreadsheet')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // Poll every 8 seconds to reflect in-call sales in real time
    const interval = setInterval(() => {
      fetchItems(false)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const startEditing = (item: InventoryItem) => {
    setEditingRowId(item.id)
    const initial = item.metadata?.initial_units !== undefined ? item.metadata.initial_units : (item.available_units + (item.metadata?.sold_units || 0))
    const sold = item.metadata?.sold_units || 0
    setEditForm({
      title: item.title,
      identifier_code: item.identifier_code || '',
      category: item.category,
      base_price_inr: item.base_price_inr,
      minimum_price_inr: item.minimum_price_inr,
      initial_units: initial,
      sold_units: sold
    })
  }

  const cancelEditing = () => {
    setEditingRowId(null)
    setEditForm({})
  }

  const saveEditing = async (id: string) => {
    try {
      const initial = Number(editForm.initial_units || 0)
      const sold = Number(editForm.sold_units || 0)
      const available = Math.max(0, initial - sold)

      const payload = {
        id,
        title: editForm.title,
        identifier_code: editForm.identifier_code || null,
        category: editForm.category || 'inventory',
        base_price_inr: editForm.base_price_inr !== undefined && editForm.base_price_inr !== null ? Number(editForm.base_price_inr) : null,
        minimum_price_inr: editForm.minimum_price_inr !== undefined && editForm.minimum_price_inr !== null ? Number(editForm.minimum_price_inr) : null,
        available_units: available,
        initial_units: initial,
        sold_units: sold,
        status: available > 0 ? 'available' : 'booked'
      }

      const res = await fetch('/api/business-catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Spreadsheet row updated')
        setEditingRowId(null)
        fetchItems()
      } else {
        toast.error(json.error || 'Failed to update row')
      }
    } catch (err) {
      toast.error('Network error updating row')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" from inventory?`)) return
    try {
      const res = await fetch(`/api/business-catalog?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Item deleted')
        fetchItems()
      } else {
        toast.error(json.error || 'Failed to delete')
      }
    } catch {
      toast.error('Network error deleting item')
    }
  }

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRow.title.trim()) {
      toast.error('Product or service name is required')
      return
    }

    try {
      const initial = Number(newRow.initial_units || 1)
      const sold = Number(newRow.sold_units || 0)
      const available = Math.max(0, initial - sold)

      const payload = {
        title: newRow.title.trim(),
        identifier_code: newRow.identifier_code.trim() || null,
        category: newRow.category || 'inventory',
        base_price_inr: newRow.base_price_inr ? Number(newRow.base_price_inr) : null,
        minimum_price_inr: newRow.minimum_price_inr ? Number(newRow.minimum_price_inr) : null,
        available_units: available,
        initial_units: initial,
        sold_units: sold,
        status: available > 0 ? 'available' : 'booked'
      }

      const res = await fetch('/api/business-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (json.success) {
        toast.success(`"${newRow.title}" added to inventory sheet`)
        setIsAddOpen(false)
        setNewRow({
          title: '',
          identifier_code: '',
          category: 'inventory',
          base_price_inr: '',
          minimum_price_inr: '',
          initial_units: '10',
          sold_units: '0'
        })
        fetchItems()
      } else {
        toast.error(json.error || 'Failed to create item')
      }
    } catch (err) {
      toast.error('Network error creating item')
    }
  }

  // Quick increment sold count (+1 sold during call/walk-in)
  const handleQuickSell = async (item: InventoryItem, delta: number) => {
    const currentInitial = item.metadata?.initial_units !== undefined ? item.metadata.initial_units : (item.available_units + (item.metadata?.sold_units || 0))
    const currentSold = item.metadata?.sold_units || 0
    const newSold = Math.max(0, currentSold + delta)
    const newAvailable = Math.max(0, currentInitial - newSold)

    try {
      const res = await fetch('/api/business-catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          initial_units: currentInitial,
          sold_units: newSold,
          available_units: newAvailable,
          status: newAvailable > 0 ? 'available' : 'booked'
        })
      })
      const json = await res.json()
      if (json.success) {
        fetchItems()
      }
    } catch {
      toast.error('Failed to update stock')
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error('No inventory items to export')
      return
    }

    const headers = ['Product/Service Name', 'SKU/Code', 'Category', 'Base Price (INR)', 'Floor Price (INR)', 'Initial Stock', 'Sold Pieces', 'Available Stock', 'Status']
    const rows = items.map(item => {
      const initial = item.metadata?.initial_units !== undefined ? item.metadata.initial_units : (item.available_units + (item.metadata?.sold_units || 0))
      const sold = item.metadata?.sold_units || 0
      return [
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.identifier_code || ''}"`,
        `"${item.category}"`,
        item.base_price_inr !== null ? item.base_price_inr : '',
        item.minimum_price_inr !== null ? item.minimum_price_inr : '',
        initial,
        sold,
        item.available_units,
        item.available_units > 0 ? 'In Stock' : 'Sold Out'
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inventory_pricing_sheet_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Spreadsheet exported to CSV')
  }

  // Filter items
  const filtered = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.identifier_code && item.identifier_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Summary Metrics
  const totalProducts = items.length
  const totalInitialUnits = items.reduce((acc, i) => acc + (i.metadata?.initial_units !== undefined ? i.metadata.initial_units : (i.available_units + (i.metadata?.sold_units || 0))), 0)
  const totalSoldUnits = items.reduce((acc, i) => acc + (i.metadata?.sold_units || 0), 0)
  const totalAvailableUnits = items.reduce((acc, i) => acc + i.available_units, 0)
  const estimatedRevenue = items.reduce((acc, i) => {
    const sold = i.metadata?.sold_units || 0
    const price = i.base_price_inr || 0
    return acc + (sold * price)
  }, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--heading)] tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[var(--heading)]" />
            <span>Live Products, Inventory & Dynamic Pricing Sheet</span>
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Real-time spreadsheet accessed by AI callers. Stock levels decrement and sold pieces increment automatically during customer calls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchItems(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Sheet"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-[var(--muted)]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Row</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span className="text-xs font-semibold">Active Products</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)]">{totalProducts}</div>
          <p className="text-[11px] text-[var(--muted)]">Unique catalog items</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span className="text-xs font-semibold">Total Stock Units</span>
            <Boxes className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)]">{totalInitialUnits}</div>
          <p className="text-[11px] text-[var(--muted)]">{totalAvailableUnits} units available right now</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span className="text-xs font-semibold">Units Sold In-Calls</span>
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalSoldUnits}
          </div>
          <p className="text-[11px] text-[var(--muted)]">Auto-incremented on call orders</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span className="text-xs font-semibold">Sales Realized</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)]">
            ₹{estimatedRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[var(--muted)]">Sold units × base price</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search product name, SKU, or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer shadow-xs"
          >
            <option value="all">All Categories</option>
            <option value="inventory">Inventory & Goods</option>
            <option value="general">Services & General</option>
            <option value="logistics">Routes & Logistics</option>
          </select>
        </div>
      </div>

      {/* Excel Spreadsheet Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] uppercase font-mono text-[10px] tracking-wider select-none">
                <th className="py-3 px-4 font-bold">Product / Service Item</th>
                <th className="py-3 px-3 font-bold">SKU / Code</th>
                <th className="py-3 px-3 font-bold">Category</th>
                <th className="py-3 px-3 font-bold text-right">Base Price</th>
                <th className="py-3 px-3 font-bold text-right">AI Floor Price</th>
                <th className="py-3 px-3 font-bold text-center">Initial Stock</th>
                <th className="py-3 px-3 font-bold text-center">Sold Pieces</th>
                <th className="py-3 px-3 font-bold text-center">Available Stock</th>
                <th className="py-3 px-3 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--heading)]" />
                    <span>Loading live spreadsheet data...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--muted)] space-y-2">
                    <Boxes className="w-8 h-8 mx-auto text-[var(--muted)] stroke-1" />
                    <p className="font-semibold text-sm text-[var(--heading)]">No products in inventory</p>
                    <p className="text-xs max-w-sm mx-auto">
                      Click "+ Add Row" above to create your product price list, stock units, and minimum floor rules.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const isEditing = editingRowId === item.id
                  const initialUnits = item.metadata?.initial_units !== undefined ? item.metadata.initial_units : (item.available_units + (item.metadata?.sold_units || 0))
                  const soldUnits = item.metadata?.sold_units || 0
                  const isSoldOut = item.available_units <= 0
                  const isLowStock = item.available_units > 0 && item.available_units <= 3

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[var(--hover-bg)]/60 transition-colors ${
                        isEditing ? 'bg-[var(--hover-bg)]/80' : ''
                      }`}
                    >
                      {/* Title */}
                      <td className="py-3 px-4 font-semibold text-[var(--heading)]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.title || ''}
                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        ) : (
                          <span>{item.title}</span>
                        )}
                      </td>

                      {/* SKU / Code */}
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--muted)]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.identifier_code || ''}
                            onChange={e => setEditForm({ ...editForm, identifier_code: e.target.value })}
                            className="w-24 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-[var(--heading)] font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        ) : (
                          item.identifier_code || <span className="opacity-40">-</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-[var(--muted)] capitalize">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.category || ''}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-24 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        ) : (
                          item.category
                        )}
                      </td>

                      {/* Base Price */}
                      <td className="py-3 px-3 text-right font-medium text-[var(--heading)]">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.base_price_inr ?? ''}
                            onChange={e => setEditForm({ ...editForm, base_price_inr: Number(e.target.value) })}
                            className="w-20 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-right text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        ) : item.base_price_inr !== null ? (
                          `₹${item.base_price_inr.toLocaleString('en-IN')}`
                        ) : (
                          <span className="text-[var(--muted)]">-</span>
                        )}
                      </td>

                      {/* Floor Price */}
                      <td className="py-3 px-3 text-right font-medium text-[var(--muted)]">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.minimum_price_inr ?? ''}
                            onChange={e => setEditForm({ ...editForm, minimum_price_inr: Number(e.target.value) })}
                            className="w-20 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-right text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        ) : item.minimum_price_inr !== null ? (
                          `₹${item.minimum_price_inr.toLocaleString('en-IN')}`
                        ) : (
                          <span className="opacity-40">-</span>
                        )}
                      </td>

                      {/* Initial Stock */}
                      <td className="py-3 px-3 text-center font-bold text-[var(--heading)]">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.initial_units ?? 0}
                            onChange={e => setEditForm({ ...editForm, initial_units: Number(e.target.value) })}
                            className="w-16 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-center text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        ) : (
                          initialUnits
                        )}
                      </td>

                      {/* Sold Pieces (e.g. 3) */}
                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.sold_units ?? 0}
                            onChange={e => setEditForm({ ...editForm, sold_units: Number(e.target.value) })}
                            className="w-16 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-center text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {soldUnits}
                            </span>
                            <div className="flex flex-col ml-1">
                              <button
                                onClick={() => handleQuickSell(item, 1)}
                                className="text-[10px] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer leading-none"
                                title="Add 1 piece sold"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleQuickSell(item, -1)}
                                disabled={soldUnits <= 0}
                                className="text-[10px] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer leading-none disabled:opacity-20"
                                title="Subtract 1 piece sold"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Available Stock (Initial - Sold) */}
                      <td className="py-3 px-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          isSoldOut
                            ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500 line-through'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'text-[var(--heading)]'
                        }`}>
                          {item.available_units}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSoldOut
                            ? 'bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {isSoldOut ? 'Sold Out' : isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEditing(item.id)}
                                className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                title="Save Row"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[var(--muted)] cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(item)}
                                className="p-1 rounded hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer transition-colors"
                                title="Edit Row"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.title)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/50 text-[var(--muted)] hover:text-red-500 cursor-pointer transition-colors"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Row Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Add Product or Service to Sheet</span>
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRow} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--heading)] mb-1">Product or Service Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic T-Shirt (Black - M) or Hair Spa & Massage"
                  value={newRow.title}
                  onChange={e => setNewRow({ ...newRow, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">SKU / Identifier Code</label>
                  <input
                    type="text"
                    placeholder="e.g. TSH-BLK-M"
                    value={newRow.identifier_code}
                    onChange={e => setNewRow({ ...newRow, identifier_code: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">Category</label>
                  <select
                    value={newRow.category}
                    onChange={e => setNewRow({ ...newRow, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  >
                    <option value="inventory">Inventory & Products</option>
                    <option value="general">Services & General</option>
                    <option value="logistics">Routes & Logistics</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 599"
                    value={newRow.base_price_inr}
                    onChange={e => setNewRow({ ...newRow, base_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">AI Minimum Floor Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 499 (Strict limit for bot)"
                    value={newRow.minimum_price_inr}
                    onChange={e => setNewRow({ ...newRow, minimum_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">Initial Total Stock (Units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 10"
                    value={newRow.initial_units}
                    onChange={e => setNewRow({ ...newRow, initial_units: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">Already Sold (Units)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 0"
                    value={newRow.sold_units}
                    onChange={e => setNewRow({ ...newRow, sold_units: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Add to Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
