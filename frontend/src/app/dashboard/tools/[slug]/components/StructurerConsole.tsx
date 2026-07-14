'use client'

import React, { useState, useRef, useEffect } from 'react'
import { processDocument, getExtractionsHistory, checkQuota, saveExtraction } from '../../../../actions/structurer'
import { StructuredEditor } from './StructuredEditor'
import { 
  FileText, FileJson, UploadCloud, Play, Database, 
  Sliders, RefreshCw, Copy, Check, Info, AlertTriangle, X, Clock 
} from 'lucide-react'
import { toast } from 'sonner'
import { downloadExport, canBeTabular } from '../../../../../utils/exportUtils'
import { getBackendUrl } from '../../../../../utils/url'



interface StructurerConsoleProps {
  service: any
  quota: any
}

export function StructurerConsole({ service, quota }: StructurerConsoleProps) {
  const [sourceFiles, setSourceFiles] = useState<File[]>([])
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [instructions, setInstructions] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportFormat, setExportFormat] = useState<string>('xlsx')
  
  // Resumable processing state fields
  const [currentRunId, setCurrentRunId] = useState<number | null>(null)
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [completedChunksCount, setCompletedChunksCount] = useState<number>(0)
  const [totalChunksCount, setTotalChunksCount] = useState<number>(0)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [recoverableErrors, setRecoverableErrors] = useState<string[]>([])
  const [resumableRuns, setResumableRuns] = useState<any[]>([])
  const [loadingRuns, setLoadingRuns] = useState<boolean>(false)
  const [currentExtractionId, setCurrentExtractionId] = useState<number | null>(null)

  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true)

  const fetchResumableRuns = async () => {
    const backendBaseUrl = getBackendUrl()
    setLoadingRuns(true)
    try {
      const res = await fetch(`${backendBaseUrl}/api/process-document/runs`)
      if (res.ok) {
        const responseJson = await res.json()
        const data = responseJson && responseJson.data !== undefined ? responseJson.data : responseJson
        if (Array.isArray(data)) {
          // Filter runs that are paused, partially successful, or processing
          setResumableRuns(data.filter((r: any) => r.status === 'paused' || r.status === 'partial_success' || r.status === 'processing'))
        }
      }
    } catch (err) {
      console.error("Failed to fetch resumable runs:", err)
    } finally {
      setLoadingRuns(false)
    }
  }

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const extractions = await getExtractionsHistory()
        if (extractions) {
          setHistory(extractions)
        }
      } catch (err) {
        console.error("Failed to retrieve extraction history:", err)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
    fetchResumableRuns()
  }, [])

  useEffect(() => {
    if (referenceFile) {
      const name = referenceFile.name.toLowerCase()
      const ext = name.split('.').pop()
      if (ext && ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'tsv', 'json', 'xml', 'yaml', 'yml', 'html', 'htm', 'md', 'markdown', 'txt'].includes(ext)) {
        let normalizedExt = ext
        if (ext === 'yml') normalizedExt = 'yaml'
        if (ext === 'htm') normalizedExt = 'html'
        if (ext === 'markdown') normalizedExt = 'md'
        setExportFormat(normalizedExt)
      }
    }
  }, [referenceFile])

  const getExpirationString = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime()
    const expireTime = createdTime + 7 * 24 * 60 * 60 * 1000 // 7 days in ms
    const now = Date.now()
    const msRemaining = expireTime - now

    if (msRemaining <= 0) {
      return "Expired"
    }

    const days = Math.floor(msRemaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    if (days > 0) {
      return `Expires in ${days}d, ${hours}h`
    }
    return `Expires in ${hours}h`
  }

  const handleSelectHistory = (record: any) => {
    if (isProcessing) return
    setCurrentExtractionId(record.id)
    let loadedData = record.extracted_json
    if (loadedData && typeof loadedData === 'object' && 'extracted_data' in loadedData) {
      loadedData = loadedData.extracted_data
    }
    const loadedDataArray = Array.isArray(loadedData) ? loadedData : [loadedData]
    const jsonString = JSON.stringify(loadedDataArray, null, 2)
    setEditedDataString(jsonString)
    setExtractedData(loadedDataArray)
    setError(null)
    toast.success(`Loaded history for ${record.document_path}`)
    setIsHistoryOpen(false)
  }
  const [editedDataString, setEditedDataString] = useState<string>('')
  const [extractedData, setExtractedData] = useState<any[]>([])
  const [copied, setCopied] = useState<boolean>(false)

  const [isDraggingSource, setIsDraggingSource] = useState(false)
  const [isDraggingReference, setIsDraggingReference] = useState(false)

  const sourceInputRef = useRef<HTMLInputElement>(null)
  const referenceInputRef = useRef<HTMLInputElement>(null)

  const handleSourceDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (isProcessing) return
    setIsDraggingSource(true)
  }

  const handleSourceDragLeave = () => {
    setIsDraggingSource(false)
  }

  const validateSourceFile = (file: File): boolean => {
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      toast.error(`Invalid file type. Source file must be one of: ${allowedExtensions.join(', ')}`)
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Source file exceeds 10MB limit.")
      return false
    }
    return true
  }

  const handleSourceDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingSource(false)
    if (isProcessing) return
    const files = Array.from(e.dataTransfer.files || [])
    const validFiles = files.filter(validateSourceFile)
    if (validFiles.length > 0) {
      setSourceFiles(prev => [...prev, ...validFiles])
      setError(null)
      setEditedDataString('')
      setExtractedData([])
    }
  }

  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(validateSourceFile)
    if (validFiles.length > 0) {
      setSourceFiles(prev => [...prev, ...validFiles])
      setError(null)
      setEditedDataString('')
      setExtractedData([])
    }
  }

  const handleRefDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (isProcessing) return
    setIsDraggingReference(true)
  }

  const handleRefDragLeave = () => {
    setIsDraggingReference(false)
  }

  const validateReferenceFile = (file: File): boolean => {
    const allowedExtensions = ['.xlsx', '.csv', '.json']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      toast.error(`Invalid file type. Reference template must be one of: ${allowedExtensions.join(', ')}`)
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Reference file exceeds 10MB limit.")
      return false
    }
    return true
  }

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingReference(false)
    if (isProcessing) return
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && validateReferenceFile(droppedFile)) {
      setReferenceFile(droppedFile)
      setError(null)
      setEditedDataString('')
    }
  }

  const handleRefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return
    const selectedFile = e.target.files?.[0]
    if (selectedFile && validateReferenceFile(selectedFile)) {
      setReferenceFile(selectedFile)
      setError(null)
      setEditedDataString('')
    }
  }

  const runStreamingExtraction = async (resumingRunId?: number) => {
    if (!resumingRunId && sourceFiles.length === 0) {
      toast.error("Please upload a source document to start.")
      return
    }

    setIsProcessing(true)
    setError(null)
    setRecoveryError(null)

    if (!resumingRunId) {
      setEditedDataString('')
      setExtractedData([])
      setProgressPercent(0)
      setCompletedChunksCount(0)
      setTotalChunksCount(0)
      setCurrentRunId(null)
      setCurrentExtractionId(null)
      setWarnings([])
      setRecoverableErrors([])
    }

    try {
      // 1. Quota check (only check if starting a new run)
      let quotaData: any = null
      if (!resumingRunId) {
        quotaData = await checkQuota()
        if (!quotaData || !quotaData.ok) {
          throw new Error("Quota check failed.")
        }
      }

      // Process the first source file in the queue
      const file = sourceFiles.length > 0 ? sourceFiles[0] : null
      
      // 2. Build FastAPI URL
      const backendBaseUrl = getBackendUrl()
      const processorUrl = `${backendBaseUrl}/api/process-document`
      
      let fetchUrl = `${processorUrl}?stream=true`
      if (resumingRunId) {
        fetchUrl += `&run_id=${resumingRunId}`
      }

      // FastAPI requires source_file if starting new run
      const backendFormData = new FormData()
      if (file) {
        backendFormData.append('source_file', file)
      }
      if (referenceFile && referenceFile.size > 0) {
        backendFormData.append('reference_file', referenceFile)
      }
      if (instructions && instructions.trim() !== '') {
        backendFormData.append('instructions', instructions)
      }

      toast.info(resumingRunId ? `Resuming extraction for session #${resumingRunId}` : `Initiating streaming extraction: ${file?.name}`)

      const response = await fetch(fetchUrl, {
        method: 'POST',
        body: backendFormData,
      })

      if (!response.ok) {
        let errorMessage = `FastAPI Server Error (HTTP ${response.status})`
        try {
          const errorText = await response.text()
          const errorData = JSON.parse(errorText)
          if (errorData && errorData.error) {
            errorMessage = `[${errorData.error.code}] ${errorData.error.message}`
          } else if (errorData && errorData.detail) {
            errorMessage = errorData.detail
          } else {
            errorMessage = errorText || errorMessage
          }
        } catch (e) {
          // Fallback on json parse failure
        }
        throw new Error(errorMessage)
      }

      // 3. Read SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) {
        throw new Error("Failed to read response stream from FastAPI server.")
      }

      let buffer = ''
      let accumulatedRecords: any[] = []
      
      // If we are resuming, load previously saved records into our state first
      if (resumingRunId) {
        try {
          const statusRes = await fetch(`${backendBaseUrl}/api/process-document/status/${resumingRunId}`)
          if (statusRes.ok) {
            let statusPayload = await statusRes.json()
            if (statusPayload && statusPayload.success && statusPayload.data) {
              statusPayload = statusPayload.data
            }
            if (statusPayload && Array.isArray(statusPayload.extracted_data)) {
              accumulatedRecords = statusPayload.extracted_data
              setExtractedData([...accumulatedRecords])
              setEditedDataString(JSON.stringify(accumulatedRecords, null, 2))
              setCompletedChunksCount(statusPayload.completed_chunks)
              setTotalChunksCount(statusPayload.total_chunks)
              if (statusPayload.total_chunks > 0) {
                setProgressPercent(Math.round((statusPayload.completed_chunks / statusPayload.total_chunks) * 100))
              }
            }
          }
        } catch (statusErr) {
          console.error("Could not fetch checkpoint records during resume initiation:", statusErr)
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const cleanLine = line.trim()
          if (cleanLine.startsWith('data:')) {
            try {
              const payload = JSON.parse(cleanLine.substring(5).trim())
              
              if (payload.run_id) {
                setCurrentRunId(payload.run_id)
              }

              if (payload.status === "paused") {
                setRecoveryError(payload.error || "System interruption paused the process.")
                toast.warning(`Extraction paused: ${payload.error || "System interruption"}`)
                setIsProcessing(false)
                fetchResumableRuns()
                return
              }

              if (payload.error && !payload.recoverable_error) {
                setRecoveryError(payload.error)
                toast.warning(`Extraction paused: ${payload.error}`)
                setIsProcessing(false)
                fetchResumableRuns()
                return
              }

              if (payload.recoverable_error) {
                setRecoverableErrors(prev => {
                  if (prev.includes(payload.recoverable_error)) return prev
                  return [...prev, payload.recoverable_error]
                })
                toast.warning(`Recoverable error: ${payload.recoverable_error}`)
              }

              if (payload.warning) {
                setWarnings(prev => {
                  if (prev.includes(payload.warning)) return prev
                  return [...prev, payload.warning]
                })
              }

              const total = payload.total_chunks || 1
              const current = payload.chunk_index + 1
              setTotalChunksCount(total)
              setCompletedChunksCount(current)
              setProgressPercent(Math.round((current / total) * 100))

              const records = payload.records
              if (records) {
                if (Array.isArray(records)) {
                  accumulatedRecords = [...accumulatedRecords, ...records]
                } else if (typeof records === 'object') {
                  accumulatedRecords.push(records)
                }
                
                // Deduplicate items based on serialized contents
                const seen = new Set()
                const uniqueRecords = accumulatedRecords.filter(item => {
                  const serialized = JSON.stringify(item)
                  return seen.has(serialized) ? false : seen.add(serialized)
                })

                setExtractedData([...uniqueRecords])
                setEditedDataString(JSON.stringify(uniqueRecords, null, 2))
              }
            } catch (err) {
              console.error("Failed to parse SSE line:", err)
            }
          }
        }
      }

      if (accumulatedRecords.length > 0) {
        toast.info("Saving processed document to history...")
        if (!resumingRunId && quotaData) {
          const saveResult = await saveExtraction({
            documentName: file ? file.name : `Extraction Run #${resumingRunId || "Session"}`,
            extractedData: accumulatedRecords,
            targetSchema: referenceFile ? referenceFile.name : "None",
            quotaId: quotaData.quota.id,
            currentQuotaUsed: quotaData.quota.quota_used
          })
          if (saveResult && saveResult.id) {
            setCurrentExtractionId(saveResult.id)
          }
        }
        toast.success("Extraction queue processing complete!")
      }

      try {
        const extractions = await getExtractionsHistory()
        if (extractions) {
          setHistory(extractions)
        }
      } catch (historyUpdateErr) {
        console.warn("Non-blocking: could not refresh history", historyUpdateErr)
      }
      fetchResumableRuns()

    } catch (err: any) {
      const errMsg = err.message || "Failed to process document extraction."
      setError(errMsg)
      toast.error(errMsg)
      fetchResumableRuns()
    } finally {
      setIsProcessing(false)
    }
  }

  const triggerStructuring = async () => {
    await runStreamingExtraction()
  }

  const copyToClipboard = () => {
    if (!editedDataString) return
    navigator.clipboard.writeText(editedDataString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = async (format: string) => {
    let dataToExport = extractedData
    if (editedDataString) {
      try {
        const parsed = JSON.parse(editedDataString)
        dataToExport = Array.isArray(parsed) ? parsed : [parsed]
        setExtractedData(dataToExport)
      } catch (err) {
        toast.error("Invalid JSON syntax in editor. Please correct the JSON before exporting.")
        return
      }
    }

    if (!dataToExport || dataToExport.length === 0) {
      toast.error("No data available to export.")
      return
    }

    setIsExporting(true)
    try {
      await downloadExport(dataToExport, format, referenceFile, 'Trinetra_Extraction')
      toast.success(`${format.toUpperCase()} export completed successfully!`)
    } catch (e: any) {
      // Warnings and error messages are handled by downloadExport directly
    } finally {
      setIsExporting(false)
    }
  }



  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Removed unused parsedData logic

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Main Console Content */}
      <div className="w-full space-y-6">
        {/* 3-Pillar Workspace Container */}
        <div className="border border-zinc-800/80 bg-gray-900 rounded-2xl p-6 md:p-8 flex flex-col space-y-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" />
            Extraction Configuration
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Database className="w-3.5 h-3.5 animate-pulse text-zinc-600" />
              <span>Isolated Processor</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsHistoryOpen(true)
                fetchResumableRuns()
              }}
              className="px-2.5 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* The 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Source */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-bold tracking-wide uppercase text-zinc-400 flex items-center justify-between">
              <span>Source Document(s)</span>
              <span className="text-orange-500 text-[10px] lowercase font-normal">(Required)</span>
            </label>
            <div
              onDragOver={handleSourceDragOver}
              onDragLeave={handleSourceDragLeave}
              onDrop={handleSourceDrop}
              onClick={(e) => {
                if (isProcessing) return
                if ((e.target as HTMLElement).closest('.clear-btn')) return
                if ((e.target as HTMLElement).closest('.remove-file-btn')) return
                sourceInputRef.current?.click()
              }}
              className={`group relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[160px] ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isDraggingSource
                  ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.08)]'
                  : 'border-zinc-800 hover:border-orange-500/40 bg-zinc-950/40 hover:bg-zinc-950/80'
              }`}
            >
              <input
                type="file"
                ref={sourceInputRef}
                onChange={handleSourceChange}
                disabled={isProcessing}
                multiple={true}
                accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                className="hidden"
              />
              <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${
                isDraggingSource ? 'text-orange-500' : 'text-zinc-500 group-hover:text-orange-400'
              }`} />
              <span className="text-xs text-zinc-300 font-semibold max-w-full truncate px-2">
                Drag & drop source file(s)
              </span>
              <span className="text-[10px] text-zinc-500 mt-1">
                PDF, PNG, JPG, JPEG, DOCX, XLSX (Max 10MB)
              </span>
              {sourceFiles.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSourceFiles([])
                  }}
                  className="clear-btn absolute top-2 right-2 p-1 text-zinc-500 hover:text-red-400 bg-zinc-900/80 hover:bg-red-500/10 rounded-full transition-all"
                  title="Clear files"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Queued Files UI List */}
            {sourceFiles.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                {sourceFiles.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-2 text-[10px]">
                    <span className="text-zinc-300 truncate max-w-[80%]" title={file.name}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSourceFiles(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="remove-file-btn p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pillar 2: Reference */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-bold tracking-wide uppercase text-zinc-400 flex items-center justify-between">
              <span>Reference Layout</span>
              <span className="text-zinc-500 text-[10px] lowercase font-normal">(Optional)</span>
            </label>
            <div
              onDragOver={handleRefDragOver}
              onDragLeave={handleRefDragLeave}
              onDrop={handleRefDrop}
              onClick={(e) => {
                if (isProcessing) return
                if ((e.target as HTMLElement).closest('.clear-btn')) return
                referenceInputRef.current?.click()
              }}
              className={`group relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[160px] ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isDraggingReference
                  ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.08)]'
                  : 'border-zinc-800 hover:border-orange-500/40 bg-zinc-950/40 hover:bg-zinc-950/80'
              }`}
            >
              <input
                type="file"
                ref={referenceInputRef}
                onChange={handleRefChange}
                disabled={isProcessing}
                accept=".xlsx,.csv,.json"
                className="hidden"
              />
              <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${
                isDraggingReference ? 'text-orange-500' : 'text-zinc-500 group-hover:text-orange-400'
              }`} />
              <span className="text-xs text-zinc-300 font-semibold max-w-full truncate px-2">
                {referenceFile ? referenceFile.name : "Drag & drop template file"}
              </span>
              <span className="text-[10px] text-zinc-500 mt-1">
                {referenceFile ? formatFileSize(referenceFile.size) : "XLSX, CSV, JSON (Max 10MB)"}
              </span>
              {referenceFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setReferenceFile(null)
                  }}
                  className="clear-btn absolute top-2 right-2 p-1 text-zinc-500 hover:text-red-400 bg-zinc-900/80 hover:bg-red-500/10 rounded-full transition-all"
                  title="Clear file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Pillar 3: Instructions */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-bold tracking-wide uppercase text-zinc-400">
              Custom Instructions
            </label>
            <div className="relative flex-1 flex flex-col">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={isProcessing}
                placeholder="Specify natural language guidelines for data extraction. (e.g. format due dates as YYYY-MM-DD)"
                className="w-full flex-1 min-h-[160px] md:min-h-0 p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed font-sans leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={triggerStructuring}
          disabled={sourceFiles.length === 0 || isProcessing}
          className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              Processing Extraction Engine...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Extraction
            </>
          )}
        </button>

        {/* Progress & Checkpoint Resume UI */}
        {(isProcessing || currentRunId) && (
          <div className="border border-zinc-800 bg-zinc-950/40 rounded-xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                <span>
                  {isProcessing
                    ? `Processing Chunk ${completedChunksCount} of ${totalChunksCount} (${totalChunksCount - completedChunksCount} remaining)`
                    : `Extraction paused at Chunk ${completedChunksCount} of ${totalChunksCount} (${totalChunksCount - completedChunksCount} remaining)`}
                </span>
              </span>
              <span className="text-zinc-500 font-semibold">{progressPercent}% Complete</span>
            </div>
            
            <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-orange-500 h-2.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {recoveryError && (
              <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Extraction Interrupted (Recoverable):</span>
                  <p className="text-amber-300/80 leading-relaxed font-sans">{recoveryError}</p>
                </div>
              </div>
            )}

            {/* Warnings List */}
            {warnings.length > 0 && (
              <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3 text-xs text-amber-200 flex flex-col space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Warnings ({warnings.length})</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-300/85 max-h-[100px] overflow-y-auto font-mono">
                  {warnings.map((w, index) => (
                    <li key={`warn-${index}`}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recoverable Errors List */}
            {recoverableErrors.length > 0 && (
              <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-3 text-xs text-red-200 flex flex-col space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Recoverable Errors ({recoverableErrors.length})</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-red-300/85 max-h-[100px] overflow-y-auto font-mono">
                  {recoverableErrors.map((err, index) => (
                    <li key={`rec-err-${index}`}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {!isProcessing && recoveryError && currentRunId && (
              <button
                type="button"
                onClick={() => runStreamingExtraction(currentRunId)}
                className="w-full py-2 px-3 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-bold rounded-lg text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin text-white shrink-0" />
                <span>Resume Processing From Chunk {completedChunksCount + 1}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Output Panel Container */}
      <div className="border border-zinc-800/80 bg-gray-900 rounded-2xl p-6 md:p-8 flex flex-col space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileJson className="w-4 h-4 text-orange-500" />
            Structured JSON Output
          </h3>

          {editedDataString && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-medium">Export As:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    disabled={isExporting}
                    className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-orange-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="xls">Excel (.xls)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="tsv">TSV (.tsv)</option>
                    <option value="docx">Word (.docx)</option>
                    <option value="doc">Word (.doc)</option>
                    <option value="pdf">PDF (.pdf)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="xml">XML (.xml)</option>
                    <option value="yaml">YAML (.yaml)</option>
                    <option value="html">HTML (.html)</option>
                    <option value="md">Markdown (.md)</option>
                    <option value="txt">Text (.txt)</option>
                  </select>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleExport(exportFormat)}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 text-white font-medium rounded-md text-xs transition-all duration-300 shadow-md shadow-orange-500/10 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <span>Download</span>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={copyToClipboard}
                className="px-2.5 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Schema Output Display Box */}
        <div className={`min-h-[360px] bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 relative leading-relaxed ${
          !editedDataString || error ? 'font-mono text-xs overflow-auto max-h-[500px]' : ''
        }`}>
          {isProcessing && (
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <span className="text-orange-500 text-xs font-semibold animate-pulse">
                Extracting Data...
              </span>
            </div>
          )}

          {error && (
            <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 text-red-400 flex gap-3.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Processing Failure</h4>
                <p className="text-xs leading-normal opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Idle Placeholder */}
          {!editedDataString && !isProcessing && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Info className="w-6 h-6 text-zinc-600" />
              <span className="text-zinc-500 text-xs max-w-xs leading-normal">
                Upload your source document, optional layout template, and optional instructions. Then run the engine to view structured payload output.
              </span>
            </div>
          )}

          {editedDataString && !error ? (
            <StructuredEditor
              runId={currentRunId}
              extractionId={currentExtractionId}
              initialData={extractedData}
              referenceSchemaName={referenceFile ? referenceFile.name : undefined}
              onChange={(newData) => {
                setExtractedData(newData)
                setEditedDataString(JSON.stringify(newData, null, 2))
              }}
            />
          ) : null}
        </div>

        {/* Extraction Config Footer Info */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-2.5 bg-orange-500/10 rounded-lg text-orange-500">
            <Sliders className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Trinetra Custom OCR & LLM</h4>
            <p className="text-[10px] text-zinc-500 leading-normal mt-0.5">
              Validates JSON keys dynamically. Every successful run consumes exactly 1 document quota unit.
            </p>
          </div>
        </div>
      </div>

      {/* Sliding Drawer */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isHistoryOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={() => setIsHistoryOpen(false)}
        />
        
        {/* Drawer panel */}
        <div className={`relative w-full max-w-sm bg-gray-900 border-l border-zinc-800/80 h-full shadow-2xl flex flex-col p-6 space-y-4 transition-transform duration-300 ease-in-out transform ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Files
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 bg-zinc-950/40 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800/80 cursor-pointer flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Section 1: Resumable Sessions */}
            <div>
              <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Resumable Sessions</span>
                {loadingRuns && <RefreshCw className="w-3 h-3 animate-spin text-orange-500" />}
              </h5>
              {resumableRuns.length === 0 ? (
                <p className="text-[10px] text-zinc-600 italic">No resumable sessions found.</p>
              ) : (
                <div className="space-y-2">
                  {resumableRuns.map((run) => (
                    <div
                      key={run.run_id}
                      className="w-full p-2.5 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl transition-all duration-300 flex flex-col space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-200 truncate max-w-[70%]">
                          {run.source_file_name || `Session #${run.run_id}`}
                        </span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                          {run.completed_chunks}/{run.total_chunks} Chunks
                        </span>
                      </div>
                      {run.errors && (
                        <p className="text-[9px] text-amber-400/80 truncate font-mono">
                          {run.errors}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentRunId(run.run_id);
                          setCompletedChunksCount(run.completed_chunks);
                          setTotalChunksCount(run.total_chunks);
                          setProgressPercent(run.total_chunks > 0 ? Math.round((run.completed_chunks / run.total_chunks) * 100) : 0);
                          setRecoveryError(run.errors || "Session paused");
                          // Populate mock source files if none exist in React state to make sure form displays it correctly
                          if (sourceFiles.length === 0 && run.source_file_name) {
                            // We can represent the cached filename in the UI
                            const dummyFile = new File([], run.source_file_name);
                            setSourceFiles([dummyFile]);
                          }
                          setIsHistoryOpen(false);
                          toast.info(`Loaded session #${run.run_id} for resume.`);
                        }}
                        className="w-full py-1 text-center bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded text-[10px] transition-colors cursor-pointer"
                      >
                        Load to Resume
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Completed Extractions */}
            <div>
              <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Completed Extractions
              </h5>
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-2 text-zinc-500 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                  <span>Loading history...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-4 text-zinc-500 text-xs italic">
                  No completed files.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => handleSelectHistory(record)}
                      disabled={isProcessing}
                      className="w-full text-left p-2.5 border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-800/50 hover:border-orange-500/30 rounded-xl transition-colors cursor-pointer duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                        {record.document_path}
                      </p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-mono">
                        {getExpirationString(record.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-800/80 pt-3">
            Files are automatically deleted after 7 days.
          </div>
        </div>
      </div>
    </div>
  </div>
)
}
