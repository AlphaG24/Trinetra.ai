'use client'

import React, { useState, useTransition, useRef } from 'react'
import { processDocument } from '../../../../actions/structurer'
import { 
  FileText, FileJson, UploadCloud, Play, Database, 
  Sliders, CheckCircle, RefreshCw, Copy, Check, Info, AlertTriangle, X 
} from 'lucide-react'
import { toast } from 'sonner'

interface StructurerConsoleProps {
  service: any
  quota: any
}

const SCHEMA_DESCRIPTIONS = {
  lead: {
    title: 'Lead Structuring (CRM)',
    desc: 'Extract contact, company, budget, and purchasing intent.'
  },
  invoice: {
    title: 'Invoice Parser',
    desc: 'Extract vendor, items, tax, and total billing amounts.'
  },
  resume: {
    title: 'Resume & CV Parser',
    desc: 'Extract candidate skills, experience, education, and social links.'
  },
  custom: {
    title: 'Custom JSON Schema',
    desc: 'Extract entities based on your own custom schema definitions.'
  }
}

export function StructurerConsole({ service, quota }: StructurerConsoleProps) {
  const [isPending, startTransition] = useTransition()
  const [schemaType, setSchemaType] = useState<'lead' | 'invoice' | 'resume' | 'custom'>('lead')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [outputText, setOutputText] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    // Basic validations: size < 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.")
      return
    }
    setFile(selectedFile)
    setErrorMsg(null)
    setOutputText('')
  }

  const removeFile = () => {
    setFile(null)
    setErrorMsg(null)
    setOutputText('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerStructuring = () => {
    if (!file) return

    setErrorMsg(null)
    setOutputText('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('schema', schemaType)

    startTransition(async () => {
      try {
        const result = await processDocument(formData)
        
        // Format resulting JSON
        const jsonString = JSON.stringify(result, null, 2)
        setOutputText(jsonString)
        toast.success("Document structured successfully!")
      } catch (err: any) {
        const message = err?.message || "Failed to process document"
        setErrorMsg(message)
        toast.error(message)
      }
    })
  }

  const copyToClipboard = () => {
    if (!outputText) return
    navigator.clipboard.writeText(outputText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Input Pane */}
      <div className="border border-zinc-800 bg-[#0c0c12] rounded-2xl p-6 flex flex-col space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" />
            Document Upload Interface
          </h3>
          
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Database className="w-3.5 h-3.5 animate-pulse text-zinc-600" />
            <span>Isolated Processor</span>
          </div>
        </div>

        {/* Schema selector */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-semibold">Select Structuring Target Schema</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(SCHEMA_DESCRIPTIONS) as Array<keyof typeof SCHEMA_DESCRIPTIONS>).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSchemaType(key)
                  setOutputText('')
                  setErrorMsg(null)
                }}
                disabled={isPending}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  schemaType === key 
                    ? 'bg-orange-500/10 border-orange-500/35 text-orange-400 font-bold' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
            {SCHEMA_DESCRIPTIONS[schemaType].desc}
          </p>
        </div>

        {/* HTML5 Drag and Drop Dropzone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isPending && fileInputRef.current?.click()}
          className={`relative border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${
            isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${
            isDragging 
              ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.05)]' 
              : 'border-zinc-800 hover:border-orange-500/30 bg-zinc-950/40 hover:bg-zinc-950/70'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isPending}
            accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
            className="hidden"
          />
          
          <UploadCloud className={`w-10 h-10 mb-3 transition-colors ${
            isDragging ? 'text-orange-400' : 'text-zinc-500 group-hover:text-zinc-400'
          }`} />
          
          <div className="space-y-1">
            <p className="text-xs text-zinc-300 font-semibold">
              Drag & drop document here or <span className="text-orange-500 hover:text-orange-400 transition-colors">browse files</span>
            </p>
            <p className="text-[10px] text-zinc-500">
              PDF, Images (PNG, JPG), TXT or Word up to 10MB
            </p>
          </div>
        </div>

        {/* File Detail Card */}
        {file && (
          <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800/85 p-3 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-500">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-[300px]">
                  {file.name}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              disabled={isPending}
              className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              title="Remove File"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={triggerStructuring}
          disabled={!file || isPending}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
              Extracting Data...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Structuring Engine
            </>
          )}
        </button>
      </div>

      {/* Right Output Pane */}
      <div className="border border-zinc-800 bg-[#0c0c12] rounded-2xl p-6 flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileJson className="w-4 h-4 text-orange-500" />
            Structured JSON Output
          </h3>

          {outputText && (
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
          )}
        </div>

        {/* Schema Output Display Box */}
        <div className="flex-1 min-h-[360px] bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 font-mono text-xs overflow-auto leading-relaxed relative max-h-[500px]">
          {isPending && (
            <div className="absolute inset-0 bg-[#0c0c12]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <span className="text-orange-500 text-xs font-semibold animate-pulse">
                Extracting Data...
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 text-red-400 flex gap-3.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Processing Failure</h4>
                <p className="text-xs leading-normal opacity-90">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Idle Placeholder */}
          {!outputText && !isPending && !errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Info className="w-6 h-6 text-zinc-600" />
              <span className="text-zinc-500 text-xs max-w-xs leading-normal">
                Upload a document and select a schema. Then run the engine to view structured payload output.
              </span>
            </div>
          )}

          {outputText ? (
            <pre className="text-emerald-400 scrollbar-thin">
              <code>{outputText}</code>
            </pre>
          ) : null}
        </div>

        {/* Extraction Config Footer Info */}
        <div className="bg-[#0e0e15] border border-zinc-800 p-4 rounded-xl flex items-center gap-3.5">
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
    </div>
  )
}
