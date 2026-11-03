'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  X,
  Upload,
  FileSpreadsheet,
  Download,
  SlidersHorizontal
} from 'lucide-react'
import { toast } from 'sonner'

interface OperationsItem {
  id: string
  title: string
  identifier_code: string | null
  category: 'logistics' | 'containers' | 'appointment_slots' | 'inventory' | 'general'
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
  { id: 'logistics', label: 'Logistics & Transport', icon: Truck },
  { id: 'containers', label: 'Containers & Fleet', icon: Layers },
  { id: 'appointment_slots', label: 'Doctor / Booking Slots', icon: Calendar },
  { id: 'inventory', label: 'Products & Inventory', icon: Package },
  { id: 'general', label: 'Universal / Other Business', icon: SlidersHorizontal }
]

export default function OperationsBrainPage() {
  const [items, setItems] = useState<OperationsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OperationsItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([])

  // Dynamic Custom Key-Values for General category
  const [customAttributes, setCustomAttributes] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' }
  ])

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    identifier_code: '',
    category: 'logistics',
    // Logistics specific
    route_origin: '',
    route_destination: '',
    vehicle_type: '',
    // Container specific
    container_size: '',
    yard_location: '',
    // Appointments specific
    specialist_name: '',
    booking_slot_start: '',
    booking_slot_end: '',
    // Products specific
    sku_code: '',
    department: '',
    // Common
    available_units: 1,
    base_price_inr: '',
    minimum_price_inr: '',
    status: 'available',
    description: ''
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

  const handleOpenAdd = (defaultCat?: string) => {
    setEditingItem(null)
    const cat = defaultCat && defaultCat !== 'all' ? defaultCat : 'logistics'
    setFormData({
      title: '',
      identifier_code: '',
      category: cat,
      route_origin: '',
      route_destination: '',
      vehicle_type: '',
      container_size: '',
      yard_location: '',
      specialist_name: '',
      booking_slot_start: '',
      booking_slot_end: '',
      sku_code: '',
      department: '',
      available_units: 1,
      base_price_inr: '',
      minimum_price_inr: '',
      status: 'available',
      description: ''
    })
    setCustomAttributes([{ key: '', value: '' }])
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: OperationsItem) => {
    setEditingItem(item)
    const meta = item.metadata || {}
    setFormData({
      title: item.title,
      identifier_code: item.identifier_code || '',
      category: item.category,
      route_origin: item.route_origin || '',
      route_destination: item.route_destination || '',
      vehicle_type: meta.vehicle_type || '',
      container_size: meta.container_size || '',
      yard_location: meta.yard_location || '',
      specialist_name: meta.specialist_name || '',
      booking_slot_start: item.booking_slot_start ? item.booking_slot_start.slice(0, 16) : '',
      booking_slot_end: item.booking_slot_end ? item.booking_slot_end.slice(0, 16) : '',
      sku_code: meta.sku_code || '',
      department: meta.department || '',
      available_units: item.available_units,
      base_price_inr: item.base_price_inr !== null ? String(item.base_price_inr) : '',
      minimum_price_inr: item.minimum_price_inr !== null ? String(item.minimum_price_inr) : '',
      status: item.status,
      description: meta.description || ''
    })

    // Load custom attributes
    const customList: { key: string; value: string }[] = []
    if (meta.custom_attributes && typeof meta.custom_attributes === 'object') {
      Object.entries(meta.custom_attributes).forEach(([k, v]) => {
        customList.push({ key: k, value: String(v) })
      })
    }
    setCustomAttributes(customList.length > 0 ? customList : [{ key: '', value: '' }])
    setIsModalOpen(true)
  }

  const handleAddCustomAttribute = () => {
    setCustomAttributes([...customAttributes, { key: '', value: '' }])
  }

  const handleRemoveCustomAttribute = (index: number) => {
    setCustomAttributes(customAttributes.filter((_, i) => i !== index))
  }

  const handleCustomAttributeChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...customAttributes]
    updated[index][field] = val
    setCustomAttributes(updated)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    try {
      setSaving(true)
      const meta: Record<string, any> = {
        description: formData.description.trim() || undefined
      }

      if (formData.category === 'logistics' && formData.vehicle_type) {
        meta.vehicle_type = formData.vehicle_type.trim()
      } else if (formData.category === 'containers') {
        if (formData.container_size) meta.container_size = formData.container_size.trim()
        if (formData.yard_location) meta.yard_location = formData.yard_location.trim()
      } else if (formData.category === 'appointment_slots') {
        if (formData.specialist_name) meta.specialist_name = formData.specialist_name.trim()
      } else if (formData.category === 'inventory') {
        if (formData.sku_code) meta.sku_code = formData.sku_code.trim()
        if (formData.department) meta.department = formData.department.trim()
      }

      // Collect custom attributes
      const customDict: Record<string, string> = {}
      customAttributes.forEach(attr => {
        if (attr.key.trim()) {
          customDict[attr.key.trim()] = attr.value.trim()
        }
      })
      if (Object.keys(customDict).length > 0) {
        meta.custom_attributes = customDict
      }

      const payload: Record<string, any> = {
        title: formData.title.trim(),
        identifier_code: formData.identifier_code.trim() || null,
        category: formData.category,
        route_origin: formData.category === 'logistics' ? (formData.route_origin.trim() || null) : null,
        route_destination: formData.category === 'logistics' ? (formData.route_destination.trim() || null) : null,
        available_units: Number(formData.available_units) || 1,
        base_price_inr: formData.base_price_inr !== '' ? Number(formData.base_price_inr) : null,
        minimum_price_inr: formData.minimum_price_inr !== '' ? Number(formData.minimum_price_inr) : null,
        booking_slot_start: formData.booking_slot_start ? new Date(formData.booking_slot_start).toISOString() : null,
        booking_slot_end: formData.booking_slot_end ? new Date(formData.booking_slot_end).toISOString() : null,
        status: formData.status,
        metadata: meta
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
          toast.success('Item added to AI operations brain')
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
    if (!confirm(`Delete "${title}" from AI operations brain?`)) return

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

  // Parse CSV File in Browser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = evt => {
      const text = evt.target?.result as string
      if (!text) return

      try {
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
        if (lines.length < 2) {
          toast.error('CSV file has no data rows')
          return
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
        const parsed: any[] = []

        for (let i = 1; i < lines.length; i++) {
          const rowVals = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
          if (rowVals.length === 0 || !rowVals[0]) continue

          const rowObj: Record<string, any> = {}
          headers.forEach((h, idx) => {
            rowObj[h] = rowVals[idx] || ''
          })

          const title = rowObj.title || rowObj.name || rowObj.item || rowObj.route || `Item ${i}`
          parsed.push({
            title,
            category: rowObj.category || 'general',
            identifier_code: rowObj.code || rowObj.identifier_code || rowObj.sku || null,
            route_origin: rowObj.origin || rowObj.from || rowObj.route_origin || null,
            route_destination: rowObj.destination || rowObj.to || rowObj.route_destination || null,
            available_units: Number(rowObj.units || rowObj.qty || rowObj.available_units || 1) || 1,
            base_price_inr: rowObj.price || rowObj.rate || rowObj.base_price_inr ? Number(rowObj.price || rowObj.rate || rowObj.base_price_inr) : null,
            minimum_price_inr: rowObj.min_price || rowObj.floor || rowObj.minimum_price_inr ? Number(rowObj.min_price || rowObj.floor || rowObj.minimum_price_inr) : null,
            status: rowObj.status || 'available'
          })
        }

        setParsedImportRows(parsed)
        toast.success(`Parsed ${parsed.length} items from CSV file`)
      } catch (parseErr) {
        console.error('CSV parse error:', parseErr)
        toast.error('Failed to parse CSV file. Ensure valid comma-separated format.')
      }
    }
    reader.readAsText(file)
  }

  const handleBulkImportSave = async () => {
    if (parsedImportRows.length === 0) {
      toast.error('No items to import')
      return
    }

    try {
      setImporting(true)
      const res = await fetch('/api/business-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedImportRows)
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Successfully imported ${parsedImportRows.length} items to AI brain!`)
        setIsImportModalOpen(false)
        setParsedImportRows([])
        fetchItems()
      } else {
        toast.error(json.error || 'Failed to import items')
      }
    } catch (err) {
      console.error('Import error:', err)
      toast.error('Error importing items')
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadSampleCsv = (category: string) => {
    let csvContent = ''
    if (category === 'logistics') {
      csvContent = 'title,category,identifier_code,origin,destination,units,price,min_price,status\n' +
        'Delhi to Mumbai 32ft MX Truck,logistics,TRK-DL-MUM,Delhi,Mumbai,3,46000,42000,available\n' +
        'Ahmedabad to Pune 20ft Container,logistics,TRK-AHM-PUN,Ahmedabad,Pune,2,32000,29000,available\n'
    } else if (category === 'appointment_slots') {
      csvContent = 'title,category,identifier_code,units,price,min_price,status\n' +
        'Dr. Sharma General Consultation,appointment_slots,APT-DRS-01,5,800,800,available\n' +
        'Dental Root Canal Evaluation,appointment_slots,APT-DEN-02,3,1500,1200,available\n'
    } else if (category === 'inventory') {
      csvContent = 'title,category,identifier_code,units,price,min_price,status\n' +
        'Solar Inverter 5kVA Pro,inventory,INV-5KVA,12,48000,44000,available\n' +
        'Lithium Iron Battery 48V,inventory,BAT-48V-100AH,8,65000,59000,available\n'
    } else {
      csvContent = 'title,category,identifier_code,units,price,min_price,status\n' +
        '3BHK Luxury Apartment Inspection,general,PROP-3BHK-01,1,8500000,8200000,available\n' +
        'Corporate Annual Audit Package,general,SRV-AUD-2026,4,25000,20000,available\n'
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `sample_${category}_catalog.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Downloaded sample CSV template for ${category}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Available
          </span>
        )
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Reserved
          </span>
        )
      case 'booked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Boxes className="w-3.5 h-3.5" /> Booked
          </span>
        )
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Truck className="w-3.5 h-3.5" /> In Transit
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
            {status}
          </span>
        )
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'logistics':
        return <Truck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
      case 'containers':
        return <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      case 'appointment_slots':
        return <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      case 'inventory':
        return <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      default:
        return <SlidersHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 md:py-4 font-montserrat text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--heading)] font-display uppercase tracking-wider">
            Live Operations Brain
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 max-w-2xl">
            Manage real-time operational catalog, services, daily inventory, and pricing floor limits referenced live by your voice agents during calls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-start sm:self-center">
          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--body)] transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-4 h-4" /> Import Excel / CSV
          </button>

          <button
            onClick={() => handleOpenAdd(selectedCategory)}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Operations Item
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-x-auto max-w-full shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const active = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm'
                    : 'text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search route, item or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer shadow-sm"
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
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-medium">Loading live operational catalog...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-8 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-bg)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center mx-auto">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--heading)]">No catalog items found</h3>
            <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
              Add your business offerings (routes, consultation slots, product catalogs, or custom properties) so the AI agent can fetch live data and negotiate within your limits during calls.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleOpenAdd(selectedCategory)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Import Excel / CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const meta = item.metadata || {}
            return (
              <div
                key={item.id}
                className="bg-[var(--card-bg)] hover:border-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-5 shadow-sm transition-all space-y-4 flex flex-col justify-between text-left"
              >
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)]">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--heading)] line-clamp-1">{item.title}</h3>
                        {item.identifier_code && (
                          <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--hover-bg)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                            {item.identifier_code}
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  {/* Route Information - ONLY FOR LOGISTICS */}
                  {item.category === 'logistics' && (item.route_origin || item.route_destination) && (
                    <div className="flex items-center gap-2 text-xs bg-[var(--hover-bg)] p-2.5 rounded-xl border border-[var(--border)] text-[var(--heading)]">
                      <span className="font-semibold">{item.route_origin || 'Any Origin'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span className="font-semibold">{item.route_destination || 'Any Destination'}</span>
                    </div>
                  )}

                  {/* Container Details */}
                  {item.category === 'containers' && (meta.container_size || meta.yard_location) && (
                    <div className="text-xs bg-[var(--hover-bg)] p-2.5 rounded-xl border border-[var(--border)] text-[var(--heading)] space-y-1">
                      {meta.container_size && (
                        <div><span className="text-[var(--muted)]">Size/Type:</span> <span className="font-semibold">{meta.container_size}</span></div>
                      )}
                      {meta.yard_location && (
                        <div><span className="text-[var(--muted)]">Port/Yard:</span> <span className="font-semibold">{meta.yard_location}</span></div>
                      )}
                    </div>
                  )}

                  {/* Specialist / Clinic Details */}
                  {item.category === 'appointment_slots' && meta.specialist_name && (
                    <div className="text-xs bg-[var(--hover-bg)] p-2 rounded-xl border border-[var(--border)] text-[var(--heading)]">
                      <span className="text-[var(--muted)]">Doctor/Specialist:</span> <span className="font-semibold">{meta.specialist_name}</span>
                    </div>
                  )}

                  {/* Custom Attributes for General / Universal */}
                  {meta.custom_attributes && Object.keys(meta.custom_attributes).length > 0 && (
                    <div className="text-xs bg-[var(--hover-bg)] p-2.5 rounded-xl border border-[var(--border)] space-y-1">
                      {Object.entries(meta.custom_attributes).slice(0, 3).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[11px]">
                          <span className="text-[var(--muted)]">{k}:</span>
                          <span className="font-semibold text-[var(--heading)]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Units & Slot times */}
                  <div className="flex items-center justify-between text-xs text-[var(--muted)] pt-1">
                    <span>Available Capacity:</span>
                    <span className="font-bold text-[var(--heading)] font-mono">{item.available_units} units</span>
                  </div>

                  {item.booking_slot_start && (
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>Booking Slot:</span>
                      <span className="text-[var(--heading)] font-mono text-[11px] font-medium">
                        {new Date(item.booking_slot_start).toLocaleDateString()} {new Date(item.booking_slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Negotiation Pricing Box */}
                  {(item.base_price_inr !== null || item.minimum_price_inr !== null) && (
                    <div className="p-3 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--muted)]">Quoted Price:</span>
                        <span className="font-bold text-[var(--heading)] font-mono">
                          {item.base_price_inr !== null ? `₹${item.base_price_inr.toLocaleString('en-IN')}` : 'Variable'}
                        </span>
                      </div>
                      {item.minimum_price_inr !== null && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border)]">
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                            <TrendingDown className="w-3.5 h-3.5" /> AI Floor Price:
                          </span>
                          <span className="font-bold text-amber-600 dark:text-amber-300 font-mono">
                            ₹{item.minimum_price_inr.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <span className="text-[11px] text-[var(--muted)]">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--body)] transition-colors cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal with Adaptive Fields */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <h2 className="text-lg font-bold text-[var(--heading)] flex items-center gap-2 font-display uppercase tracking-wider">
                <Boxes className="w-5 h-5 text-[var(--accent)]" />
                {editingItem ? 'Edit Operations Item' : 'Add Item to AI Brain'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-[var(--heading)]">Business Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer shadow-sm"
                  >
                    <option value="logistics">🚚 Logistics & Transport (Routes & Trucks)</option>
                    <option value="containers">📦 Containers & Yard Fleet (20ft, 40ft, Reefers)</option>
                    <option value="appointment_slots">🩺 Appointments & Doctor/Clinic Booking Slots</option>
                    <option value="inventory">🏷️ Products, Inventory & E-Commerce Items</option>
                    <option value="general">⚙️ Universal / Other Business Brain (Custom Fields)</option>
                  </select>
                </div>

                {/* Common Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-[var(--heading)]">
                    {formData.category === 'logistics' && 'Route / Freight Load Title *'}
                    {formData.category === 'containers' && 'Container Unit / Package Title *'}
                    {formData.category === 'appointment_slots' && 'Service / Consultation Slot Title *'}
                    {formData.category === 'inventory' && 'Product / Item Name *'}
                    {formData.category === 'general' && 'Business Offering / Service Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formData.category === 'logistics'
                        ? 'e.g., Delhi to Mumbai 32ft MX Container Truck'
                        : formData.category === 'appointment_slots'
                        ? 'e.g., Dr. Sharma Senior Physician Consultation'
                        : formData.category === 'inventory'
                        ? 'e.g., 5kVA Solar Inverter Pure Sine'
                        : 'e.g., 3BHK Luxury Villa Inspection or Service'
                    }
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                  />
                </div>

                {/* Common Identifier / Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--heading)]">
                    {formData.category === 'inventory' ? 'SKU / Barcode' : 'Reference Code / ID'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., DL-MUM-01 or SKU-9821"
                    value={formData.identifier_code}
                    onChange={e => setFormData({ ...formData, identifier_code: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono shadow-sm"
                  />
                </div>

                {/* Common Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--heading)]">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer shadow-sm"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="booked">Booked</option>
                    <option value="in_transit">In Transit</option>
                  </select>
                </div>

                {/* --- ADAPTIVE SECTION: LOGISTICS ONLY --- */}
                {formData.category === 'logistics' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--heading)]">Route Origin City</label>
                      <input
                        type="text"
                        placeholder="e.g., Delhi NCR"
                        value={formData.route_origin}
                        onChange={e => setFormData({ ...formData, route_origin: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--heading)]">Route Destination City</label>
                      <input
                        type="text"
                        placeholder="e.g., Mumbai JNPT"
                        value={formData.route_destination}
                        onChange={e => setFormData({ ...formData, route_destination: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-[var(--heading)]">Vehicle / Load Type</label>
                      <input
                        type="text"
                        placeholder="e.g., 32ft Multi-Axle Container, 20ft Open Truck, 40ft Trailer"
                        value={formData.vehicle_type}
                        onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                      />
                    </div>
                  </>
                )}

                {/* --- ADAPTIVE SECTION: CONTAINERS ONLY --- */}
                {formData.category === 'containers' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--heading)]">Container Size & Type</label>
                      <input
                        type="text"
                        placeholder="e.g., 20ft Dry Cargo, 40ft High Cube, Reefer"
                        value={formData.container_size}
                        onChange={e => setFormData({ ...formData, container_size: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--heading)]">Port / Depot Yard Location</label>
                      <input
                        type="text"
                        placeholder="e.g., JNPT Nhava Sheva / Mundra Port"
                        value={formData.yard_location}
                        onChange={e => setFormData({ ...formData, yard_location: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                      />
                    </div>
                  </>
                )}

                {/* --- ADAPTIVE SECTION: APPOINTMENTS ONLY --- */}
                {formData.category === 'appointment_slots' && (
                  <>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-[var(--heading)]">Doctor / Specialist / Staff Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Dr. Ajay Sharma (Senior Cardiologist)"
                        value={formData.specialist_name}
                        onChange={e => setFormData({ ...formData, specialist_name: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--heading)]">Slot Start Time</label>
                      <input
                        type="datetime-local"
                        value={formData.booking_slot_start}
                        onChange={e => setFormData({ ...formData, booking_slot_start: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--heading)]">Slot End Time</label>
                      <input
                        type="datetime-local"
                        value={formData.booking_slot_end}
                        onChange={e => setFormData({ ...formData, booking_slot_end: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                      />
                    </div>
                  </>
                )}

                {/* --- ADAPTIVE SECTION: INVENTORY / PRODUCTS ONLY --- */}
                {formData.category === 'inventory' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-[var(--heading)]">Department / Brand / Category</label>
                    <input
                      type="text"
                      placeholder="e.g., Electronics / Renewable Power / Hardware"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
                    />
                  </div>
                )}

                {/* --- ADAPTIVE SECTION: GENERAL BUSINESS (DYNAMIC CUSTOM KEY-VALUES) --- */}
                {formData.category === 'general' && (
                  <div className="space-y-2 sm:col-span-2 pt-1 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[var(--heading)] flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" /> Custom Business Attributes
                      </label>
                      <button
                        type="button"
                        onClick={handleAddCustomAttribute}
                        className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Attribute
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Add any custom detail for your business (e.g. Property Type, Area, Delivery Time, Warranty). The AI reads all of them live.
                    </p>

                    <div className="space-y-2 pt-1">
                      {customAttributes.map((attr, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Attribute Name (e.g. Area, Facing, Warranty)"
                            value={attr.key}
                            onChange={e => handleCustomAttributeChange(idx, 'key', e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-xs text-[var(--heading)] placeholder:text-[var(--muted)] shadow-sm"
                          />
                          <input
                            type="text"
                            placeholder="Value (e.g. 1500 sq ft, 2 Years)"
                            value={attr.value}
                            onChange={e => handleCustomAttributeChange(idx, 'value', e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-xs text-[var(--heading)] placeholder:text-[var(--muted)] shadow-sm"
                          />
                          {customAttributes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomAttribute(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Units */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--heading)]">Available Units / Capacity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.available_units}
                    onChange={e => setFormData({ ...formData, available_units: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono shadow-sm"
                  />
                </div>

                {/* Common Base Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--heading)]">Base Quoted Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 45000"
                    value={formData.base_price_inr}
                    onChange={e => setFormData({ ...formData, base_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono shadow-sm"
                  />
                  <p className="text-[10px] text-[var(--muted)]">Initial rate quoted by the voice bot.</p>
                </div>

                {/* Common Minimum Price Floor */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Strict Negotiation Floor Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 41000"
                    value={formData.minimum_price_inr}
                    onChange={e => setFormData({ ...formData, minimum_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-amber-500/5 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono shadow-sm"
                  />
                  <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                    The bot will NEVER negotiate below this floor under any circumstance.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-xs font-semibold text-[var(--body)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to AI Brain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV / Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <h2 className="text-lg font-bold text-[var(--heading)] flex items-center gap-2 font-display uppercase tracking-wider">
                <FileSpreadsheet className="w-5 h-5 text-[var(--accent)]" />
                Import Excel / CSV to AI Operations Brain
              </h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false)
                  setParsedImportRows([])
                }}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[var(--muted)]">
                Upload your rate card, container stock, doctor schedule, or inventory spreadsheet. The AI will parse the rows and index them directly into the live call brain.
              </p>

              {/* Sample Templates */}
              <div className="p-4 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--heading)] flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[var(--accent)]" /> Download Sample CSV Templates
                </span>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleCsv('logistics')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[11px] font-semibold text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
                  >
                    🚚 Logistics & Freight Template
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleCsv('appointment_slots')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[11px] font-semibold text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
                  >
                    🩺 Clinic & Doctor Template
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleCsv('inventory')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[11px] font-semibold text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
                  >
                    🏷️ Product Catalog Template
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleCsv('general')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[11px] font-semibold text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
                  >
                    ⚙️ Universal Business Template
                  </button>
                </div>
              </div>

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-2xl p-8 text-center space-y-3 cursor-pointer transition-colors bg-[var(--hover-bg)]"
              >
                <Upload className="w-8 h-8 text-[var(--accent)] mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[var(--heading)]">Click to choose a CSV file or drag and drop</p>
                  <p className="text-[11px] text-[var(--muted)]">Supports .csv rate sheets and catalogs</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Parsed Rows Preview */}
              {parsedImportRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--heading)]">
                      Preview ({parsedImportRows.length} items parsed)
                    </span>
                    <button
                      onClick={() => setParsedImportRows([])}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] text-xs">
                    {parsedImportRows.slice(0, 10).map((row, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-3 bg-[var(--card-bg)]">
                        <div className="truncate">
                          <span className="font-bold text-[var(--heading)]">{row.title}</span>
                          <span className="text-[11px] text-[var(--muted)] ml-2">({row.category})</span>
                          {row.route_origin && (
                            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 ml-2">
                              {row.route_origin} → {row.route_destination}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs font-semibold text-[var(--heading)] whitespace-nowrap">
                          {row.base_price_inr ? `₹${row.base_price_inr}` : '-'}
                          {row.minimum_price_inr && (
                            <span className="text-amber-600 dark:text-amber-400 text-[10px] ml-1.5">
                              (Floor: ₹{row.minimum_price_inr})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {parsedImportRows.length > 10 && (
                      <div className="p-2 text-center text-[11px] text-[var(--muted)] bg-[var(--hover-bg)] font-medium">
                        + {parsedImportRows.length - 10} more rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false)
                  setParsedImportRows([])
                }}
                className="px-4 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-xs font-semibold text-[var(--body)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing || parsedImportRows.length === 0}
                onClick={handleBulkImportSave}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {importing ? 'Importing to Brain...' : `Import ${parsedImportRows.length} Items to Brain`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
