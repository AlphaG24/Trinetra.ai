'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Undo2, Redo2, Search, Replace, HelpCircle, Check, 
  AlertCircle, Save, Trash2, Plus, ArrowUp, ArrowDown, 
  Code, Eye, Sparkles, FileText, CheckCircle2, RefreshCw,
  Image, Type, Table as TableIcon, List, Settings, Bold, Italic, Link, Info
} from 'lucide-react'
import { toast } from 'sonner'
import { updateExtraction } from '../../../../actions/structurer'
import { getBackendUrl } from '../../../../../utils/url'

interface StructuredEditorProps {
  runId: number | null
  extractionId: number | null
  initialData: any[]
  referenceSchemaName?: string
  onChange: (newData: any[]) => void
}

// ----------------------------------------------------------------------
// EditableField: Manages its own local state to eliminate typing lag
// Updates parent state only onBlur or when Enter is pressed
// ----------------------------------------------------------------------
interface EditableFieldProps {
  value: string | number
  onChange: (val: string | number) => void
  type?: 'text' | 'textarea' | 'number'
  className?: string
  rows?: number
  placeholder?: string
  validationError?: string | null
}

function EditableField({ value, onChange, type = 'text', className = '', rows = 2, placeholder = '', validationError = null }: EditableFieldProps) {
  const [localValue, setLocalValue] = useState<string | number>(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(type === 'number' ? Number(localValue) : localValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleBlur()
    }
  }

  if (type === 'textarea') {
    return (
      <div className="relative w-full">
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          rows={rows}
          placeholder={placeholder}
          className={`${className} w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500/60 transition-all font-sans leading-relaxed ${
            validationError ? 'border-red-500/60 focus:border-red-500 bg-red-500/5' : ''
          }`}
        />
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <input
        type={type === 'number' ? 'text' : 'text'} // use text to allow raw editing of numbers before parsing
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500/60 transition-all ${
          validationError ? 'border-red-500/60 focus:border-red-500 bg-red-500/5' : ''
        }`}
      />
    </div>
  )
}

// ----------------------------------------------------------------------
// RichTextToolbar: Markdown Helper Toolbar for textareas
// ----------------------------------------------------------------------
interface RichTextToolbarProps {
  onInsert: (prefix: string, suffix: string) => void
}

function RichTextToolbar({ onInsert }: RichTextToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-md shadow-md">
      <button
        type="button"
        onClick={() => onInsert('**', '**')}
        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onInsert('*', '*')}
        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onInsert('[', '](url)')}
        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
        title="Link"
      >
        <Link className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />
      <button
        type="button"
        onClick={() => onInsert('- ', '')}
        className="px-1.5 py-0.5 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded"
        title="Bullet List"
      >
        List
      </button>
      <button
        type="button"
        onClick={() => onInsert('$ ', ' $')}
        className="px-1.5 py-0.5 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded font-mono"
        title="Inline Formula"
      >
        Equation
      </button>
    </div>
  )
}

// ----------------------------------------------------------------------
// StructuredEditor component
// ----------------------------------------------------------------------
export function StructuredEditor({ runId, extractionId, initialData, referenceSchemaName, onChange }: StructuredEditorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual')
  const [jsonText, setJsonText] = useState<string>('')
  
  // History stack
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [replaceQuery, setReplaceQuery] = useState<string>('')
  const [showSearch, setShowSearch] = useState<boolean>(false)
  const [searchMatches, setSearchMatches] = useState<{ path: (string | number)[], index: number }[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1)

  // Validation
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [schemaWarnings, setSchemaWarnings] = useState<{ path: string, msg: string }[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Auto-save and dirty state
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)

  // Collapsed sections (performance helper for very large documents)
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({})

  // Internal parsed data state
  const [parsedData, setParsedData] = useState<any[]>(initialData)

  const isInternalChange = useRef<boolean>(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  // Sync scroll for the syntax highlighting editor
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop
      preRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  // Initialize raw JSON text and history stack on component load
  useEffect(() => {
    const formatted = JSON.stringify(initialData, null, 2)
    setJsonText(formatted)
    setParsedData(initialData)
    setHistory([formatted])
    setHistoryIndex(0)
    setIsDirty(false)
  }, [initialData])

  // Real-time syntax and schema validation
  useEffect(() => {
    if (!jsonText) return

    try {
      const parsed = JSON.parse(jsonText)
      setJsonError(null)
      const dataArray = Array.isArray(parsed) ? parsed : [parsed]
      
      const newWarnings: { path: string, msg: string }[] = []
      const newValidationErrors: Record<string, string> = {}

      // Heuristic validations (syntactic and schema constraints)
      const validateNode = (node: any, path: string = '') => {
        if (node === null || node === undefined) return

        if (typeof node === 'object') {
          const keys = Object.keys(node)
          keys.forEach(k => {
            const subPath = path ? `${path}.${k}` : k
            const val = node[k]

            // Empty field validation
            if (val === undefined || val === null || val === '') {
              newValidationErrors[subPath] = `Field cannot be empty`
            }

            // Numeric check validation
            if (k.toLowerCase().includes('amount') || k.toLowerCase().includes('price') || k.toLowerCase().includes('total')) {
              if (val !== '' && isNaN(Number(val))) {
                newValidationErrors[subPath] = `Expected a valid number`
              }
            }

            validateNode(val, subPath)
          })
        } else if (Array.isArray(node)) {
          node.forEach((item, idx) => {
            validateNode(item, `${path}[${idx}]`)
          })
        }
      }

      dataArray.forEach((item, index) => {
        validateNode(item, `Record ${index + 1}`)
      })

      // Schema warnings for missing fields compared to general schema names
      if (referenceSchemaName && referenceSchemaName !== 'None') {
        dataArray.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const keys = Object.keys(item)
            if (keys.length === 0) {
              newWarnings.push({ path: `Record ${index + 1}`, msg: `Record is empty` })
            }
          }
        })
      }

      setSchemaWarnings(newWarnings)
      setValidationErrors(newValidationErrors)
      
      if (!isInternalChange.current) {
        setParsedData(dataArray)
        onChange(dataArray)
      }
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax")
    }
  }, [jsonText, referenceSchemaName])

  // Debounced auto-save effect
  useEffect(() => {
    if (!isDirty || (!runId && !extractionId)) return

    const timer = setTimeout(() => {
      handleSave()
    }, 1500) // Auto-save after 1.5s idle

    return () => clearTimeout(timer)
  }, [isDirty, jsonText, runId, extractionId])

  // Warn on tab close if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes in the editor. Are you sure you want to leave?'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Keyboard shortcut listener (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyIndex, history])

  // Helper to handle state updates
  const updateJsonState = (newJson: string, pushHistory = true) => {
    setJsonText(newJson)
    setIsDirty(true)
    
    if (pushHistory) {
      const updatedHistory = history.slice(0, historyIndex + 1)
      updatedHistory.push(newJson)
      setHistory(updatedHistory)
      setHistoryIndex(updatedHistory.length - 1)
    }
  }

  // Push new parsed data back to raw JSON
  const handleVisualDataChange = (newData: any[]) => {
    isInternalChange.current = true
    const updatedJson = JSON.stringify(newData, null, 2)
    updateJsonState(updatedJson)
    setParsedData(newData)
    onChange(newData)
    isInternalChange.current = false
  }

  // Undo Action
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      const prevJson = history[prevIndex]
      setHistoryIndex(prevIndex)
      isInternalChange.current = true
      setJsonText(prevJson)
      try {
        const parsed = JSON.parse(prevJson)
        const arr = Array.isArray(parsed) ? parsed : [parsed]
        setParsedData(arr)
        onChange(arr)
      } catch (e) {}
      isInternalChange.current = false
      setIsDirty(true)
      toast.info('Undo action applied')
    }
  }

  // Redo Action
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      const nextJson = history[nextIndex]
      setHistoryIndex(nextIndex)
      isInternalChange.current = true
      setJsonText(nextJson)
      try {
        const parsed = JSON.parse(nextJson)
        const arr = Array.isArray(parsed) ? parsed : [parsed]
        setParsedData(arr)
        onChange(arr)
      } catch (e) {}
      isInternalChange.current = false
      setIsDirty(true)
      toast.info('Redo action applied')
    }
  }

  // Prettify JSON Formatter
  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      updateJsonState(formatted)
      toast.success('Formatted JSON text')
    } catch (err: any) {
      toast.error(`Format failed: ${err.message}`)
    }
  }

  // Search and Replace
  const handleSearchAndReplace = (replaceAll = false) => {
    if (!searchQuery) return

    if (replaceAll) {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedQuery, 'g')
      const replaced = jsonText.replace(regex, replaceQuery)
      if (replaced !== jsonText) {
        updateJsonState(replaced)
        toast.success(`Replaced all occurrences of "${searchQuery}"`)
      } else {
        toast.info('No matches found to replace')
      }
    } else {
      // Find matches in parsed data and auto-expand sections containing matches
      const matches: { path: (string | number)[], index: number }[] = []
      
      const scanNode = (node: any, path: (string | number)[] = []) => {
        if (node === null || node === undefined) return
        if (typeof node === 'string') {
          if (node.toLowerCase().includes(searchQuery.toLowerCase())) {
            matches.push({ path, index: matches.length })
            // Auto expand if root section is collapsed
            if (path.length > 0 && typeof path[0] === 'number') {
              setCollapsedSections(prev => ({ ...prev, [path[0] as number]: false }))
            }
          }
        } else if (typeof node === 'object') {
          Object.keys(node).forEach(k => {
            scanNode(node[k], [...path, k])
          })
        } else if (Array.isArray(node)) {
          node.forEach((item, idx) => {
            scanNode(item, [...path, idx])
          })
        }
      }

      scanNode(parsedData)
      setSearchMatches(matches)

      if (matches.length > 0) {
        const nextIdx = (currentMatchIndex + 1) % matches.length
        setCurrentMatchIndex(nextIdx)
        toast.info(`Found match ${nextIdx + 1} of ${matches.length}`)
      } else {
        toast.error(`No matches found for "${searchQuery}"`)
      }
    }
  }

  // Auto-save and Manual Save logic
  const handleSave = async () => {
    if ((!runId && !extractionId) || jsonError) return
    setIsSaving(true)
    try {
      if (runId) {
        const backendBaseUrl = getBackendUrl()
        await fetch(`${backendBaseUrl}/api/process-document/update/${runId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            extracted_data: parsedData
          })
        })
      }

      if (extractionId) {
        await updateExtraction(extractionId, parsedData)
      }

      setIsDirty(false)
      setLastSavedTime(new Date())
    } catch (e) {
      console.error("Autosave network error", e)
    } finally {
      setIsSaving(false)
    }
  }

  // ----------------------------------------------------------------------
  // Local Math Parser/Renderer
  // ----------------------------------------------------------------------
  const renderMathPreview = (text: string) => {
    if (!text || typeof text !== 'string') return null
    const mathRegex = /\$\$([\s\S]+?)\$\$|\$([\s\S]+?)\$/g
    const matches = text.match(mathRegex)

    if (!matches) return null

    return (
      <div className="mt-2 p-2 bg-zinc-950/60 border border-zinc-800 rounded-lg text-orange-400 font-mono text-[11px] flex flex-col space-y-1">
        <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-sans font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-orange-500 animate-pulse" />
          Equation Rendering (LaTeX Preview)
        </span>
        {matches.map((match, idx) => {
          const rawMath = match.replace(/\$/g, '').trim()
          return (
            <div key={idx} className="py-1.5 px-2 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-center overflow-x-auto">
              {React.createElement('math', { display: "block", className: "text-sm font-sans italic text-zinc-100" },
                React.createElement('mtext', null, rawMath)
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ----------------------------------------------------------------------
  // Image References block
  // ----------------------------------------------------------------------
  const renderImageBlock = (val: string, path: (string | number)[]) => {
    const isImageRef = /\[IMAGE:\s*(.*?)\s*\]/gi.test(val)
    if (!isImageRef) return null

    const match = /\[IMAGE:\s*(.*?)\s*\]/gi.exec(val)
    const description = match ? match[1] : 'Image Reference'

    return (
      <div className="mt-2 p-4 bg-zinc-950/80 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col sm:flex-row gap-4 items-center relative overflow-hidden group/image">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500/10 to-orange-500/5 hover:from-orange-500/20 rounded-lg border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 shadow-lg">
          <Image className="w-7 h-7" />
        </div>
        <div className="flex-1 w-full space-y-1 text-left">
          <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider flex items-center gap-1">
            Image Asset Reference
          </span>
          <EditableField 
            value={description}
            onChange={(newDesc) => handleFieldEdit(path, `[IMAGE: ${newDesc}]`)}
            className="font-semibold text-zinc-200 bg-zinc-900"
          />
          <span className="text-[9px] text-zinc-500 block leading-tight">
            Resolves directly to the referenced document asset during assembly.
          </span>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------------------
  // Recursive visual node parser
  // ----------------------------------------------------------------------
  const renderVisualNode = (node: any, path: (string | number)[]): React.ReactNode => {
    const stringPath = path.join('.')
    const validationError = validationErrors[stringPath]
    const hasSchemaWarning = schemaWarnings.some(w => w.path === stringPath)

    if (node === null || node === undefined) {
      return (
        <EditableField 
          value="" 
          onChange={(val) => handleFieldEdit(path, val)}
          validationError={validationError}
        />
      )
    }

    // Array Node: Render as spreadsheet tables or list item cards
    if (Array.isArray(node)) {
      const isTable = node.length > 0 && typeof node[0] === 'object' && node[0] !== null && !Array.isArray(node[0])
      
      if (isTable) {
        const headers = Object.keys(node[0]).filter(k => k !== '_confidence')
        return (
          <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/40 p-4 space-y-3 mt-2 shadow-inner">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-400 flex items-center gap-1">
                <TableIcon className="w-4 h-4 text-orange-500" />
                Table Grid ({node.length} Rows, {headers.length} Columns)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddTableColumn(path)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Column
                </button>
                <button
                  type="button"
                  onClick={() => handleAddTableRow(path, headers)}
                  className="px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/25 border border-orange-500/20 text-orange-400 hover:text-orange-300 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[300px]">
              <table className="min-w-full divide-y divide-zinc-800 text-xs">
                <thead>
                  <tr className="bg-zinc-900/50">
                    <th className="px-2 py-1.5 text-left text-zinc-500 font-bold uppercase tracking-wider w-[40px]">#</th>
                    {headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left text-zinc-400 font-bold uppercase tracking-wider capitalize group/col header-cell relative">
                        <div className="flex items-center justify-between gap-2">
                          <span>{h}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTableColumn(path, h)}
                            className="text-zinc-600 hover:text-red-400 opacity-0 group-hover/col:opacity-100 transition-opacity"
                            title="Delete Column"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-1.5 text-center text-zinc-500 font-bold uppercase tracking-wider w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {node.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="px-2 py-1.5 text-zinc-600 font-mono align-middle">{rowIdx + 1}</td>
                      {headers.map(h => {
                        const cellPath = [...path, rowIdx, h]
                        const cellPathStr = cellPath.join('.')
                        const cellErr = validationErrors[cellPathStr]
                        return (
                          <td key={h} className="px-2 py-1.5 align-middle">
                            <EditableField 
                              value={row[h] !== undefined ? String(row[h]) : ''} 
                              onChange={(val) => handleFieldEdit(cellPath, val)}
                              validationError={cellErr}
                              className="bg-transparent border-zinc-850 hover:bg-zinc-900 focus:bg-zinc-950 font-sans text-xs py-1"
                            />
                            {row[h] && String(row[h]).startsWith('$') && renderMathPreview(String(row[h]))}
                            {row[h] && String(row[h]).includes('[IMAGE:') && renderImageBlock(String(row[h]), cellPath)}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1.5 text-center align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveTableRow(path, rowIdx, 'up')}
                            disabled={rowIdx === 0}
                            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-20"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTableRow(path, rowIdx, 'down')}
                            disabled={rowIdx === node.length - 1}
                            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-20"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTableRow(path, rowIdx)}
                            className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      // Default rendering for list array
      return (
        <div className="space-y-2 pl-3 border-l-2 border-orange-500/20 mt-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <List className="w-3.5 h-3.5 text-orange-500" />
              List elements ({node.length})
            </span>
            <button
              type="button"
              onClick={() => handleAddListItem(path)}
              className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-0.5 font-bold cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
          {node.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 group/item">
              <span className="text-[10px] text-zinc-600 font-mono font-bold w-4 shrink-0">{idx + 1}.</span>
              <div className="flex-1">
                {renderVisualNode(item, [...path, idx])}
              </div>
              <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveListItem(path, idx, 'up')}
                  className="p-0.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-20"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === node.length - 1}
                  onClick={() => handleMoveListItem(path, idx, 'down')}
                  className="p-0.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-20"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteListItem(path, idx)}
                  className="p-0.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Object Node: Render custom structured properties
    if (typeof node === 'object' && node !== null) {
      const keys = Object.keys(node)
      
      const hasHeading = keys.includes('heading') || keys.includes('title')
      const hasContent = keys.includes('content') || keys.includes('text') || keys.includes('section_text')
      const isDocumentBlock = hasHeading && hasContent

      if (isDocumentBlock) {
        const headingKey = keys.includes('heading') ? 'heading' : 'title'
        const contentKey = keys.includes('content') ? 'content' : keys.includes('text') ? 'text' : 'section_text'
        return (
          <div className="space-y-4">
            {/* Heading section field */}
            <div className="flex items-center gap-3">
              <div className="p-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded shrink-0">
                <Type className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <EditableField 
                  value={String(node[headingKey])} 
                  onChange={(val) => handleFieldEdit([...path, headingKey], val)}
                  validationError={validationErrors[[...path, headingKey].join('.')]}
                  className="bg-transparent border-transparent hover:border-zinc-800 text-sm font-bold text-zinc-100 py-1"
                />
              </div>
              {node['_confidence'] && (
                <div className="relative">
                  <select
                    value={String(node['_confidence'])}
                    onChange={(e) => handleFieldEdit([...path, '_confidence'], e.target.value)}
                    className={`text-[9px] px-2 py-1 rounded bg-zinc-950 font-mono font-bold capitalize cursor-pointer outline-none border focus:ring-1 focus:ring-orange-500 ${
                      node['_confidence'] === 'high' ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5' :
                      node['_confidence'] === 'medium' ? 'text-amber-400 border-amber-500/25 bg-amber-500/5' :
                      'text-red-400 border-red-500/25 bg-red-500/5'
                    }`}
                  >
                    <option value="high">High Confidence</option>
                    <option value="medium">Medium Confidence</option>
                    <option value="low">Low Confidence</option>
                  </select>
                </div>
              )}
            </div>

            {/* Rich text formatting area */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                <span>Text Body</span>
                <RichTextToolbar 
                  onInsert={(prefix, suffix) => {
                    const activeVal = String(node[contentKey])
                    handleFieldEdit([...path, contentKey], `${activeVal}${prefix}text${suffix}`)
                  }} 
                />
              </div>
              <EditableField 
                value={String(node[contentKey])} 
                onChange={(val) => handleFieldEdit([...path, contentKey], val)}
                type="textarea"
                rows={4}
                validationError={validationErrors[[...path, contentKey].join('.')]}
              />
              {renderMathPreview(String(node[contentKey]))}
              {String(node[contentKey]).includes('[IMAGE:') && renderImageBlock(String(node[contentKey]), [...path, contentKey])}
            </div>

            {/* Remaining properties */}
            {keys.filter(k => k !== headingKey && k !== contentKey && k !== '_confidence').map(k => (
              <div key={k} className="space-y-1 mt-3">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider capitalize">{k}</span>
                {renderVisualNode(node[k], [...path, k])}
              </div>
            ))}
          </div>
        )
      }

      // Default visual nested key-value node grid
      return (
        <div className="grid grid-cols-1 gap-3 p-3 bg-zinc-950/20 border border-zinc-800/40 rounded-xl mt-2">
          {keys.map(k => {
            const val = node[k]
            const isValObject = typeof val === 'object' && val !== null
            const childPath = [...path, k]
            const childPathStr = childPath.join('.')
            const childErr = validationErrors[childPathStr]
            const childWarn = schemaWarnings.some(w => w.path === childPathStr)

            return (
              <div key={k} className={`flex ${isValObject ? 'flex-col space-y-2' : 'items-center gap-4'} text-xs relative group/row`}>
                <div className="w-[140px] shrink-0 text-zinc-400 font-mono text-[11px] truncate flex items-center gap-1" title={k}>
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                  <span>{k}</span>
                  {childErr && (
                    <span className="text-red-400" title={childErr}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    </span>
                  )}
                  {childWarn && (
                    <span className="text-amber-500" title="Missing from schema layout">
                      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    </span>
                  )}
                </div>
                <div className="flex-1 w-full relative">
                  {renderVisualNode(val, childPath)}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteObjectKey(path, k)}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-red-400 absolute right-2 top-1 rounded"
                  title="Remove Field"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => handleAddObjectKey(path)}
              className="text-[10px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Field
            </button>
          </div>
        </div>
      )
    }

    // Primitive Node (string, number)
    const valString = String(node)
    return (
      <div className="w-full relative">
        <EditableField 
          value={node} 
          onChange={(val) => handleFieldEdit(path, val)}
          type={typeof node === 'number' ? 'number' : 'text'}
          validationError={validationError}
        />
        {valString.startsWith('$') && renderMathPreview(valString)}
        {valString.includes('[IMAGE:') && renderImageBlock(valString, path)}
      </div>
    )
  }

  // ----------------------------------------------------------------------
  // Visual Manipulations Helpers
  // ----------------------------------------------------------------------
  const handleFieldEdit = (path: (string | number)[], value: any) => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    
    const lastKey = path[path.length - 1]
    
    if (value !== '' && !isNaN(Number(value)) && typeof current[lastKey] === 'number') {
      current[lastKey] = Number(value)
    } else {
      current[lastKey] = value
    }

    handleVisualDataChange(updatedData)
  }

  const handleAddTableRow = (path: (string | number)[], headers: string[]) => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    const newRow = headers.reduce((acc, h) => ({ ...acc, [h]: '' }), {})
    current.push(newRow)
    handleVisualDataChange(updatedData)
    toast.success('Row added to table')
  }

  const handleDeleteTableRow = (path: (string | number)[], rowIdx: number) => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    current.splice(rowIdx, 1)
    handleVisualDataChange(updatedData)
    toast.info('Row deleted')
  }

  const handleMoveTableRow = (path: (string | number)[], rowIdx: number, direction: 'up' | 'down') => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    const targetIdx = direction === 'up' ? rowIdx - 1 : rowIdx + 1
    const temp = current[rowIdx]
    current[rowIdx] = current[targetIdx]
    current[targetIdx] = temp
    handleVisualDataChange(updatedData)
  }

  const handleAddTableColumn = (path: (string | number)[]) => {
    const columnName = prompt("Enter new column name:")
    if (!columnName || !columnName.trim()) return

    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    
    if (Array.isArray(current)) {
      current.forEach(row => {
        if (typeof row === 'object' && row !== null) {
          row[columnName.trim()] = ''
        }
      })
      handleVisualDataChange(updatedData)
      toast.success(`Column '${columnName}' added`)
    }
  }

  const handleDeleteTableColumn = (path: (string | number)[], header: string) => {
    if (!confirm(`Are you sure you want to delete the column '${header}'?`)) return
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    
    if (Array.isArray(current)) {
      current.forEach(row => {
        if (typeof row === 'object' && row !== null) {
          delete row[header]
        }
      })
      handleVisualDataChange(updatedData)
      toast.info(`Column '${header}' deleted`)
    }
  }

  const handleAddListItem = (path: (string | number)[]) => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    current.push('')
    handleVisualDataChange(updatedData)
  }

  const handleDeleteListItem = (path: (string | number)[], idx: number) => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    current.splice(idx, 1)
    handleVisualDataChange(updatedData)
  }

  const handleMoveListItem = (path: (string | number)[], idx: number, direction: 'up' | 'down') => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    const temp = current[idx]
    current[idx] = current[targetIdx]
    current[targetIdx] = temp
    handleVisualDataChange(updatedData)
  }

  const handleAddObjectKey = (path: (string | number)[]) => {
    const keyName = prompt("Enter new field key name:")
    if (!keyName || !keyName.trim()) return

    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    current[keyName.trim()] = ""
    handleVisualDataChange(updatedData)
    toast.success(`Field '${keyName}' added`)
  }

  const handleDeleteObjectKey = (path: (string | number)[], keyName: string) => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    let current = updatedData
    for (const key of path) {
      current = current[key]
    }
    delete current[keyName]
    handleVisualDataChange(updatedData)
    toast.info(`Field '${keyName}' removed`)
  }

  const handleAddNewSection = () => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    const newSection = {
      heading: "New Document Heading Section",
      content: "Enter main body text here...",
      _confidence: "high"
    }
    updatedData.push(newSection)
    handleVisualDataChange(updatedData)
    toast.success('Section block added to page')
  }

  const handleMoveSection = (idx: number, direction: 'up' | 'down') => {
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    const temp = updatedData[idx]
    updatedData[idx] = updatedData[targetIdx]
    updatedData[targetIdx] = temp
    handleVisualDataChange(updatedData)
  }

  const handleDeleteSection = (idx: number) => {
    if (!confirm("Are you sure you want to delete this complete section?")) return
    const updatedData = JSON.parse(JSON.stringify(parsedData))
    updatedData.splice(idx, 1)
    handleVisualDataChange(updatedData)
    toast.info('Section deleted')
  }

  // ----------------------------------------------------------------------
  // Local JSON syntax highlighter helper
  // ----------------------------------------------------------------------
  const highlightedJson = useMemo(() => {
    if (!jsonText) return ''
    let html = jsonText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g
    return html.replace(regex, (match) => {
      let cls = 'text-amber-500 font-semibold' // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-purple-400 font-bold' // key
        } else {
          cls = 'text-emerald-400' // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-blue-400 font-bold' // boolean
      } else if (/null/.test(match)) {
        cls = 'text-zinc-500 italic' // null
      }
      return `<span class="${cls}">${match}</span>`
    })
  }, [jsonText])

  const editorStyles = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    boxSizing: 'border-box' as const,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl gap-3">
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 flex">
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visual Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw JSON</span>
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              className="p-1.5 border border-zinc-850 hover:border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              className="p-1.5 border border-zinc-855 hover:border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeTab === 'json' && (
            <button
              type="button"
              onClick={handlePrettify}
              className="px-2.5 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Format JSON
            </button>
          )}

          {activeTab === 'visual' && (
            <button
              type="button"
              onClick={handleAddNewSection}
              className="px-2.5 py-1.5 border border-orange-500/20 hover:border-orange-500/35 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Section
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Search Toggle */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              showSearch 
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' 
                : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Search & Replace"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Autosave Status */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 select-none">
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                <span>Autosaving...</span>
              </>
            ) : isDirty ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-400">Unsaved Edits</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Saved</span>
              </>
            )}
            {lastSavedTime && !isDirty && !isSaving && (
              <span className="text-[10px] text-zinc-600 font-mono">
                ({lastSavedTime.toLocaleTimeString()})
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!isDirty || isSaving || !!jsonError}
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-900 disabled:text-zinc-650 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow transition-all duration-300"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Search & Replace Drawer */}
      {showSearch && (
        <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-3 shadow-inner">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none focus:border-orange-500"
            />
          </div>
          <div className="relative w-full sm:flex-1">
            <Replace className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={() => handleSearchAndReplace(false)}
              className="px-3.5 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Find Match
            </button>
            <button
              onClick={() => handleSearchAndReplace(true)}
              className="px-3.5 py-2 bg-orange-500/20 hover:bg-orange-500/35 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-bold cursor-pointer"
            >
              Replace All
            </button>
          </div>
        </div>
      )}

      {/* Validations Warnings and Schema mismatches alert banners */}
      {jsonError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-3.5 flex gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5 animate-bounce" />
          <div className="space-y-0.5">
            <span className="font-bold">JSON Syntax Error:</span>
            <p className="opacity-90 leading-relaxed font-mono text-[11px]">{jsonError}</p>
          </div>
        </div>
      )}

      {Object.keys(validationErrors).length > 0 && !jsonError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-3.5 flex gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <div className="space-y-1 w-full">
            <span className="font-bold">Invalid Value Warnings ({Object.keys(validationErrors).length}):</span>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] max-h-[100px] overflow-y-auto leading-normal opacity-90 font-mono">
              {Object.entries(validationErrors).map(([path, err]) => (
                <li key={path}>
                  <span className="text-zinc-400">{path}:</span> {err}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {schemaWarnings.length > 0 && !jsonError && (
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-3.5 flex gap-2.5 text-xs text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1 w-full">
            <span className="font-bold">Schema Structural Layout Mismatches ({schemaWarnings.length}):</span>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] max-h-[100px] overflow-y-auto leading-normal opacity-90 font-mono">
              {schemaWarnings.map((warn, idx) => (
                <li key={idx}>
                  <span className="text-zinc-400">{warn.path}:</span> {warn.msg}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main Editors Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'visual' ? (
          <div className="space-y-4">
            {jsonError && (
              <div className="flex flex-col items-center justify-center p-8 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <span className="text-sm font-bold text-zinc-300">Visual Editor Disabled</span>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  The current JSON content contains invalid syntax. Correct it in the Raw JSON view to restore the Visual Editor.
                </p>
              </div>
            )}
            
            {!jsonError && parsedData.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs italic">
                No sections or structured documents found. Click "Add Section" to create one.
              </div>
            )}

            {!jsonError && parsedData.map((node, idx) => {
              const isCollapsed = !!collapsedSections[idx]
              return (
                <div 
                  key={idx} 
                  className="relative border border-zinc-850 bg-zinc-900/20 hover:border-zinc-800/80 rounded-2xl p-4 transition-all duration-300 group shadow-lg"
                >
                  {/* Toggle Collapsible header bar */}
                  <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isCollapsed ? '[+]' : '[-]'}</span>
                      <span className="capitalize">
                        {node.heading || node.title || `Section ${idx + 1}`}
                      </span>
                    </button>

                    {/* Section actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSection(idx, 'up')}
                        className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === parsedData.length - 1}
                        onClick={() => handleMoveSection(idx, 'down')}
                        className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(idx)}
                        className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && renderVisualNode(node, [idx])}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="relative w-full h-[460px] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
            {/* Syntax Highlighted Code Overlay */}
            <pre 
              ref={preRef}
              style={{ ...editorStyles, margin: 0 }}
              className="absolute inset-0 p-4 pointer-events-none select-none overflow-auto"
              dangerouslySetInnerHTML={{ __html: highlightedJson }}
            />
            {/* Transparent Textarea for user typing */}
            <textarea
              ref={textareaRef}
              value={jsonText}
              onChange={(e) => updateJsonState(e.target.value)}
              onScroll={handleScroll}
              style={{ ...editorStyles, margin: 0 }}
              className="absolute inset-0 p-4 w-full h-full bg-transparent text-transparent caret-white resize-none outline-none leading-relaxed overflow-auto border-none focus:ring-0 focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  )
}
