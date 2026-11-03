'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Boxes,
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
  FileText,
  SlidersHorizontal,
  Mic,
  MicOff,
  Zap,
  ShieldCheck,
  Building2,
  Check,
  Loader2,
  Brain
} from 'lucide-react'
import { toast } from 'sonner'

interface OperationsItem {
  id: string
  title: string
  identifier_code: string | null
  category: 'logistics' | 'containers' | 'appointment_slots' | 'inventory' | 'general' | 'voice_directive'
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
  { id: 'all', label: 'All Knowledge & Offerings', icon: Boxes },
  { id: 'appointment_slots', label: 'Appointments & Slots', icon: Calendar },
  { id: 'inventory', label: 'Products & Services', icon: Package },
  { id: 'logistics', label: 'Routes & Transport', icon: Building2 },
  { id: 'containers', label: 'Fleet & Assets', icon: Layers },
  { id: 'general', label: 'Universal / Custom Rules', icon: SlidersHorizontal }
]

const QUICK_VOICE_PROMPTS = [
  {
    label: 'Salon / Clinic Timings',
    text: 'Aaj mai 10 baje se 4 bje tak salon open rakhunga to us time ke according he appointments lena'
  },
  {
    label: 'Store Closed / Reschedule',
    text: 'Aaj mai shop close rakhunga so aaj ki saari appointment kal schedule karo aur us hisab se karna'
  },
  {
    label: 'Logistics / Fleet Update',
    text: 'Aaj mere paas koi gaadi nahi hai par products available hai to aur koi product mat lena sirf gadi ki jarurat hai'
  },
  {
    label: 'Urgent Discount / Offer',
    text: 'Aaj sabhi haircut aur facials par 20% discount offer karo aur minimum price limit strict rakhna'
  }
]

