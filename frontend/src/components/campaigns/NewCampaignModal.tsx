'use client'

import React, { useState, useEffect } from 'react'
import { X, Upload, Megaphone, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'

interface Agent {
  id: string
  name: string
  status: string
}

interface NewCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NewCampaignModal({ isOpen, onClose, onSuccess }: NewCampaignModalProps) {
  const [name, setName] = useState('')
  const [agentId, setAgentId] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [startHours, setStartHours] = useState('10:00')
  const [endHours, setEndHours] = useState('18:00')
  const [scheduledStart, setScheduledStart] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAgents()
    }
  }, [isOpen])

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true)
      const supabase = createClient()
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) {
        toast.error('Authentication session missing!')
        return
      }

      const { data: agentsData, error: agentsErr } = await supabase
        .from('agents')
        .select('id, name, status, is_demo, agent_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (agentsErr) throw agentsErr

      const filteredAgents = (agentsData || []).filter((agent: any) => {
        const rawName = agent.name || ''
        const cleanName = rawName.replace(/^\[[^\]]+\]\s*/, '').trim().toLowerCase()
        const isNameDemo = cleanName === 'demo' || cleanName.startsWith('demo')
        const isFreeDemo = agent.is_demo === true || 
                           agent.agent_type === 'free_demo' || 
                           isNameDemo
        return !isFreeDemo
      })

      const mappedAgents = filteredAgents.map((agent: any) => {
        const rawName = agent.name || ''
        const displayName = rawName
          .replace(/^\[[^\]]+\]\s*/, '')           // remove [slug] prefix
          .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')  // prettify " - Demo" suffix
          .replace(/\s*-\s*Trial\s*$/i, ' (Trial)') // prettify " - Trial" suffix
        return {
          id: agent.id,
          name: displayName || 'Unnamed Agent',
          status: agent.status
        }
      })

      setAgents(mappedAgents)
      if (mappedAgents.length > 0) {
        setAgentId(mappedAgents[0].id)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load agents: ' + (err.message || err))
    } finally {
      setLoadingAgents(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (ext !== 'csv' && ext !== 'xlsx') {
        toast.error('Only CSV or Excel (.xlsx) files are allowed')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Campaign name is required')
    if (!agentId) return toast.error('Please select an agent')
    if (!file) return toast.error('Please upload a contact list')

    try {
      setSubmitting(true)
      const formData = new FormData()
      formData.append('name', name)
      formData.append('agentId', agentId)
      formData.append('timezone', timezone)
      formData.append('calling_hours_start', startHours)
      formData.append('calling_hours_end', endHours)
      if (scheduledStart) {
        formData.append('scheduled_start', new Date(scheduledStart).toISOString())
      }
      formData.append('file', file)

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Campaign successfully created!')
        onSuccess()
        onClose()
        // Reset form
        setName('')
        setFile(null)
        setScheduledStart('')
      } else {
        toast.error(data.error || 'Failed to create campaign')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form 
        onSubmit={handleSubmit}
        className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-xl max-h-[min(620px,80vh)] rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-violet-500" />
            <h3 className="text-lg font-bold text-[var(--heading)] font-display">Create Outbound Campaign</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--hover-bg)] rounded-lg text-[var(--muted)] hover:text-[var(--heading)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Campaign Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--heading)]">
              Campaign Name
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. August Warm Leads"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--heading)] focus:outline-none focus:border-violet-500 transition-all font-sans"
            />
          </div>

          {/* Agent Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--heading)]">
              Assign AI Voice Agent
            </label>
            {loadingAgents ? (
              <div className="flex items-center gap-2 py-2 text-xs text-[var(--muted)]">
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                Loading agents...
              </div>
            ) : agents.length === 0 ? (
              <p className="text-xs text-rose-500 font-medium">No agents available. Please create a voice agent first.</p>
            ) : (
              <select
                required
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--heading)] focus:outline-none focus:border-violet-500 transition-all font-sans"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Timezone and Calling Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--heading)]">
                Calling Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--heading)] focus:outline-none focus:border-violet-500 transition-all font-sans"
              >
                <option value="Asia/Kolkata">India (Asia/Kolkata)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">US Eastern (America/New_York)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--heading)]">
                Calling Hours Window
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  required
                  placeholder="10:00"
                  value={startHours}
                  onChange={(e) => setStartHours(e.target.value)}
                  className="w-1/2 text-center bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                />
                <span className="text-[var(--muted)] text-xs font-bold">to</span>
                <input 
                  type="text" 
                  required
                  placeholder="18:00"
                  value={endHours}
                  onChange={(e) => setEndHours(e.target.value)}
                  className="w-1/2 text-center bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Scheduled Start (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--heading)]">
              Scheduled Start Time (Optional)
            </label>
            <input 
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--heading)] focus:outline-none focus:border-violet-500 transition-all font-sans"
            />
          </div>

          {/* Contact List Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--heading)]">
              Upload Contact Spreadsheet (.CSV, .XLSX)
            </label>
            
            <div className="border-2 border-dashed border-[var(--border)] hover:border-violet-500/50 rounded-2xl p-6 transition-all duration-150 flex flex-col items-center justify-center gap-2 cursor-pointer relative bg-[var(--background)]/20">
              <input 
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-[var(--muted)]" />
              <p className="text-xs font-bold text-[var(--heading)]">
                {file ? file.name : "Select or drag file here"}
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports CSV or Excel spreadsheets containing phone numbers"}
              </p>
            </div>
          </div>
        </div>

        {/* Pinned Actions Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--card-bg)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--body)] hover:bg-[var(--hover-bg)] hover:text-[var(--heading)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !agentId || !file}
            className="px-6 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create Campaign
          </button>
        </div>
      </form>
    </div>
  )
}
