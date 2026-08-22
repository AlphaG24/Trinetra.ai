'use client'

import { useState, useEffect } from 'react'
import { 
  Puzzle, Send, MessageCircle, Calendar, Database, 
  Cloud, Mail, Webhook, Link as LinkIcon, Plus, 
  Edit2, Trash2, X, Check, Loader2, Play
} from 'lucide-react'
import { toast } from 'sonner'

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Send,
  MessageCircle,
  Calendar,
  Database,
  Cloud,
  Mail,
  Webhook,
  Link: LinkIcon,
  Puzzle
}

interface IntegrationType {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  category: string
  setup_steps: Array<{ title: string; description: string }>
  required_fields: string[]
  is_active: boolean
  agent_count?: number
}

export function AdminIntegrationsClient() {
  const [types, setTypes] = useState<IntegrationType[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal & Form States
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState<IntegrationType | null>(null)
  
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('Puzzle')
  const [category, setCategory] = useState('messaging')
  const [isActive, setIsActive] = useState(true)
  const [setupSteps, setSetupSteps] = useState<Array<{ title: string; description: string }>>([])
  const [requiredFields, setRequiredFields] = useState<string[]>([])
  
  // Field helpers
  const [newFieldKey, setNewFieldKey] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchTypes = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/integrations')
      const data = await res.json()
      if (res.ok && data.success) {
        setTypes(data.data || [])
      } else {
        toast.error(data.error || 'Failed to fetch integration types')
      }
    } catch (err: any) {
      toast.error('Error fetching integration types: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTypes()
  }, [])

  const handleOpenCreate = () => {
    setEditingType(null)
    setName('')
    setSlug('')
    setDescription('')
    setIcon('Puzzle')
    setCategory('messaging')
    setIsActive(true)
    setSetupSteps([{ title: 'Setup', description: 'Setup steps description' }])
    setRequiredFields([])
    setShowModal(true)
  }

  const handleOpenEdit = (type: IntegrationType) => {
    setEditingType(type)
    setName(type.name)
    setSlug(type.slug)
    setDescription(type.description || '')
    setIcon(type.icon || 'Puzzle')
    setCategory(type.category || 'messaging')
    setIsActive(type.is_active)
    setSetupSteps(type.setup_steps || [])
    setRequiredFields(type.required_fields || [])
    setShowModal(true)
  }

  const handleAddField = () => {
    const key = newFieldKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!key) return
    if (requiredFields.includes(key)) {
      toast.warning('Field key already exists')
      return
    }
    setRequiredFields(prev => [...prev, key])
    setNewFieldKey('')
  }

  const handleRemoveField = (field: string) => {
    setRequiredFields(prev => prev.filter(f => f !== field))
  }

  const handleAddStep = () => {
    setSetupSteps(prev => [...prev, { title: '', description: '' }])
  }

  const handleRemoveStep = (idx: number) => {
    setSetupSteps(prev => prev.filter((_, i) => i !== idx))
  }

  const handleStepChange = (idx: number, key: 'title' | 'description', val: string) => {
    setSetupSteps(prev => prev.map((step, i) => {
      if (i === idx) {
        return { ...step, [key]: val }
      }
      return step
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug) {
      toast.error('Name and slug are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name,
        slug,
        description,
        icon,
        category,
        is_active: isActive,
        setup_steps: setupSteps,
        required_fields: requiredFields
      }

      const url = editingType 
        ? `/api/admin/integrations/${editingType.id}`
        : '/api/admin/integrations'
      
      const method = editingType ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(editingType ? 'Integration type updated!' : 'Integration type created!')
        setShowModal(false)
        fetchTypes()
      } else {
        toast.error(data.error || 'Failed to save integration type')
      }
    } catch (err: any) {
      toast.error('Network error while saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will remove all connected agent configs!`)) return
    try {
      const res = await fetch(`/api/admin/integrations/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Integration type deleted.')
        fetchTypes()
      } else {
        toast.error('Failed to delete integration type.')
      }
    } catch (err: any) {
      toast.error('Network error during deletion.')
    }
  }

  const handleToggleActive = async (type: IntegrationType) => {
    try {
      const res = await fetch(`/api/admin/integrations/${type.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...type,
          is_active: !type.is_active
        })
      })
      if (res.ok) {
        toast.success(`Integration status updated.`)
        fetchTypes()
      } else {
        toast.error('Failed to toggle status.')
      }
    } catch (err: any) {
      toast.error('Network error.')
    }
  }

  return (
    <div className="space-y-6 text-left text-zinc-900 dark:text-zinc-100">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-white/5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight font-display text-zinc-900 dark:text-white flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-violet-500" /> Admin Integrations Hub
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Define, update, and manage global integration blueprints and connection requirements.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/10 cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Add Integration Blueprint
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-xs text-zinc-500">Loading blueprint configurations...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-[#080010] text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-white/5">
                <tr>
                  <th className="px-6 py-4">Blueprint Name</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Required Fields</th>
                  <th className="px-6 py-4">Connected Agents</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                {types.map(type => {
                  const Icon = ICON_MAP[type.icon] || Puzzle
                  return (
                    <tr key={type.id} className="hover:bg-zinc-50/50 dark:hover:bg-white/1 flex-none">
                      <td className="px-6 py-4 flex items-center gap-3 font-semibold text-zinc-900 dark:text-white">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-violet-500">
                          <Icon className="w-4 h-4" />
                        </div>
                        {type.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-400 dark:text-zinc-500">{type.slug}</td>
                      <td className="px-6 py-4 capitalize">{type.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {type.required_fields.map(f => (
                            <span key={f} className="text-[10px] bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 px-1.5 py-0.5 rounded font-mono">
                              {f}
                            </span>
                          ))}
                          {type.required_fields.length === 0 && (
                            <span className="text-zinc-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{type.agent_count ?? 0}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(type)}
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer ${
                            type.is_active
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          }`}
                        >
                          {type.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(type)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(type.id, type.name)}
                            className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-900/35 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE/EDIT MODAL OVERLAY */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <form 
            onSubmit={handleSave}
            className="relative max-w-2xl w-full bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Close */}
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editingType ? 'Edit Integration Blueprint' : 'Create Integration Blueprint'}
              </h2>
              <p className="text-[10px] text-zinc-500">Configure parameters, required fields, and step-by-step setup guides</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Blueprint Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Telegram Bot"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Unique Slug</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingType}
                    placeholder="e.g. telegram"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</label>
                <textarea
                  placeholder="Enter a description of what this integration does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none h-16"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs"
                  >
                    <option value="messaging">Messaging</option>
                    <option value="crm">CRM</option>
                    <option value="calendar">Calendar</option>
                    <option value="email">Email</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Icon Component</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs"
                  >
                    {Object.keys(ICON_MAP).map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* REQUIRED CONFIG FIELDS */}
              <div className="space-y-2 border-t border-zinc-100 dark:border-white/5 pt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Required Configuration Keys</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. api_key"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="px-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {requiredFields.map(field => (
                    <span key={field} className="flex items-center gap-1 text-[10px] bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 px-2 py-0.5 rounded-lg font-mono">
                      {field}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveField(field)}
                        className="text-rose-500 hover:text-rose-600 font-extrabold focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {requiredFields.length === 0 && (
                    <span className="text-xs text-zinc-400 italic">No keys added yet.</span>
                  )}
                </div>
              </div>

              {/* SETUP STEPS WIZARD CONFIG */}
              <div className="space-y-3 border-t border-zinc-100 dark:border-white/5 pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Setup Wizard Steps</label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-[10px] font-bold text-violet-500 hover:text-violet-600 flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Step
                  </button>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {setupSteps.map((step, idx) => (
                    <div key={idx} className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="absolute top-3 right-3 text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase">Step {idx + 1} Title</label>
                        <input
                          type="text"
                          required
                          value={step.title}
                          placeholder="e.g. Enter credentials"
                          onChange={(e) => handleStepChange(idx, 'title', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-lg text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase">Step {idx + 1} Description</label>
                        <textarea
                          required
                          value={step.description}
                          placeholder="Enter instructions for user..."
                          onChange={(e) => handleStepChange(idx, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-lg text-xs h-12"
                        />
                      </div>
                    </div>
                  ))}
                  {setupSteps.length === 0 && (
                    <span className="text-xs text-zinc-400 italic">No setup steps defined yet.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>Save Blueprint</>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  )
}
