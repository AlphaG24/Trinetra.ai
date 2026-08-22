'use client'

import React, { useState, useEffect } from 'react'
import { 
  PhoneOff, UploadCloud, Trash2, Search, Plus, 
  Loader2, ShieldAlert, CheckCircle, Calendar, 
  ChevronLeft, ChevronRight, Ban, X, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'

export function DNDRegistryClient() {
  const [stats, setStats] = useState({ total: 0, manual: 0, upload: 0, trai_sync: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  
  // Checking single number state
  const [checkNumber, setCheckNumber] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<{ checked: boolean; isDnd: boolean } | null>(null)
  
  // Adding single number state
  const [newNumber, setNewNumber] = useState('')
  const [newSource, setNewSource] = useState('manual')
  const [adding, setAdding] = useState(false)
  
  // Bulk upload state
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })

  // Bulk purge state
  const [purgeSource, setPurgeSource] = useState('')
  const [purgeBeforeDate, setPurgeBeforeDate] = useState('')
  const [purging, setPurging] = useState(false)

  // DND List state
  const [records, setRecords] = useState<any[]>([])
  const [recordsCount, setRecordsCount] = useState(0)
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchVal, setSearchVal] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')

  const supabase = createClient()

  const fetchStats = async () => {
    try {
      setLoadingStats(true)
      const { count: total } = await supabase.from('dnd_registry').select('*', { count: 'exact', head: true })
      const { count: manual } = await supabase.from('dnd_registry').select('*', { count: 'exact', head: true }).eq('source', 'manual')
      const { count: upload } = await supabase.from('dnd_registry').select('*', { count: 'exact', head: true }).eq('source', 'upload')
      const { count: trai } = await supabase.from('dnd_registry').select('*', { count: 'exact', head: true }).eq('source', 'trai_sync')
      
      setStats({
        total: total || 0,
        manual: manual || 0,
        upload: upload || 0,
        trai_sync: trai || 0
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true)
      const offset = (page - 1) * limit
      
      let query = supabase
        .from('dnd_registry')
        .select('*', { count: 'exact' })
        .order('registered_at', { ascending: false })
      
      if (searchQuery) {
        query = query.ilike('phone_number', `%${searchQuery}%`)
      }
      
      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter)
      }

      const { data, count, error } = await query.range(offset, offset + limit - 1)
      
      if (error) throw error
      
      setRecords(data || [])
      setRecordsCount(count || 0)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load DND entries')
    } finally {
      setLoadingRecords(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [page, searchQuery, sourceFilter])

  // Handle single check
  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkNumber.trim()) return
    try {
      setChecking(true)
      setCheckResult(null)
      const res = await fetch('/api/admin/dnd/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_numbers: [checkNumber] })
      })
      const data = await res.json()
      if (res.ok) {
        const isDnd = data.data[checkNumber] || false
        setCheckResult({ checked: true, isDnd })
      } else {
        toast.error(data.error || 'Failed to check number')
      }
    } catch (err) {
      toast.error('Error checking number')
    } finally {
      setChecking(false)
    }
  }

  // Handle single add
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNumber.trim()) return
    try {
      setAdding(true)
      const res = await fetch('/api/admin/dnd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_numbers: [newNumber], source: newSource })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Phone number ${newNumber} added to DND registry`)
        setNewNumber('')
        fetchStats()
        fetchRecords()
      } else {
        toast.error(data.error || 'Failed to add number')
      }
    } catch (err) {
      toast.error('Error adding number')
    } finally {
      setAdding(false)
    }
  }

  // Handle single delete
  const handleDelete = async (phone: string) => {
    if (!window.confirm(`Are you sure you want to remove ${phone} from the DND registry?`)) return
    try {
      const res = await fetch(`/api/admin/dnd/${phone}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success(`Removed ${phone} from DND registry`)
        fetchStats()
        fetchRecords()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to remove number')
      }
    } catch (err) {
      toast.error('Error removing number')
    }
  }

  // Handle CSV file upload & parsing
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const processCSVContent = async (text: string) => {
    // Parse lines and extract phone numbers (digits only, ignore header if matches text)
    const lines = text.split(/\r?\n/)
    const phones: string[] = []
    
    for (const line of lines) {
      const cleaned = line.replace(/[^\d]/g, '').trim()
      if (cleaned.length >= 10) {
        phones.push(cleaned)
      }
    }

    if (phones.length === 0) {
      toast.error('No valid phone numbers found in the uploaded file.')
      return
    }

    try {
      setUploading(true)
      setUploadProgress({ current: 0, total: phones.length })
      
      const batchSize = 250
      let successCount = 0

      for (let i = 0; i < phones.length; i += batchSize) {
        const batch = phones.slice(i, i + batchSize)
        setUploadProgress({ current: i, total: phones.length })
        
        const res = await fetch('/api/admin/dnd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_numbers: batch, source: 'upload' })
        })

        if (!res.ok) {
          throw new Error('Batch upload failed')
        }
        successCount += batch.length
      }

      setUploadProgress({ current: phones.length, total: phones.length })
      toast.success(`Successfully uploaded ${successCount} numbers to DND registry`)
      fetchStats()
      fetchRecords()
    } catch (err: any) {
      toast.error(err.message || 'Failed during bulk upload process')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a valid CSV file.')
        return
      }
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        await processCSVContent(text)
      }
      reader.readAsText(file)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a valid CSV file.')
        return
      }
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        await processCSVContent(text)
      }
      reader.readAsText(file)
    }
  }

  // Handle bulk purge
  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purgeSource && !purgeBeforeDate) {
      toast.error('Please specify a source or a cutoff date.')
      return
    }
    
    const confirmMsg = `Are you sure you want to delete registry entries matching:
    ${purgeSource ? `Source: ${purgeSource}` : ''}
    ${purgeBeforeDate ? `Registered Before: ${purgeBeforeDate}` : ''}? This action is permanent.`

    if (!window.confirm(confirmMsg)) return

    try {
      setPurging(true)
      let url = '/api/admin/dnd?'
      if (purgeSource) url += `source=${encodeURIComponent(purgeSource)}&`
      if (purgeBeforeDate) url += `before_date=${encodeURIComponent(new Date(purgeBeforeDate).toISOString())}`
      
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Bulk deletion completed successfully!')
        setPurgeSource('')
        setPurgeBeforeDate('')
        fetchStats()
        fetchRecords()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete entries')
      }
    } catch (err) {
      toast.error('Error during bulk deletion')
    } finally {
      setPurging(false)
    }
  }

  const totalPages = Math.ceil(recordsCount / limit) || 1

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12 text-zinc-100 font-sans selection:bg-violet-500/30">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-display flex items-center gap-3">
          <PhoneOff className="w-8 h-8 text-violet-400" />
          DND Registry Management
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Scrub and verify customer lists against India's TRAI Do Not Disturb (DND) compliance database.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider font-montserrat">Total Blocked Numbers</p>
          <p className="text-3xl font-extrabold text-white mt-1.5 font-mono">
            {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-zinc-600" /> : stats.total}
          </p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider font-montserrat">Manual Blocks</p>
          <p className="text-3xl font-extrabold text-violet-400 mt-1.5 font-mono">
            {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-zinc-600" /> : stats.manual}
          </p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider font-montserrat">CSV Uploaded Blocks</p>
          <p className="text-3xl font-extrabold text-blue-400 mt-1.5 font-mono">
            {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-zinc-600" /> : stats.upload}
          </p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider font-montserrat">TRAI Sync Blocks</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1.5 font-mono">
            {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-zinc-600" /> : stats.trai_sync}
          </p>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Check and Add */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Quick Check Form */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase text-white font-montserrat tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4 text-violet-400" />
              Quick DND Check
            </h3>
            <form onSubmit={handleCheck} className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. 9876543210"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value.replace(/[^\d]/g, ''))}
                className="flex-1 bg-zinc-900 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all font-mono"
              />
              <button 
                type="submit"
                disabled={checking}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-violet-500/10"
              >
                {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Check'}
              </button>
            </form>
            
            {checkResult && (
              <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs animate-in fade-in duration-200 ${
                checkResult.isDnd 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {checkResult.isDnd ? (
                  <>
                    <Ban className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-extrabold uppercase tracking-wide">DND Registered</p>
                      <p className="text-[10px] text-rose-500/80 mt-0.5">Do NOT call this number for promotional campaigns.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-extrabold uppercase tracking-wide">Clean / Not Blocked</p>
                      <p className="text-[10px] text-emerald-500/80 mt-0.5">Safe to include in outbound campaign calls.</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Add Single Number Form */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase text-white font-montserrat tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-violet-400" />
              Add Single Number
            </h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="10-digit number"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Source</label>
                  <select 
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all"
                  >
                    <option value="manual">Manual</option>
                    <option value="upload">CSV Upload</option>
                    <option value="trai_sync">TRAI Sync</option>
                  </select>
                </div>
                <button 
                  type="submit"
                  disabled={adding || !newNumber}
                  className="w-full py-2 bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 hover:bg-violet-600/10 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Register
                </button>
              </div>
            </form>
          </div>

          {/* Bulk Purge Section */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase text-white font-montserrat tracking-wider flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-400" />
              Bulk Purge Registry
            </h3>
            <form onSubmit={handlePurge} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Filter by Source</label>
                <select 
                  value={purgeSource}
                  onChange={(e) => setPurgeSource(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all"
                >
                  <option value="">All Sources</option>
                  <option value="manual">Manual Only</option>
                  <option value="upload">Upload Only</option>
                  <option value="trai_sync">TRAI Sync Only</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Registered Before Date</label>
                <input 
                  type="date"
                  value={purgeBeforeDate}
                  onChange={(e) => setPurgeBeforeDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>
              <button 
                type="submit"
                disabled={purging || (!purgeSource && !purgeBeforeDate)}
                className="w-full py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Purge Entries
              </button>
            </form>
          </div>

        </div>

        {/* Right Col - Drag & Drop Upload and List */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* CSV File Uploader */}
          <div 
            onDragEnter={handleDrag} 
            onDragOver={handleDrag} 
            onDragLeave={handleDrag} 
            onDrop={handleDrop}
            className={`bg-zinc-950/60 border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              dragActive ? 'border-violet-500 bg-violet-500/5' : 'border-zinc-800/80 hover:border-zinc-700/80'
            }`}
          >
            {uploading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <div>
                  <p className="text-xs font-bold text-white">Importing DND Numbers...</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Uploaded {uploadProgress.current} of {uploadProgress.total} records
                  </p>
                </div>
                <div className="w-48 bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800 mt-1">
                  <div 
                    className="bg-violet-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <label className="cursor-pointer py-6 flex flex-col items-center justify-center gap-2.5">
                <UploadCloud className="w-10 h-10 text-violet-400" />
                <div>
                  <p className="text-xs font-bold text-white">Drag & Drop DND List CSV</p>
                  <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                    CSV file containing 10-digit phone numbers (one number per line)
                  </p>
                </div>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <span className="mt-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/60 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  Select File
                </span>
              </label>
            )}
          </div>

          {/* DND Database Table */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden">
            
            {/* Table Header Filter */}
            <div className="p-4 border-b border-zinc-800/60 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-xs font-black uppercase text-white font-montserrat tracking-wider">
                DND Registry Records
              </h3>
              
              <div className="flex w-full sm:w-auto items-center gap-2.5">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearchQuery(searchVal); }}>
                    <input 
                      type="text"
                      placeholder="Search phone number..."
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      className="w-full sm:w-44 bg-zinc-900 border border-zinc-800/80 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-all font-mono"
                    />
                  </form>
                  {searchQuery && (
                    <button 
                      onClick={() => { setSearchVal(''); setSearchQuery(''); setPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:text-white text-zinc-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select 
                  value={sourceFilter}
                  onChange={(e) => { setPage(1); setSourceFilter(e.target.value); }}
                  className="bg-zinc-900 border border-zinc-800/80 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-all"
                >
                  <option value="all">All Sources</option>
                  <option value="manual">Manual</option>
                  <option value="upload">CSV Upload</option>
                  <option value="trai_sync">TRAI Sync</option>
                </select>
              </div>
            </div>

            {/* List Records */}
            {loadingRecords && records.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                <p className="text-xs text-zinc-500">Loading registry...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                <AlertCircle className="w-8 h-8 text-zinc-600" />
                <p className="text-xs font-bold text-zinc-300">No records found</p>
                <p className="text-[10px]">No DND entries match your search or filter settings.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/60 bg-zinc-950/40 text-[9px] text-zinc-500 font-black uppercase tracking-wider font-montserrat">
                      <th className="px-5 py-3">Phone Number</th>
                      <th className="px-5 py-3">Source</th>
                      <th className="px-5 py-3">Registered At</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 text-xs font-sans">
                    {records.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-white tracking-wide">{item.phone_number}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase border font-montserrat ${
                            item.source === 'manual' 
                              ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                              : item.source === 'upload'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {item.source}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-zinc-400 font-mono text-[10px]">
                          {item.registered_at ? new Date(item.registered_at).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDelete(item.phone_number)}
                            className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:border-red-500/20 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                            title="Remove from DND"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-zinc-800/60 flex items-center justify-between text-xs bg-zinc-950/20">
                <span className="font-semibold text-zinc-500">
                  Showing page {page} of {totalPages} ({recordsCount} total entries)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  )
}
