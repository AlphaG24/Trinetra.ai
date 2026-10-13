'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { BriefcaseBusiness, Headphones, CalendarCheck, UserSearch, MessageSquare, Edit2, RotateCcw, Save, X, CheckCircle2, Circle } from 'lucide-react'

interface PromptTemplate {
  id: string
  personality_type: string
  system_prompt: string
  description: string | null
  is_active: boolean
  updated_at: string
}

interface PromptTemplatesClientProps {
  templates: PromptTemplate[]
}

const PERSONALITY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  sales: { label: 'Sales', icon: BriefcaseBusiness, color: 'violet' },
  support: { label: 'Support', icon: Headphones, color: 'blue' },
  appointment: { label: 'Appointment', icon: CalendarCheck, color: 'emerald' },
  lead_qualifier: { label: 'Lead Qualifier', icon: UserSearch, color: 'amber' },
  general: { label: 'General', icon: MessageSquare, color: 'zinc' },
}

const COLOR_CLASSES: Record<string, string> = {
  violet: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  zinc: 'bg-zinc-800/50 border-zinc-700/30 text-zinc-400',
}

export function PromptTemplatesClient({ templates: initialTemplates }: PromptTemplatesClientProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(initialTemplates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)

  const startEdit = (t: PromptTemplate) => {
    setEditingId(t.id)
    setEditPrompt(t.system_prompt)
    setEditDesc(t.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPrompt('')
    setEditDesc('')
  }

  const handleSave = async (personalityType: string) => {
    if (!editPrompt.trim()) {
      toast.error('System prompt cannot be empty')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/prompt-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personality_type: personalityType,
          system_prompt: editPrompt,
          description: editDesc,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')

      setTemplates((prev) =>
        prev.map((t) =>
          t.personality_type === personalityType ? { ...t, ...data.template } : t
        )
      )
      toast.success(`${PERSONALITY_META[personalityType]?.label || personalityType} prompt saved!`)
      cancelEdit()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (personalityType: string) => {
    if (!confirm(`Reset "${PERSONALITY_META[personalityType]?.label}" prompt to the original file? This cannot be undone.`)) return
    setResetting(personalityType)
    try {
      const res = await fetch('/api/admin/prompt-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality_type: personalityType, reset_to_default: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')

      setTemplates((prev) =>
        prev.map((t) =>
          t.personality_type === personalityType ? { ...t, ...data.template } : t
        )
      )
      toast.success('Prompt reset to default')
      if (editingId) cancelEdit()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setResetting(null)
    }
  }

  const handleToggleActive = async (t: PromptTemplate) => {
    try {
      const res = await fetch('/api/admin/prompt-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality_type: t.personality_type, is_active: !t.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Toggle failed')
      setTemplates((prev) =>
        prev.map((row) => (row.personality_type === t.personality_type ? { ...row, is_active: !row.is_active } : row))
      )
      toast.success(`${t.personality_type} template ${!t.is_active ? 'activated' : 'deactivated'}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p>No prompt templates found.</p>
        <p className="text-xs mt-2">Run the database migration to seed the default templates.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {templates.map((t) => {
        const meta = PERSONALITY_META[t.personality_type] || { label: t.personality_type, icon: MessageSquare, color: 'zinc' }
        const Icon = meta.icon
        const colorClass = COLOR_CLASSES[meta.color]
        const isEditing = editingId === t.id
        const isResetting = resetting === t.personality_type

        return (
          <div
            key={t.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm overflow-hidden"
          >
            {/* Header Row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--heading)] font-playfair">{meta.label}</span>
                    {t.is_active ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-[var(--text-muted)] border border-[var(--border)]">
                        <Circle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-merriweather">{t.description || '—'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(t)}
                  title={t.is_active ? 'Deactivate' : 'Activate'}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--heading)] transition-colors"
                >
                  {t.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleReset(t.personality_type)}
                  disabled={isResetting}
                  title="Reset to default file"
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-amber-500 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => (isEditing ? cancelEdit() : startEdit(t))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors font-playfair ${
                    isEditing
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-[var(--foreground)] hover:bg-zinc-300 dark:hover:bg-zinc-700'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  {isEditing ? <><X className="w-3 h-3" /> Cancel</> : <><Edit2 className="w-3 h-3" /> Edit</>}
                </button>
              </div>
            </div>

            {/* Expanded editor */}
            {isEditing && (
              <div className="border-t border-[var(--border)] px-5 py-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-playfair">Description</label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Short description of this personality type..."
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-playfair">System Prompt</label>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{editPrompt.length} chars</span>
                  </div>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    rows={16}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-xs text-[var(--foreground)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-y"
                    placeholder="Enter the full system prompt for this personality..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--heading)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-playfair"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(t.personality_type)}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-sm font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-60 font-playfair"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white dark:border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>

                <p className="text-[10px] text-[var(--text-muted)] font-mono">
                  Updated: {new Date(t.updated_at).toLocaleString()}. Changes take effect immediately for new calls after the backend restarts.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
