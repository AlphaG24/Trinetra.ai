'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Brain,
  Mic,
  MicOff,
  Upload,
  Plus,
  RefreshCw,
  Trash2,
  FileText,
  Calendar,
  Package,
  Check,
  Loader2,
  X,
  FileSpreadsheet,
  Clock,
  PhoneCall,
  UserPlus,
  Coffee,
  Copy,
  ChevronLeft,
  ChevronRight,
  Download,
  Shield,
  Heart,
  Edit2,
  Boxes,
  IndianRupee,
  ShoppingCart,
  PhoneForwarded,
  UserCheck
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { toast } from 'sonner'

// Interfaces
interface DirectiveItem {
  id: string
  title: string
  category: string
  status: string
  created_at: string
  updated_at: string
  metadata: {
    prompt_override?: string
    voice_transcript?: string
    summary_hindi?: string
    action_type?: string
    is_active?: boolean
    [key: string]: any
  }
}

interface IngestedDocument {
  id: string
  name: string
  size: number
  type: string
  extractedSummary?: string
  uploadedAt: string
}

interface Appointment {
  id: string
  contact_name: string
  contact_phone: string
  scheduled_at: string
  duration_minutes?: number
  status: string
  meeting_type: string
  notes?: string
  booked_via?: string
}

interface ScheduleSlot {
  slotKey: string
  startTime: string
  endTime: string
  label: string
  isBooked: boolean
  isBreak: boolean
  appointment?: Appointment
}

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

interface FamilyVipContact {
  id: string
  title: string
  category: string
  identifier_code: string | null
  status: string
  metadata: {
    phone?: string
    relationship?: string
    auto_transfer?: boolean
    exclude_from_outbound?: boolean
    notes?: string
  }
}

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

