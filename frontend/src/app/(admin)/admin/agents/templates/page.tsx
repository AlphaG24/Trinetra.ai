'use client'

import { useState, useEffect } from 'react'
import { 
  Bot, 
  Sparkles, 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  Code 
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface TemplateBlueprint {
  firstMessage: string
  systemPrompt: string
  functions: any[]
}

type BlueprintsMap = Record<string, TemplateBlueprint>

export default function AdminAgentTemplatesPage() {
  const [blueprints, setBlueprints] = useState<BlueprintsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Selection & Editor state
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [firstMessage, setFirstMessage] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [functionsInput, setFunctionsInput] = useState('')

  // Adding new template state
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')

  const fetchBlueprints = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/blueprints')
      if (!res.ok) throw new Error('Failed to load blueprints')
      const data = await res.json()
      setBlueprints(data.blueprints || {})
      
      const roles = Object.keys(data.blueprints || {})
      if (roles.length > 0) {
        selectRole(roles[0], data.blueprints)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlueprints()
  }, [])

  const selectRole = (role: string, currentMap: BlueprintsMap = blueprints) => {
    setSelectedRole(role)
    const bp = currentMap[role]
    if (bp) {
      setFirstMessage(bp.firstMessage || '')
      setSystemPrompt(bp.systemPrompt || '')
      setFunctionsInput(JSON.stringify(bp.functions || [], null, 2))
    }
  }

  const handleAddNewTemplate = () => {
    if (!newRoleName.trim()) {
      toast.error('Template name cannot be empty')
      return
    }

    if (newRoleName in blueprints) {
      toast.error('A template with this name already exists')
      return
    }

    const updated = {
      ...blueprints,
      [newRoleName.trim()]: {
        firstMessage: 'Hello, I am {agentName}. How can I assist you?',
        systemPrompt: 'You are a helpful assistant for {userName}.',
        functions: []
      }
    }

    setBlueprints(updated)
    setIsAddingNew(false)
    setNewRoleName('')
    selectRole(newRoleName.trim(), updated)
    toast.success('New template added to local state! Save changes to persist.')
  }

  const handleDeleteTemplate = (roleToDelete: string) => {
    if (roleToDelete === 'Custom') {
      toast.error('The default Custom template cannot be deleted')
      return
    }

    if (!confirm(`Are you sure you want to delete the "${roleToDelete}" template?`)) return

    const updated = { ...blueprints }
    delete updated[roleToDelete]

    setBlueprints(updated)
    const remainingRoles = Object.keys(updated)
    if (remainingRoles.length > 0) {
      selectRole(remainingRoles[0], updated)
    } else {
      setSelectedRole(null)
      setFirstMessage('')
      setSystemPrompt('')
      setFunctionsInput('[]')
    }
    toast.success('Template deleted from local state. Save changes to persist.')
  }

  const handleSaveChanges = async () => {
    if (!selectedRole) return

    let parsedFunctions = []
    try {
      parsedFunctions = JSON.parse(functionsInput)
      if (!Array.isArray(parsedFunctions)) {
        throw new Error('Functions must be an array')
      }
    } catch (e: any) {
      toast.error('Invalid functions JSON structure: ' + e.message)
      return
    }

    setSaving(true)

    // Update local selected role in map first
    const updatedBlueprints = {
      ...blueprints,
      [selectedRole]: {
        firstMessage,
        systemPrompt,
        functions: parsedFunctions
      }
    }

    try {
      const res = await fetch('/api/admin/blueprints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprints: updatedBlueprints })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save blueprints')
      }

      setBlueprints(updatedBlueprints)
      toast.success('All agent templates saved successfully! 🚀')
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--heading)] flex items-center gap-2 font-display">
            <Bot className="w-8 h-8 text-violet-500" /> Agent Templates
          </h1>
          <p className="text-[var(--body)] text-sm mt-1">
            Configure default prompt structures, greetings, and system functions applied during onboarding setup.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveChanges}
            disabled={saving || !selectedRole}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-violet-600/15"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save All Templates
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--heading)] transition-colors bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-4 py-2 hover:bg-[var(--hover-bg)] shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-[var(--muted)] gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" /> Loading templates console...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Templates Sidebar */}
          <div className="lg:col-span-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Templates List</h3>
              
              {!isAddingNew ? (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="p-1.5 rounded-lg bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setIsAddingNew(false)}
                  className="p-1.5 rounded-lg bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isAddingNew && (
              <div className="p-3 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl space-y-2 animate-in slide-in-from-top duration-200">
                <input
                  type="text"
                  placeholder="e.g. Real Estate Agent"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:border-violet-500 outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsAddingNew(false)}
                    className="px-2.5 py-1 text-[10px] bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)] rounded-lg hover:text-[var(--heading)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNewTemplate}
                    className="px-2.5 py-1 text-[10px] bg-violet-600 text-white rounded-lg hover:bg-violet-500 cursor-pointer font-semibold shadow-xs"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              {Object.keys(blueprints).map((role) => (
                <div
                  key={role}
                  onClick={() => selectRole(role)}
                  className={`flex justify-between items-center p-3 border rounded-xl cursor-pointer transition-all ${
                    selectedRole === role
                      ? 'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300 font-semibold shadow-xs'
                      : 'bg-[var(--hover-bg)] border-[var(--border)] text-[var(--body)] hover:border-[var(--muted)]/40 hover:text-[var(--heading)]'
                  }`}
                >
                  <span className="text-xs truncate">{role}</span>
                  {role !== 'Custom' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTemplate(role)
                      }}
                      className="text-[var(--muted)] hover:text-rose-500 p-1 rounded hover:bg-[var(--card-bg)] transition-all cursor-pointer"
                      style={{ opacity: selectedRole === role ? 1 : undefined }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Template Editor */}
          <div className="lg:col-span-2">
            {selectedRole ? (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
                <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                  <div>
                    <h3 className="text-base font-bold text-[var(--heading)] flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-violet-500" />
                      Configure: {selectedRole}
                    </h3>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">
                      Use placeholders <code className="text-violet-600 dark:text-violet-400 font-mono">&#123;agentName&#125;</code> and <code className="text-violet-600 dark:text-violet-400 font-mono">&#123;userName&#125;</code> inside greetings & prompts.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* First Message */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block">Greeting / First Message</label>
                    <input
                      type="text"
                      value={firstMessage}
                      onChange={(e) => setFirstMessage(e.target.value)}
                      className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:border-violet-500 outline-none"
                      placeholder="Enter the greeting message..."
                    />
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block">System Directive / Prompt</label>
                    <textarea
                      rows={6}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg p-3.5 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:border-violet-500 outline-none"
                      placeholder="Specify AI system directive prompt..."
                    />
                  </div>

                  {/* Functions JSON */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block flex items-center gap-1">
                      <Code className="w-3.5 h-3.5 text-[var(--muted)]" /> System Functions (JSON Array)
                    </label>
                    <textarea
                      rows={8}
                      value={functionsInput}
                      onChange={(e) => setFunctionsInput(e.target.value)}
                      className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg p-3.5 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:border-violet-500 outline-none font-mono"
                      placeholder="e.g. [] or [{ name: 'save_lead', ... }]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--card-bg)] border border-dashed border-[var(--border)] rounded-2xl p-16 text-center text-[var(--muted)] text-xs flex flex-col items-center justify-center min-h-[300px] shadow-xs">
                <Bot className="w-10 h-10 text-[var(--muted)] mb-2 animate-pulse" />
                Select or create an agent prompt blueprint from the list.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