export default function OperationsBrainPage() {
  const [items, setItems] = useState<OperationsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OperationsItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Document Ingest State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isIngestingDocs, setIsIngestingDocs] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Voice to Brain State
  const [isRecording, setIsRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Dynamic Custom Key-Values for General category
  const [customAttributes, setCustomAttributes] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' }
  ])

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    identifier_code: '',
    category: 'general',
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

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/business-catalog')
      const json = await res.json()
      if (json.success && json.data) {
        setItems(json.data.items || [])
      } else {
        toast.error('Failed to load operations brain')
      }
    } catch (err) {
      console.error('Failed to load items:', err)
      toast.error('Network error loading operations brain')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // Separate Active Voice Directives from Catalog items
  const activeVoiceDirectives = useMemo(() => {
    return items.filter(i => i.category === 'voice_directive')
  }, [items])

  const catalogItems = useMemo(() => {
    return items.filter(i => i.category !== 'voice_directive')
  }, [items])

  // Filtered Catalog Items
  const filteredItems = useMemo(() => {
    return catalogItems.filter(item => {
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
  }, [catalogItems, searchQuery, selectedCategory, statusFilter])

  // Universal Summary Metrics (clean monochrome numbers)
  const totalCatalogItems = catalogItems.length
  const totalUnitsCapacity = catalogItems.reduce((acc, curr) => acc + (curr.available_units || 0), 0)
  const itemsWithPricingFloor = catalogItems.filter(i => i.minimum_price_inr !== null && i.minimum_price_inr > 0).length
  const activeDirectivesCount = activeVoiceDirectives.filter(i => i.status === 'available').length

  // Voice Recognition Controls
  const startVoiceRecording = () => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser. Please type your directive.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'hi-IN'

      recognition.onstart = () => {
        setIsRecording(true)
        toast.info('Listening... Speak your operational instructions.')
      }

      recognition.onresult = (event: any) => {
        let currentTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' '
        }
        setVoiceTranscript(currentTranscript.trim())
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error)
        if (event.error !== 'no-speech') {
          toast.error(`Mic error: ${event.error}`)
        }
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err)
      toast.error('Could not access microphone')
      setIsRecording(false)
    }
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const handleApplyVoiceDirective = async () => {
    if (!voiceTranscript.trim()) {
      toast.error('Please speak or type an operational instruction first')
      return
    }

    try {
      setIsProcessingVoice(true)
      const res = await fetch('/api/business-catalog/voice-directive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: voiceTranscript.trim() })
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Spoken directive applied to Brain! Live agents will follow this rule.')
        setVoiceTranscript('')
        setIsVoiceModalOpen(false)
        fetchItems()
      } else {
        toast.error(json.error || 'Failed to apply voice directive')
      }
    } catch (err: any) {
      console.error('Voice directive error:', err)
      toast.error('Network error processing voice directive')
    } finally {
      setIsProcessingVoice(false)
    }
  }

  const handleToggleVoiceDirective = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'available' ? false : true
      const res = await fetch('/api/business-catalog/voice-directive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: newStatus })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(newStatus ? 'Directive activated' : 'Directive paused')
        fetchItems()
      } else {
        toast.error(json.error || 'Failed to update directive')
      }
    } catch (err) {
      toast.error('Failed to toggle directive')
    }
  }

  // Multi-Document Ingest
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files)
    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleIngestDocuments = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select at least one document to upload')
      return
    }

    try {
      setIsIngestingDocs(true)
      const formDataUpload = new FormData()
      uploadedFiles.forEach(file => {
        formDataUpload.append('files', file)
      })

      const res = await fetch('/api/business-catalog/ingest-document', {
        method: 'POST',
        body: formDataUpload
      })

      const json = await res.json()
      if (json.success) {
        toast.success(`AI successfully extracted & saved ${json.data.count} items into the brain!`)
        setUploadedFiles([])
        setIsDocumentModalOpen(false)
        fetchItems()
      } else {
        toast.error(json.error || 'Failed to parse documents')
      }
    } catch (err: any) {
      console.error('Document ingestion error:', err)
      toast.error('Error uploading and processing documents')
    } finally {
      setIsIngestingDocs(false)
    }
  }

  // Manual Add/Edit
  const handleOpenAdd = (defaultCat?: string) => {
    setEditingItem(null)
    const cat = defaultCat && defaultCat !== 'all' ? defaultCat : 'general'
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

    const customList: { key: string; value: string }[] = []
    if (meta.custom_attributes && typeof meta.custom_attributes === 'object') {
      Object.entries(meta.custom_attributes).forEach(([k, v]) => {
        customList.push({ key: k, value: String(v) })
      })
    }
    setCustomAttributes(customList.length > 0 ? customList : [{ key: '', value: '' }])
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
      toast.error('Failed to delete item')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--hover-bg)] text-[var(--heading)] border border-[var(--border)]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active
          </span>
        )
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]">
            <Clock className="w-3.5 h-3.5" /> Paused
          </span>
        )
      case 'booked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--hover-bg)] text-[var(--heading)] border border-[var(--border)]">
            <Boxes className="w-3.5 h-3.5" /> Booked
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]">
            {status}
          </span>
        )
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appointment_slots':
        return <Calendar className="w-4 h-4 text-[var(--muted)]" />
      case 'inventory':
        return <Package className="w-4 h-4 text-[var(--muted)]" />
      case 'logistics':
        return <Building2 className="w-4 h-4 text-[var(--muted)]" />
      case 'containers':
        return <Layers className="w-4 h-4 text-[var(--muted)]" />
      case 'voice_directive':
        return <Mic className="w-4 h-4 text-[var(--muted)]" />
      default:
        return <SlidersHorizontal className="w-4 h-4 text-[var(--muted)]" />
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 md:py-4 font-montserrat text-left">
      {/* Universal Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--heading)] tracking-tight">
            Operations & Knowledge Brain
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1.5 max-w-2xl leading-relaxed">
            Universal real-time knowledge base, catalog items, and daily voice directives referenced live by your AI voice agents during customer calls.
          </p>
        </div>

        {/* Action Controls with Luxury Monochrome Theme (No Purple) */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 self-stretch sm:self-auto">
          {/* Speak to Brain Button */}
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Speak to Brain</span>
          </button>

          {/* Upload Documents Button */}
          <button
            onClick={() => setIsDocumentModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs tracking-wide transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[var(--muted)]" />
            <span>Upload Documents</span>
          </button>

          {/* Add Item Button */}
          <button
            onClick={() => handleOpenAdd(selectedCategory)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs tracking-wide rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[var(--muted)]" />
            <span>Add Item</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--heading)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards (Monochrome Theme, No Multi-Colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>Live Catalog Offerings</span>
            <Boxes className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--heading)] font-mono">{totalCatalogItems}</p>
          <p className="text-[11px] text-[var(--muted)]">Active knowledge items indexed for voice agents</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>Spoken Voice Directives</span>
            <Mic className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--heading)] font-mono">{activeDirectivesCount}</p>
          <p className="text-[11px] text-[var(--muted)]">Daily owner speech overrides currently live</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>Total Units / Capacity</span>
            <Layers className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--heading)] font-mono">{totalUnitsCapacity}</p>
          <p className="text-[11px] text-[var(--muted)]">Bookable appointment slots or product inventory</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>Pricing Guardrails</span>
            <ShieldCheck className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--heading)] font-mono">{itemsWithPricingFloor}</p>
          <p className="text-[11px] text-[var(--muted)]">Offerings with strict AI floor limits enforced</p>
        </div>
      </div>

      {/* Active Voice Directives Section (Clean Monochrome Theme) */}
      {activeVoiceDirectives.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-[var(--muted)]" />
              <h3 className="text-sm font-bold text-[var(--heading)]">
                Active Spoken Voice Directives & Daily Overrides
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]">
                Live in Call Prompt
              </span>
            </div>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="text-xs text-[var(--heading)] hover:text-zinc-950 dark:hover:text-white font-semibold underline underline-offset-4 inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Voice Rule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeVoiceDirectives.map(directive => {
              const meta = directive.metadata || {}
              const isActive = directive.status === 'available'
              return (
                <div
                  key={directive.id}
                  className="p-3.5 rounded-xl bg-[var(--hover-bg)]/50 border border-[var(--border)] shadow-xs flex items-start justify-between gap-3 text-left"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--heading)]">{directive.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isActive
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                            : 'bg-[var(--card-bg)] text-[var(--muted)] border border-[var(--border)]'
                        }`}
                      >
                        {isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    {meta.voice_transcript && (
                      <p className="text-xs text-[var(--muted)] italic">
                        &quot;{meta.voice_transcript}&quot;
                      </p>
                    )}
                    {meta.prompt_override && (
                      <p className="text-[11px] text-[var(--heading)] font-mono bg-[var(--card-bg)] p-1.5 rounded-lg border border-[var(--border)] mt-1">
                        Agent Directive: {meta.prompt_override}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleVoiceDirective(directive.id, directive.status)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] cursor-pointer text-xs font-semibold shadow-xs"
                      title={isActive ? 'Pause rule' : 'Activate rule'}
                    >
                      {isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(directive.id, directive.title)}
                      className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete directive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-x-auto max-w-full shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full md:w-auto">
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
                <Icon className="w-3.5 h-3.5 text-[var(--muted)]" />
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
              placeholder="Search catalog, item or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 shadow-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 cursor-pointer shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="available">Active / Available</option>
            <option value="reserved">Reserved / Paused</option>
            <option value="booked">Booked</option>
          </select>
        </div>
      </div>

      {/* Main Catalog Items Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--heading)]" />
          <p className="text-sm font-medium">Loading live operations brain...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-8 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] flex items-center justify-center mx-auto">
            <Brain className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--heading)]">Operations Brain is Ready</h3>
            <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
              Upload your price list, product catalog, or appointment schedule, or simply speak into the mic to automatically build your business brain.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" /> Speak to Brain
            </button>
            <button
              onClick={() => setIsDocumentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs cursor-pointer shadow-sm transition-all"
            >
              <Upload className="w-4 h-4 text-[var(--muted)]" /> Upload Documents
            </button>
            <button
              onClick={() => handleOpenAdd(selectedCategory)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[var(--muted)]" /> Add Manually
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

                  {/* Route Information (if applicable) */}
                  {(item.route_origin || item.route_destination) && (
                    <div className="flex items-center gap-2 text-xs bg-[var(--hover-bg)] p-2.5 rounded-xl border border-[var(--border)] text-[var(--heading)]">
                      <span className="font-semibold">{item.route_origin || 'Origin'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span className="font-semibold">{item.route_destination || 'Destination'}</span>
                    </div>
                  )}

                  {/* Doctor/Specialist details */}
                  {meta.specialist_name && (
                    <div className="text-xs bg-[var(--hover-bg)] p-2 rounded-xl border border-[var(--border)] text-[var(--heading)]">
                      <span className="text-[var(--muted)]">Practitioner / Specialist:</span>{' '}
                      <span className="font-semibold">{meta.specialist_name}</span>
                    </div>
                  )}

                  {/* Description / Ingestion Note */}
                  {meta.description && (
                    <p className="text-xs text-[var(--muted)] line-clamp-2">
                      {meta.description}
                    </p>
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

                  {/* Pricing Box (Clean Neutral Theme) */}
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
                          <span className="text-[var(--heading)] flex items-center gap-1 font-semibold">
                            <TrendingDown className="w-3.5 h-3.5 text-[var(--muted)]" /> AI Floor Price:
                          </span>
                          <span className="font-bold text-[var(--heading)] font-mono">
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
                      className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
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

      {/* MODAL 1: SPEAK & BUILD THE BRAIN (Zero Purple, Clean Zinc/Monochrome) */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)]">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--heading)]">Speak & Build the Brain</h3>
                  <p className="text-xs text-[var(--muted)]">Speak your business rules in Hindi, Hinglish, or English</p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopVoiceRecording()
                  setIsVoiceModalOpen(false)
                }}
                className="p-2 rounded-full hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mic Status */}
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                  isRecording
                    ? 'bg-zinc-950 text-white ring-4 ring-zinc-500/20 animate-pulse'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              <p className="text-xs font-semibold text-[var(--heading)]">
                {isRecording ? 'Listening... Tap to stop' : 'Tap to start speaking'}
              </p>
            </div>

            {/* Transcript Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--heading)]">
                Spoken Operational Instruction:
              </label>
              <textarea
                rows={3}
                value={voiceTranscript}
                onChange={e => setVoiceTranscript(e.target.value)}
                placeholder='e.g., "Aaj mai 10 baje se 4 bje tak salon open rakhunga to us time ke according he appointments lena"'
                className="w-full p-3 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
            </div>

            {/* Quick Scenario Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                Quick Example Directives:
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_VOICE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setVoiceTranscript(prompt.text)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--heading)] border border-[var(--border)] transition-colors cursor-pointer"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  stopVoiceRecording()
                  setIsVoiceModalOpen(false)
                }}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--body)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyVoiceDirective}
                disabled={isProcessingVoice || !voiceTranscript.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isProcessingVoice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing with AI...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Apply to Brain & Live Agents
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MULTI-DOCUMENT INGESTION (Zero Purple, Clean Zinc/Monochrome) */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--heading)]">Upload Documents to Brain</h3>
                  <p className="text-xs text-[var(--muted)]">Upload PDFs, Excel sheets, Word docs, or CSVs</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocumentModalOpen(false)}
                className="p-2 rounded-full hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors bg-[var(--hover-bg)]/40 hover:bg-[var(--hover-bg)]"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.docx,.txt"
                className="hidden"
                onChange={handleFilesSelected}
              />
              <div className="w-12 h-12 rounded-2xl bg-[var(--hover-bg)] text-[var(--heading)] flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-6 h-6 text-[var(--muted)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--heading)]">
                Click or drop business files here
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Upload price lists, product catalogs, service menus, or appointment slots (.xlsx, .csv, .pdf, .docx)
              </p>
            </div>

            {/* Uploaded Files Queue */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[var(--heading)]">
                  Selected Files ({uploadedFiles.length}):
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-xs text-[var(--heading)]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-[var(--muted)] shrink-0" />
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-[10px] text-[var(--muted)] font-mono shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 rounded border border-[var(--border)] hover:bg-red-500/10 text-zinc-400 hover:text-red-500 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsDocumentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--body)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIngestDocuments}
                disabled={isIngestingDocs || uploadedFiles.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isIngestingDocs ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Ingesting & Building Brain...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Extract & Build Brain
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MANUAL ADD / EDIT OPERATION ITEM (Zero Purple, Clean Zinc/Monochrome) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)]">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--heading)]">
                    {editingItem ? 'Edit Brain Item' : 'Add Item to Operations Brain'}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">Configure real-time capacity and negotiation limits</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-[var(--heading)]">Item / Service Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Hair Spa & Styling, Full Body Health Checkup, Mumbai-Delhi Express"
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--heading)]">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 cursor-pointer"
                  >
                    <option value="general">Universal / Other Business</option>
                    <option value="appointment_slots">Appointments & Slots</option>
                    <option value="inventory">Products & Inventory</option>
                    <option value="logistics">Routes & Transport</option>
                    <option value="containers">Fleet & Assets</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--heading)]">Identifier Code / SKU</label>
                  <input
                    type="text"
                    value={formData.identifier_code}
                    onChange={e => setFormData({ ...formData, identifier_code: e.target.value })}
                    placeholder="e.g. SRV-01, SKU-101"
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--heading)]">Available Units / Capacity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.available_units}
                    onChange={e => setFormData({ ...formData, available_units: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--heading)]">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 cursor-pointer"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved / Paused</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>

                {/* Quoted and Floor Pricing */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--heading)]">Quoted Base Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={formData.base_price_inr}
                    onChange={e => setFormData({ ...formData, base_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--heading)]">Strict AI Floor Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1200 (Agent never quotes lower)"
                    value={formData.minimum_price_inr}
                    onChange={e => setFormData({ ...formData, minimum_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                  />
                </div>

                {/* Slot start/end (Appointments) */}
                {formData.category === 'appointment_slots' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--heading)]">Slot Start</label>
                      <input
                        type="datetime-local"
                        value={formData.booking_slot_start}
                        onChange={e => setFormData({ ...formData, booking_slot_start: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--heading)]">Slot End</label>
                      <input
                        type="datetime-local"
                        value={formData.booking_slot_end}
                        onChange={e => setFormData({ ...formData, booking_slot_end: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                      />
                    </div>
                  </>
                )}

                {/* Logistics Origin / Destination */}
                {formData.category === 'logistics' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--heading)]">Route Origin</label>
                      <input
                        type="text"
                        placeholder="e.g. Delhi, Mumbai"
                        value={formData.route_origin}
                        onChange={e => setFormData({ ...formData, route_origin: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--heading)]">Route Destination</label>
                      <input
                        type="text"
                        placeholder="e.g. Bangalore, Pune"
                        value={formData.route_destination}
                        onChange={e => setFormData({ ...formData, route_destination: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--heading)]">Description / Instructions</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notes for voice agents when talking to customers about this offering"
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--body)] hover:bg-[var(--hover-bg)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save Item
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