export default function UnifiedOperationsBrainPage() {
  // Navigation Tabs inside Brain
  const [activeTab, setActiveTab] = useState<'directives' | 'schedule' | 'inventory' | 'transfer'>('directives')

  // Global Loading / Refresh
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // TAB 1: DIRECTIVES & KNOWLEDGE
  const [directives, setDirectives] = useState<DirectiveItem[]>([])
  const [documents, setDocuments] = useState<IngestedDocument[]>([])
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isIngestingDocs, setIsIngestingDocs] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [ruleTitle, setRuleTitle] = useState('')
  const [rulePrompt, setRulePrompt] = useState('')

  // TAB 2: LIVE APPOINTMENTS SCHEDULE SHEET
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [scheduleDate, setScheduleDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [breakSlots, setBreakSlots] = useState<Record<string, boolean>>({})
  const [quickBookSlot, setQuickBookSlot] = useState<ScheduleSlot | null>(null)
  const [manualClientName, setManualClientName] = useState('')
  const [manualClientPhone, setManualClientPhone] = useState('')
  const [manualService, setManualService] = useState('')
  const [bookingActionLoading, setBookingActionLoading] = useState(false)
  const [startHour, setStartHour] = useState(10)

  // TAB 3: LIVE PRODUCTS & INVENTORY SHEET
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryCategory, setInventoryCategory] = useState('all')
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<InventoryItem> & { initial_units?: number; sold_units?: number }>({})
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    title: '',
    identifier_code: '',
    category: 'inventory',
    base_price_inr: '',
    minimum_price_inr: '',
    initial_units: '10',
    sold_units: '0'
  })

  // TAB 4: CALL FORWARDING & FAMILY EXCLUSION
  const [ownerSecondaryPhone, setOwnerSecondaryPhone] = useState('')
  const [warmTransferEnabled, setWarmTransferEnabled] = useState(true)
  const [fallbackMessage, setFallbackMessage] = useState(
    'Raghav ji abhi dusri call mein vyast hain. Maine unhe aapka urgent message aur contact number WhatsApp par bhej diya hai, woh jald call back karenge.'
  )
  const [forwardingDocId, setForwardingDocId] = useState<string | null>(null)
  const [savingForwarding, setSavingForwarding] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyVipContact[]>([])
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false)
  const [familyForm, setFamilyForm] = useState({
    name: '',
    phone: '',
    relationship: 'Brother',
    notes: ''
  })
  const [savingFamily, setSavingFamily] = useState(false)

  // Initial Fetch
  const fetchAllBrainData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true)

      // Fetch all items from business_operations_catalog
      const catRes = await fetch('/api/business-catalog')
      const catJson = await catRes.json()

      if (catJson.success && catJson.data?.items) {
        const allItems = catJson.data.items as any[]

        // 1. Directives
        const voiceItems = allItems.filter(i => i.category === 'voice_directive')
        setDirectives(voiceItems)

        // Derive startHour from active directive if present
        const activeDir = voiceItems.find(i => i.status === 'available')
        if (activeDir?.metadata?.mutations?.slot_start) {
          const s = activeDir.metadata.mutations.slot_start
          if (s.includes('10')) setStartHour(10)
          else if (s.includes('11')) setStartHour(11)
          else if (s.includes('12')) setStartHour(12)
        }

        // 2. Inventory Items
        const invItems = allItems.filter(
          i => i.category !== 'voice_directive' && i.category !== 'call_forwarding' && i.category !== 'family_vip' && i.category !== 'appointment_slots'
        )
        setInventoryItems(invItems)

        // 3. Family / VIP List
        const famItems = allItems.filter(i => i.category === 'family_vip')
        setFamilyMembers(famItems)

        // 4. Call Forwarding Config
        const fwdConfig = allItems.find(i => i.category === 'call_forwarding')
        if (fwdConfig) {
          setForwardingDocId(fwdConfig.id)
          setOwnerSecondaryPhone(fwdConfig.metadata?.owner_secondary_phone || '')
          setWarmTransferEnabled(fwdConfig.metadata?.warm_transfer_enabled !== false)
          if (fwdConfig.metadata?.fallback_message) {
            setFallbackMessage(fwdConfig.metadata.fallback_message)
          }
        }
      }

      // Fetch Appointments
      const aptRes = await fetch('/api/appointments?status=all')
      const aptJson = await aptRes.json()
      if (aptJson.success && aptJson.data?.appointments) {
        setAppointments(aptJson.data.appointments)
      }
    } catch (err) {
      console.error('Failed to load operations brain data:', err)
      if (isManual) toast.error('Failed to refresh data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAllBrainData()

    // Load persisted docs from localStorage if any
    try {
      const savedDocs = localStorage.getItem('trinetra_ingested_docs')
      if (savedDocs) setDocuments(JSON.parse(savedDocs))
    } catch (_) {}

    // Live in-call auto-polling: Polls every 6s so in-call bookings & sales update live!
    const interval = setInterval(() => {
      fetchAllBrainData(false)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // -------------------------------------------------------------
  // TAB 1: DIRECTIVES & KNOWLEDGE ACTIONS
  // -------------------------------------------------------------
  const startRecording = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser. Please use Chrome or type your instruction.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'hi-IN'

      recognition.onstart = () => setIsRecording(true)
      recognition.onresult = (event: any) => {
        let fullTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' '
        }
        setVoiceTranscript(fullTranscript.trim())
      }
      recognition.onerror = () => setIsRecording(false)
      recognition.onend = () => setIsRecording(false)

      recognition.start()
      recognitionRef.current = recognition
    } catch (err) {
      toast.error('Could not activate microphone')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const handleApplyVoiceDirective = async () => {
    if (!voiceTranscript.trim()) {
      toast.error('Please speak or type an instruction first.')
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
        toast.success('Spoken instruction successfully added to Brain!')
        setIsVoiceModalOpen(false)
        setVoiceTranscript('')
        fetchAllBrainData()
      } else {
        toast.error(json.error || 'Failed to process voice directive')
      }
    } catch {
      toast.error('Network error processing voice directive')
    } finally {
      setIsProcessingVoice(false)
    }
  }

  const handleToggleDirective = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'available' ? 'reserved' : 'available'
    try {
      const res = await fetch('/api/business-catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(nextStatus === 'available' ? 'Directive activated for calls' : 'Directive paused')
        fetchAllBrainData()
      }
    } catch {
      toast.error('Failed to update directive status')
    }
  }

  const handleDeleteItem = async (id: string, msg: string) => {
    if (!confirm(`Are you sure you want to delete ${msg}?`)) return
    try {
      const res = await fetch(`/api/business-catalog?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success(`${msg} deleted`)
        fetchAllBrainData()
      }
    } catch {
      toast.error('Failed to delete item')
    }
  }

  const handleUploadAndProcessDocs = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select at least one document.')
      return
    }

    try {
      setIsIngestingDocs(true)
      const formData = new FormData()
      uploadedFiles.forEach(file => formData.append('files', file))

      const res = await fetch('/api/ingest', { method: 'POST', body: formData })
      const json = await res.json()

      if (json.success) {
        const newDocs: IngestedDocument[] = uploadedFiles.map(file => ({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          extractedSummary: 'Extracted key business knowledge, pricing limits, and operating rules.',
          uploadedAt: new Date().toISOString()
        }))

        const combined = [...newDocs, ...documents]
        setDocuments(combined)
        try {
          localStorage.setItem('trinetra_ingested_docs', JSON.stringify(combined))
        } catch (_) {}

        toast.success(`Extracted knowledge from ${uploadedFiles.length} file(s)!`)
        setIsDocumentModalOpen(false)
        setUploadedFiles([])
      } else {
        toast.error(json.error || 'Failed to extract documents')
      }
    } catch {
      toast.error('Network error during document ingest')
    } finally {
      setIsIngestingDocs(false)
    }
  }

  const handleDeleteDocument = (id: string) => {
    const updated = documents.filter(d => d.id !== id)
    setDocuments(updated)
    try {
      localStorage.setItem('trinetra_ingested_docs', JSON.stringify(updated))
    } catch (_) {}
    toast.success('Document reference removed')
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleTitle.trim() || !rulePrompt.trim()) {
      toast.error('Title and instruction are required')
      return
    }

    try {
      const res = await fetch('/api/business-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ruleTitle.trim(),
          category: 'voice_directive',
          status: 'available',
          metadata: {
            prompt_override: rulePrompt.trim(),
            action_type: 'rule_override',
            is_active: true
          }
        })
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Operating rule created')
        setIsRuleModalOpen(false)
        setRuleTitle('')
        setRulePrompt('')
        fetchAllBrainData()
      }
    } catch {
      toast.error('Network error creating rule')
    }
  }

  // -------------------------------------------------------------
  // TAB 2: SCHEDULE SHEET GENERATION & ACTIONS
  // -------------------------------------------------------------
  const scheduleSlots = useMemo(() => {
    const slots: ScheduleSlot[] = []
    const endHour = 19
    const start = Math.max(8, Math.min(startHour, 16))

    for (let h = start; h < endHour; h++) {
      for (const m of [0, 30]) {
        const startHStr = h.toString().padStart(2, '0')
        const startMStr = m.toString().padStart(2, '0')
        const nextM = m === 0 ? 30 : 0
        const nextH = m === 0 ? h : h + 1
        const endHStr = nextH.toString().padStart(2, '0')
        const endMStr = nextM.toString().padStart(2, '0')

        const startTime = `${startHStr}:${startMStr}`
        const endTime = `${endHStr}:${endMStr}`

        const format12 = (hour: number, min: number) => {
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const h12 = hour % 12 || 12
          return `${h12.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${ampm}`
        }

        const label = `${format12(h, m)} - ${format12(nextH, nextM)}`
        const slotKey = `${scheduleDate}_${startTime}`

        const apt = appointments.find(a => {
          if (a.status === 'cancelled' || a.status === 'rejected') return false
          try {
            const aptDate = format(new Date(a.scheduled_at), 'yyyy-MM-dd')
            if (aptDate !== scheduleDate) return false
            const aptTime = format(new Date(a.scheduled_at), 'HH:mm')
            return aptTime >= startTime && aptTime < endTime
          } catch {
            return false
          }
        })

        slots.push({
          slotKey,
          startTime,
          endTime,
          label,
          isBooked: !!apt,
          isBreak: !!breakSlots[slotKey],
          appointment: apt
        })
      }
    }
    return slots
  }, [scheduleDate, startHour, appointments, breakSlots])

  const handleQuickBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickBookSlot || !manualClientName.trim()) {
      toast.error('Client name is required')
      return
    }

    try {
      setBookingActionLoading(true)
      const scheduledDateTime = `${scheduleDate}T${quickBookSlot.startTime}:00`

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: manualClientName.trim(),
          contact_phone: manualClientPhone.trim() || '+91 99999 00000',
          scheduled_at: scheduledDateTime,
          duration_minutes: 30,
          meeting_type: manualService.trim() || 'In-Person Consultation',
          notes: `Booked via Brain Schedule Sheet. ${manualService.trim()}`
        })
      })

      const json = await res.json()
      if (json.success) {
        toast.success(`Slot booked for ${manualClientName}!`)
        setQuickBookSlot(null)
        setManualClientName('')
        setManualClientPhone('')
        setManualService('')
        fetchAllBrainData(true)
      } else {
        toast.error(json.error || 'Failed to book slot')
      }
    } catch {
      toast.error('Network error booking slot')
    } finally {
      setBookingActionLoading(false)
    }
  }

  const toggleBreakSlot = (slotKey: string) => {
    setBreakSlots(prev => ({ ...prev, [slotKey]: !prev[slotKey] }))
    toast.success(breakSlots[slotKey] ? 'Break cleared, slot available' : 'Slot marked as Break / Blocked')
  }

  const handleExportScheduleCSV = () => {
    const headers = ['Time Slot', 'Status', 'Client Name', 'Contact Phone', 'Service / Reason', 'Booked Via', 'Date']
    const rows = scheduleSlots.map(s => [
      `"${s.label}"`,
      s.isBreak ? 'Break / Blocked' : s.isBooked ? 'Booked' : 'Available',
      `"${s.appointment?.contact_name || ''}"`,
      `"${s.appointment?.contact_phone || ''}"`,
      `"${s.appointment?.notes || s.appointment?.meeting_type || ''}"`,
      `"${s.appointment?.booked_via || (s.isBooked ? 'AI Voice Call' : '')}"`,
      `"${scheduleDate}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `schedule_sheet_${scheduleDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Schedule spreadsheet exported')
  }

  // -------------------------------------------------------------
  // TAB 3: INVENTORY & PRICING ACTIONS
  // -------------------------------------------------------------
  const startEditingInventory = (item: InventoryItem) => {
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

  const saveEditingInventory = async (id: string) => {
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
        fetchAllBrainData()
      } else {
        toast.error(json.error || 'Failed to update row')
      }
    } catch {
      toast.error('Network error updating row')
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProduct.title.trim()) {
      toast.error('Product title is required')
      return
    }

    try {
      const initial = Number(newProduct.initial_units || 1)
      const sold = Number(newProduct.sold_units || 0)
      const available = Math.max(0, initial - sold)

      const payload = {
        title: newProduct.title.trim(),
        identifier_code: newProduct.identifier_code.trim() || null,
        category: newProduct.category || 'inventory',
        base_price_inr: newProduct.base_price_inr ? Number(newProduct.base_price_inr) : null,
        minimum_price_inr: newProduct.minimum_price_inr ? Number(newProduct.minimum_price_inr) : null,
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
        toast.success(`"${newProduct.title}" added to inventory sheet`)
        setIsAddProductOpen(false)
        setNewProduct({
          title: '',
          identifier_code: '',
          category: 'inventory',
          base_price_inr: '',
          minimum_price_inr: '',
          initial_units: '10',
          sold_units: '0'
        })
        fetchAllBrainData()
      }
    } catch {
      toast.error('Network error creating product')
    }
  }

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
      if (json.success) fetchAllBrainData()
    } catch {
      toast.error('Failed to update stock')
    }
  }

  const handleExportInventoryCSV = () => {
    if (inventoryItems.length === 0) {
      toast.error('No inventory items to export')
      return
    }

    const headers = ['Product/Service Name', 'SKU/Code', 'Category', 'Base Price (INR)', 'Floor Price (INR)', 'Initial Stock', 'Sold Pieces', 'Available Stock', 'Status']
    const rows = inventoryItems.map(item => {
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

  const filteredInventory = inventoryItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      (item.identifier_code && item.identifier_code.toLowerCase().includes(inventorySearch.toLowerCase()))
    const matchesCategory = inventoryCategory === 'all' || item.category === inventoryCategory
    return matchesSearch && matchesCategory
  })

  // -------------------------------------------------------------
  // TAB 4: CALL FORWARDING & FAMILY EXCLUSION ACTIONS
  // -------------------------------------------------------------
  const handleSaveForwardingConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerSecondaryPhone.trim()) {
      toast.error('Owner secondary mobile number is required')
      return
    }

    try {
      setSavingForwarding(true)
      const payload = {
        id: forwardingDocId || undefined,
        title: 'Owner Direct Line (Dual SIM Option A)',
        category: 'call_forwarding',
        status: 'available',
        metadata: {
          owner_secondary_phone: ownerSecondaryPhone.trim(),
          warm_transfer_enabled: warmTransferEnabled,
          fallback_message: fallbackMessage.trim(),
          updated_at: new Date().toISOString()
        }
      }

      const method = forwardingDocId ? 'PUT' : 'POST'
      const res = await fetch('/api/business-catalog', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Owner transfer settings saved!')
        fetchAllBrainData()
      } else {
        toast.error(json.error || 'Failed to save settings')
      }
    } catch {
      toast.error('Network error saving forwarding settings')
    } finally {
      setSavingForwarding(false)
    }
  }

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyForm.name.trim() || !familyForm.phone.trim()) {
      toast.error('Name and phone number are required')
      return
    }

    try {
      setSavingFamily(true)
      const res = await fetch('/api/business-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: familyForm.name.trim(),
          category: 'family_vip',
          identifier_code: familyForm.phone.trim(),
          status: 'available',
          metadata: {
            phone: familyForm.phone.trim(),
            relationship: familyForm.relationship,
            auto_transfer: true,
            exclude_from_outbound: true,
            notes: familyForm.notes.trim()
          }
        })
      })

      const json = await res.json()
      if (json.success) {
        toast.success(`${familyForm.name} added to Family & VIP List`)
        setIsFamilyModalOpen(false)
        setFamilyForm({ name: '', phone: '', relationship: 'Brother', notes: '' })
        fetchAllBrainData()
      } else {
        toast.error(json.error || 'Failed to add contact')
      }
    } catch {
      toast.error('Network error adding contact')
    } finally {
      setSavingFamily(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--heading)] tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-[var(--heading)]" />
            <span>Operations Brain Hub</span>
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl">
            Unified mission control for daily directives, live appointment scheduling, real-time product inventory, and owner call transfer rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchAllBrainData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation inside Brain */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('directives')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'directives'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Directives & Knowledge ({directives.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Live Appointments Sheet</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventory & Pricing Sheet ({inventoryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transfer')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'transfer'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <PhoneForwarded className="w-4 h-4" />
          <span>Call Forwarding & Family ({familyMembers.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DIRECTIVES & KNOWLEDGE BRAIN */}
      {/* ========================================================= */}
      {activeTab === 'directives' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--heading)] flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <span>Active Spoken Voice Directives & Daily Overrides</span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Mic className="w-4 h-4" />
                <span>Speak Directive</span>
              </button>

              <button
                onClick={() => setIsDocumentModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                <Upload className="w-4 h-4 text-[var(--muted)]" />
                <span>Upload Documents</span>
              </button>

              <button
                onClick={() => setIsRuleModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-[var(--muted)]" />
                <span>+ Add Rule</span>
              </button>
            </div>
          </div>

          {/* Directives Grid */}
          {directives.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-center space-y-3">
              <Mic className="w-8 h-8 mx-auto text-[var(--muted)] stroke-1" />
              <div>
                <p className="text-sm font-bold text-[var(--heading)]">No voice directives active</p>
                <p className="text-xs text-[var(--muted)] max-w-md mx-auto mt-0.5">
                  Speak instructions in Hindi, Hinglish, or English (e.g. "Aaj salon 10 baje khulega" or "Aaj store closed hai") and Trinetra will enforce it during live customer calls.
                </p>
              </div>
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" /> Speak to Brain
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {directives.map(item => {
                const meta = item.metadata || {}
                const isActive = item.status === 'available'

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-4 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                            {meta.action_type || 'DAILY SPOKEN OVERRIDE'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[var(--heading)]">{item.title}</h3>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {isActive ? 'Active in Calls' : 'Paused'}
                      </span>
                    </div>

                    {meta.voice_transcript && (
                      <div className="p-3 rounded-xl bg-[var(--hover-bg)] text-xs text-[var(--heading)] italic font-mono border border-[var(--border)]">
                        "{meta.voice_transcript}"
                      </div>
                    )}

                    {meta.prompt_override && (
                      <div className="text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">
                          Live Agent Instruction:
                        </span>
                        <p className="text-[var(--heading)] bg-[var(--hover-bg)]/50 p-2.5 rounded-xl border border-[var(--border)] leading-relaxed">
                          {meta.prompt_override}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                      <span className="text-[10px] text-[var(--muted)] font-mono">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleDirective(item.id, item.status)}
                          className="px-3 py-1 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] cursor-pointer text-xs font-semibold shadow-xs transition-colors"
                        >
                          {isActive ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, 'directive')}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 text-[var(--muted)] hover:text-red-500 cursor-pointer transition-colors"
                          title="Delete Directive"
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

          {/* Ingested Documents Section */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--heading)] flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Ingested Business Knowledge Documents ({documents.length})</span>
              </h3>
              <button
                onClick={() => setIsDocumentModalOpen(true)}
                className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
              >
                + Upload Document
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-center text-[var(--muted)] text-xs">
                No documents uploaded yet. Upload price lists or FAQs to give your AI caller factual context.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-[var(--heading)] truncate">{doc.name}</div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-[var(--muted)] hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {(doc.size / 1024).toFixed(1)} KB • Extracted for in-call queries
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LIVE APPOINTMENTS SCHEDULE SHEET */}
      {/* ========================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Schedule Date Navigator & Operating Hours Banner */}
          <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  try {
                    const prev = subDays(new Date(scheduleDate), 1)
                    setScheduleDate(format(prev, 'yyyy-MM-dd'))
                  } catch (_) {}
                }}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--heading)] cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="px-3 py-1.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
              />

              <button
                onClick={() => {
                  try {
                    const next = addDays(new Date(scheduleDate), 1)
                    setScheduleDate(format(next, 'yyyy-MM-dd'))
                  } catch (_) {}
                }}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--heading)] cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setScheduleDate(format(new Date(), 'yyyy-MM-dd'))}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--hover-bg)] text-[11px] font-semibold text-[var(--heading)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-bg)] ml-1"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportScheduleCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Schedule Spreadsheet Table */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] uppercase font-mono text-[10px] tracking-wider select-none">
                    <th className="py-3 px-4 font-bold w-48">Time Slot</th>
                    <th className="py-3 px-3 font-bold text-center w-28">Status</th>
                    <th className="py-3 px-4 font-bold">Client / Customer</th>
                    <th className="py-3 px-3 font-bold">Phone Number</th>
                    <th className="py-3 px-4 font-bold">Service / Reason</th>
                    <th className="py-3 px-3 font-bold text-center">Booked Via</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {scheduleSlots.map(slot => {
                    const isBooked = slot.isBooked
                    const isBreak = slot.isBreak
                    const apt = slot.appointment

                    return (
                      <tr
                        key={slot.slotKey}
                        className={`hover:bg-[var(--hover-bg)]/60 transition-colors ${
                          isBooked ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : isBreak ? 'bg-zinc-100/40 dark:bg-zinc-900/40' : ''
                        }`}
                      >
                        {/* Time Slot */}
                        <td className="py-3 px-4 font-mono font-bold text-[var(--heading)] flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                          <span>{slot.label}</span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isBreak
                                ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                : isBooked
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]'
                            }`}
                          >
                            {isBreak ? 'Break' : isBooked ? 'Booked' : 'Available'}
                          </span>
                        </td>

                        {/* Client Name */}
                        <td className="py-3 px-4 font-semibold text-[var(--heading)]">
                          {isBooked ? (
                            <span>{apt?.contact_name || 'Caller'}</span>
                          ) : isBreak ? (
                            <span className="italic text-[var(--muted)]">Blocked for Break / Maintenance</span>
                          ) : (
                            <span className="text-[var(--muted)]">-</span>
                          )}
                        </td>

                        {/* Phone Number */}
                        <td className="py-3 px-3 font-mono text-[11px] text-[var(--muted)]">
                          {isBooked && apt?.contact_phone ? (
                            <span>{apt.contact_phone}</span>
                          ) : (
                            <span className="opacity-40">-</span>
                          )}
                        </td>

                        {/* Service / Purpose */}
                        <td className="py-3 px-4 text-[var(--heading)]">
                          {isBooked ? (
                            <span className="line-clamp-1">{apt?.notes || apt?.meeting_type || 'Appointment'}</span>
                          ) : (
                            <span className="text-[var(--muted)]">-</span>
                          )}
                        </td>

                        {/* Booked Via */}
                        <td className="py-3 px-3 text-center">
                          {isBooked ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)]">
                              {apt?.booked_via === 'voice' ? 'AI Voice Call' : 'Manual'}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isBooked ? (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Confirmed
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => setQuickBookSlot(slot)}
                                  disabled={isBreak}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-[11px] shadow-xs cursor-pointer disabled:opacity-30"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Book</span>
                                </button>
                                <button
                                  onClick={() => toggleBreakSlot(slot.slotKey)}
                                  className="p-1 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
                                  title={isBreak ? 'Remove Break' : 'Mark as Break'}
                                >
                                  <Coffee className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LIVE PRODUCTS & INVENTORY SHEET */}
      {/* ========================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs font-semibold text-[var(--muted)] flex items-center justify-between">
                <span>Active Products</span>
                <Package className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-[var(--heading)]">{inventoryItems.length}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs font-semibold text-[var(--muted)] flex items-center justify-between">
                <span>Total Units in Stock</span>
                <Boxes className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-[var(--heading)]">
                {inventoryItems.reduce((acc, i) => acc + (i.available_units || 0), 0)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs font-semibold text-[var(--muted)] flex items-center justify-between">
                <span>Units Sold via Calls</span>
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {inventoryItems.reduce((acc, i) => acc + (i.metadata?.sold_units || 0), 0)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs font-semibold text-[var(--muted)] flex items-center justify-between">
                <span>Realized Sales</span>
                <IndianRupee className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-[var(--heading)]">
                ₹{inventoryItems.reduce((acc, i) => acc + ((i.metadata?.sold_units || 0) * (i.base_price_inr || 0)), 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Search, Filter & Action Toolbar */}
          <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <input
              type="text"
              placeholder="Search product name, SKU..."
              value={inventorySearch}
              onChange={e => setInventorySearch(e.target.value)}
              className="px-3 py-1.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-zinc-400 max-w-xs"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportInventoryCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setIsAddProductOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Row</span>
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] uppercase font-mono text-[10px] tracking-wider select-none">
                    <th className="py-3 px-4 font-bold">Product / Service Item</th>
                    <th className="py-3 px-3 font-bold">SKU</th>
                    <th className="py-3 px-3 font-bold text-right">Base Price</th>
                    <th className="py-3 px-3 font-bold text-right">AI Floor</th>
                    <th className="py-3 px-3 font-bold text-center">Initial Stock</th>
                    <th className="py-3 px-3 font-bold text-center">Sold Pieces</th>
                    <th className="py-3 px-3 font-bold text-center">Available Stock</th>
                    <th className="py-3 px-3 font-bold text-center">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[var(--muted)]">
                        No inventory products found. Click "+ Add Row" above.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map(item => {
                      const isEditing = editingRowId === item.id
                      const initialUnits = item.metadata?.initial_units !== undefined ? item.metadata.initial_units : (item.available_units + (item.metadata?.sold_units || 0))
                      const soldUnits = item.metadata?.sold_units || 0
                      const isSoldOut = item.available_units <= 0

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[var(--hover-bg)]/60 transition-colors ${isEditing ? 'bg-[var(--hover-bg)]/80' : ''}`}
                        >
                          {/* Title */}
                          <td className="py-3 px-4 font-semibold text-[var(--heading)]">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.title || ''}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                className="w-full px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-[var(--heading)]"
                              />
                            ) : (
                              item.title
                            )}
                          </td>

                          {/* SKU */}
                          <td className="py-3 px-3 font-mono text-[11px] text-[var(--muted)]">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.identifier_code || ''}
                                onChange={e => setEditForm({ ...editForm, identifier_code: e.target.value })}
                                className="w-20 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs font-mono text-[var(--heading)]"
                              />
                            ) : (
                              item.identifier_code || '-'
                            )}
                          </td>

                          {/* Base Price */}
                          <td className="py-3 px-3 text-right font-medium text-[var(--heading)]">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editForm.base_price_inr ?? ''}
                                onChange={e => setEditForm({ ...editForm, base_price_inr: Number(e.target.value) })}
                                className="w-20 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-right text-[var(--heading)]"
                              />
                            ) : item.base_price_inr !== null ? (
                              `₹${item.base_price_inr.toLocaleString('en-IN')}`
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* Floor Price */}
                          <td className="py-3 px-3 text-right font-medium text-[var(--muted)]">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editForm.minimum_price_inr ?? ''}
                                onChange={e => setEditForm({ ...editForm, minimum_price_inr: Number(e.target.value) })}
                                className="w-20 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-right text-[var(--heading)]"
                              />
                            ) : item.minimum_price_inr !== null ? (
                              `₹${item.minimum_price_inr.toLocaleString('en-IN')}`
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* Initial Stock */}
                          <td className="py-3 px-3 text-center font-bold text-[var(--heading)]">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editForm.initial_units ?? 0}
                                onChange={e => setEditForm({ ...editForm, initial_units: Number(e.target.value) })}
                                className="w-16 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-center text-[var(--heading)]"
                              />
                            ) : (
                              initialUnits
                            )}
                          </td>

                          {/* Sold Pieces */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editForm.sold_units ?? 0}
                                onChange={e => setEditForm({ ...editForm, sold_units: Number(e.target.value) })}
                                className="w-16 px-2 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded text-xs text-center text-[var(--heading)]"
                              />
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {soldUnits}
                                </span>
                                <div className="flex flex-col ml-1">
                                  <button
                                    onClick={() => handleQuickSell(item, 1)}
                                    className="text-[9px] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer leading-none"
                                    title="Add 1 sold"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={() => handleQuickSell(item, -1)}
                                    disabled={soldUnits <= 0}
                                    className="text-[9px] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer leading-none disabled:opacity-20"
                                    title="Subtract 1 sold"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Available Stock */}
                          <td className="py-3 px-3 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              isSoldOut ? 'line-through text-zinc-400' : 'text-[var(--heading)]'
                            }`}>
                              {item.available_units}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSoldOut
                                ? 'bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            }`}>
                              {isSoldOut ? 'Sold Out' : 'In Stock'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveEditingInventory(item.id)}
                                    className="p-1 rounded text-emerald-600 cursor-pointer"
                                    title="Save"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingRowId(null)}
                                    className="p-1 rounded text-[var(--muted)] cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditingInventory(item)}
                                    className="p-1 rounded text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
                                    title="Edit Row"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id, item.title)}
                                    className="p-1 rounded text-[var(--muted)] hover:text-red-500 cursor-pointer"
                                    title="Delete"
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
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: CALL FORWARDING & FAMILY EXCLUSION */}
      {/* ========================================================= */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          {/* Card 1: Owner Secondary Line & Warm Transfer Settings */}
          <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                  <PhoneForwarded className="w-5 h-5 text-[var(--heading)]" />
                  <span>Owner Direct Transfer Line (Dual SIM Option A)</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl">
                  Configure your personal direct phone number. When calls from family members arrive, or when customers insist on talking to the owner, the AI bot performs an immediate Warm Transfer directly to this number without infinite looping.
                </p>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Warm Transfer Active
              </span>
            </div>

            <form onSubmit={handleSaveForwardingConfig} className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Owner Direct Mobile Phone (SIM 2 / Personal Line) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 00000"
                    value={ownerSecondaryPhone}
                    onChange={e => setOwnerSecondaryPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    This phone must NOT have call forwarding turned on.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Warm Transfer Protocol
                  </label>
                  <div className="flex items-center gap-3 p-2.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl">
                    <input
                      type="checkbox"
                      id="warmTransferCheck"
                      checked={warmTransferEnabled}
                      onChange={e => setWarmTransferEnabled(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-zinc-900 dark:accent-white"
                    />
                    <label htmlFor="warmTransferCheck" className="text-xs text-[var(--heading)] cursor-pointer">
                      <strong>Warm Transfer Enabled:</strong> AI tells caller to hold, whispers context to owner, then connects.
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] mb-1">
                  Fallback Spoken Reassurance (If Owner Doesn't Answer in 20s)
                </label>
                <textarea
                  rows={2}
                  value={fallbackMessage}
                  onChange={e => setFallbackMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 leading-relaxed"
                />
                <p className="text-[11px] text-[var(--muted)] mt-1">
                  If the owner is busy or does not answer within 20s, bot speaks this message and immediately dispatches a high-priority WhatsApp alert to the owner.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-[var(--border)]">
                <button
                  type="submit"
                  disabled={savingForwarding}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingForwarding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Transfer Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Family Members & VIP Exclusion List */}
          <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[var(--heading)]" />
                  <span>Family Members & VIP Auto-Transfer List ({familyMembers.length})</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl">
                  Phone numbers added here are recognized by the AI bot for immediate warm transfer to the owner. They are also <strong>automatically excluded from all AI outbound promotional calling campaigns</strong> so family is never pitched!
                </p>
              </div>

              <button
                onClick={() => setIsFamilyModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Family / VIP</span>
              </button>
            </div>

            {familyMembers.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[var(--hover-bg)]/40 border border-dashed border-[var(--border)] text-center text-xs text-[var(--muted)] space-y-2">
                <UserCheck className="w-8 h-8 mx-auto text-[var(--muted)] stroke-1" />
                <p className="font-semibold text-[var(--heading)]">No family members registered yet</p>
                <p className="max-w-md mx-auto">
                  Add your family members (Mother, Father, Brother, Wife) or close VIP contacts. When they call, the bot greets them with respect and connects them to you immediately.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] uppercase font-mono text-[10px] tracking-wider select-none">
                      <th className="py-3 px-4 font-bold">Contact Name</th>
                      <th className="py-3 px-4 font-bold">Relationship</th>
                      <th className="py-3 px-4 font-bold">Mobile Phone</th>
                      <th className="py-3 px-3 font-bold text-center">Inbound Action</th>
                      <th className="py-3 px-3 font-bold text-center">Outbound Protection</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {familyMembers.map(item => {
                      const meta = item.metadata || {}
                      return (
                        <tr key={item.id} className="hover:bg-[var(--hover-bg)]/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[var(--heading)]">
                            {item.title}
                          </td>
                          <td className="py-3 px-4 text-[var(--muted)]">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--hover-bg)] border border-[var(--border)] font-medium">
                              {meta.relationship || 'Family'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[var(--heading)]">
                            {meta.phone || item.identifier_code || '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              Instant Warm Transfer
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-[var(--border)]">
                              Campaign Scrubbed
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteItem(item.id, item.title)}
                              className="p-1 rounded text-[var(--muted)] hover:text-red-500 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* 1. Speak Directive Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-xl p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Mic className="w-5 h-5 text-[var(--heading)]" />
                <span>Speak Operational Directive to Brain</span>
              </h2>
              <button
                onClick={() => {
                  stopRecording()
                  setIsVoiceModalOpen(false)
                }}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)]">
              Speak naturally in Hindi, Hinglish, or English. Trinetra extracts your directive and injects it live into your AI voice agent answering calls.
            </p>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Try Examples:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_VOICE_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setVoiceTranscript(qp.text)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--heading)] border border-[var(--border)] cursor-pointer"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse scale-105'
                    : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <span className="text-xs font-semibold text-[var(--heading)]">
                {isRecording ? 'Listening... Speak your directive' : 'Click to start speaking'}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[var(--muted)] tracking-wider">
                Recognized Spoken Transcript:
              </label>
              <textarea
                rows={3}
                value={voiceTranscript}
                onChange={e => setVoiceTranscript(e.target.value)}
                placeholder="Or type here: e.g. Aaj salon 10 baje khulega, uske baad hi appointment book karna..."
                className="w-full p-3 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  stopRecording()
                  setIsVoiceModalOpen(false)
                }}
                className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--muted)] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyVoiceDirective}
                disabled={isProcessingVoice || !voiceTranscript.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isProcessingVoice ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Directive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Upload Documents Modal */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[var(--heading)]" />
                <span>Upload Documents to Brain</span>
              </h2>
              <button
                onClick={() => setIsDocumentModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-[var(--border)] hover:border-zinc-400 rounded-2xl text-center cursor-pointer transition-colors space-y-2 bg-[var(--hover-bg)]/40"
            >
              <Upload className="w-8 h-8 mx-auto text-[var(--muted)] stroke-1" />
              <div className="text-xs font-bold text-[var(--heading)]">
                Click to select PDF, Excel, Word, or Text files
              </div>
              <p className="text-[11px] text-[var(--muted)]">Supports .pdf, .xlsx, .csv, .docx, .txt</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.docx,.txt"
                onChange={e => {
                  if (e.target.files) setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                }}
                className="hidden"
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="p-2 rounded-lg bg-[var(--hover-bg)] border border-[var(--border)] text-xs flex justify-between">
                    <span className="font-medium truncate">{f.name}</span>
                    <span className="text-[10px] text-[var(--muted)]">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsDocumentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--muted)] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadAndProcessDocs}
                disabled={isIngestingDocs || uploadedFiles.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isIngestingDocs ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save to Brain</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Add Operating Rule / Guardrail</span>
              </h2>
              <button onClick={() => setIsRuleModalOpen(false)} className="p-1 rounded text-[var(--muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Rule Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandatory Appointment Confirmation"
                  value={ruleTitle}
                  onChange={e => setRuleTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">In-Call Agent Instruction *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Always ask for customer's phone number before confirming appointment."
                  value={rulePrompt}
                  onChange={e => setRulePrompt(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsRuleModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--hover-bg)]">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Quick Book Slot Modal */}
      {quickBookSlot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Book Slot ({quickBookSlot.label})</span>
              </h3>
              <button onClick={() => setQuickBookSlot(null)} className="p-1 rounded text-[var(--muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickBookSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Customer / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={manualClientName}
                  onChange={e => setManualClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={manualClientPhone}
                  onChange={e => setManualClientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Service / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Haircut & Styling or Business Consultation"
                  value={manualService}
                  onChange={e => setManualService(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setQuickBookSlot(null)} className="px-4 py-2 rounded-xl bg-[var(--hover-bg)]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingActionLoading}
                  className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold disabled:opacity-50"
                >
                  {bookingActionLoading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Inventory Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Add Product to Inventory Sheet</span>
              </h2>
              <button onClick={() => setIsAddProductOpen(false)} className="p-1 rounded text-[var(--muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic T-Shirt (Black - M) or Facial Kit"
                  value={newProduct.title}
                  onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">SKU / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. TSH-BLK-M"
                    value={newProduct.identifier_code}
                    onChange={e => setNewProduct({ ...newProduct, identifier_code: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                  >
                    <option value="inventory">Inventory & Products</option>
                    <option value="general">Services & General</option>
                    <option value="logistics">Routes & Transport</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 599"
                    value={newProduct.base_price_inr}
                    onChange={e => setNewProduct({ ...newProduct, base_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">AI Minimum Floor Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 499 (Strict limit for bot)"
                    value={newProduct.minimum_price_inr}
                    onChange={e => setNewProduct({ ...newProduct, minimum_price_inr: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Initial Total Stock (Units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 10"
                    value={newProduct.initial_units}
                    onChange={e => setNewProduct({ ...newProduct, initial_units: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Already Sold (Units)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 0"
                    value={newProduct.sold_units}
                    onChange={e => setNewProduct({ ...newProduct, sold_units: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsAddProductOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--hover-bg)]">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold">
                  Add to Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Family / VIP Contact Modal */}
      {isFamilyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>Add Family Member or VIP Contact</span>
              </h3>
              <button onClick={() => setIsFamilyModalOpen(false)} className="p-1 rounded text-[var(--muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFamilyMember} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Singh or Mummy"
                  value={familyForm.name}
                  onChange={e => setFamilyForm({ ...familyForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Relationship</label>
                  <select
                    value={familyForm.relationship}
                    onChange={e => setFamilyForm({ ...familyForm, relationship: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                  >
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Mother">Mother / Mummy</option>
                    <option value="Father">Father / Papa</option>
                    <option value="Wife">Wife / Spouse</option>
                    <option value="Son/Daughter">Son / Daughter</option>
                    <option value="VIP Partner">VIP Business Partner</option>
                    <option value="Close Friend">Close Friend</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={familyForm.phone}
                    onChange={e => setFamilyForm({ ...familyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes / Special Greeting Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Raghav's younger brother. Greet with Pranam or warmth."
                  value={familyForm.notes}
                  onChange={e => setFamilyForm({ ...familyForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-[11px] text-[var(--muted)] space-y-1">
                <div className="font-semibold text-[var(--heading)]">Automatic Protections Applied:</div>
                <div>• Inbound calls will warm-transfer directly to owner's secondary line.</div>
                <div>• Number will be scrubbed & excluded from all outbound sales campaigns.</div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsFamilyModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--hover-bg)]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFamily}
                  className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold disabled:opacity-50"
                >
                  {savingFamily ? 'Saving...' : 'Add to Family List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
