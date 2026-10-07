'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Lock, 
  Loader2, 
  Info,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

interface KYCDoc {
  id: string
  document_type: string
  id_number_masked?: string
  status: 'verified' | 'pending_review' | 'rejected'
  rejection_reason?: string
  created_at: string
}

export function KYCTab() {
  const [docs, setDocs] = useState<KYCDoc[]>([])
  const [overallStatus, setOverallStatus] = useState<string>('not_started')
  const [complianceChecklist, setComplianceChecklist] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Upload Form State
  const [docType, setDocType] = useState('company_pan')
  const [rawId, setRawId] = useState('')
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/kyc')
      if (res.ok) {
        const data = await res.json()
        setDocs(data.documents || [])
        setOverallStatus(data.overallStatus || 'not_started')
        if (data.complianceChecklist) {
          setComplianceChecklist(data.complianceChecklist)
        }
      }
    } catch (err) {
      console.error('Failed to load KYC docs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB')
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setFileBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!consentGiven) {
      toast.error('You must affirmatively consent to statutory verification')
      return
    }

    if (!fileBase64) {
      toast.error('Please select an ID or certificate document to upload')
      return
    }

    try {
      setUploading(true)
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: docType,
          raw_id_number: rawId,
          file_name: fileName,
          file_base64: fileBase64,
          mime_type: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          consent_given: consentGiven,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit KYC document')

      toast.success('Document uploaded securely to AES-256 vault!')
      setRawId('')
      setFileBase64(null)
      setFileName('')
      setConsentGiven(false)
      fetchDocs()
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Verified (Telecom Ready)
          </span>
        )
      case 'action_required':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Action Required
          </span>
        )
      case 'pending_review':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Under Review
          </span>
        )
      case 'incomplete':
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
            <Clock className="w-3 h-3" />
            Pending Upload
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Clock className="w-3 h-3" />
            Not Started
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-violet-600/10 to-indigo-600/5 border border-violet-500/10 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Statutory KYC & Regulatory Compliance Vault
            </h4>
            {getStatusBadge(overallStatus)}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Per Telecom Regulatory Authority guidelines (TRAI & DPDP Act), live production outbound calling and dedicated DID numbers require verified organization KYC. Documents are vaulted with AES-256 encryption with automatic UIDAI masking.
          </p>
        </div>
      </div>

      {/* Mandatory Telecom Verification Checklist */}
      <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-500" />
              Mandatory Telecom KYC Verification Checklist
            </h5>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              To buy or activate virtual phone numbers, Indian telecom regulations (TRAI & DoT) mandate verification of <strong className="text-zinc-700 dark:text-zinc-200">both</strong> requirements below:
            </p>
          </div>
          {complianceChecklist?.canProcurePhoneNumbers ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Phone Number Purchase Unlocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4" /> Phone Numbers Locked (KYC Pending)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Requirement 1: Entity Proof */}
          <div className={`p-4 rounded-xl border transition-all ${
            complianceChecklist?.entity?.verified
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : complianceChecklist?.entity?.status === 'rejected'
              ? 'bg-rose-500/5 border-rose-500/20'
              : 'bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/10 text-violet-500">
                    Mandatory 1
                  </span>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white">
                    Entity / Business Proof
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Company PAN Card, GSTIN Certificate, or Certificate of Incorporation
                </p>
              </div>
              <div>{getStatusBadge(complianceChecklist?.entity?.status || 'missing')}</div>
            </div>
          </div>

          {/* Requirement 2: Signatory Proof */}
          <div className={`p-4 rounded-xl border transition-all ${
            complianceChecklist?.signatory?.verified
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : complianceChecklist?.signatory?.status === 'rejected'
              ? 'bg-rose-500/5 border-rose-500/20'
              : 'bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/10 text-violet-500">
                    Mandatory 2
                  </span>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white">
                    Authorized Signatory ID
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Masked Aadhaar Card or Passport of registered director/officer
                </p>
              </div>
              <div>{getStatusBadge(complianceChecklist?.signatory?.status || 'missing')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload on Left, History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-4">
          <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-violet-500" />
            Submit Identity / Entity Document
          </h5>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Document Category
              </label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs font-semibold rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="company_pan">Company / Business PAN Card (Mandatory Entity Proof)</option>
                <option value="gstin_certificate">GSTIN Registration Certificate (Mandatory Entity Proof)</option>
                <option value="authorized_signatory_id">Authorized Signatory ID - Aadhaar / Passport (Mandatory Signatory Proof)</option>
                <option value="incorporation_cert">Certificate of Incorporation (Alternative Entity Proof)</option>
                <option value="utility_bill">Business Electricity / Telephone Utility Bill (Supporting Address)</option>
              </select>
              <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-1 font-medium flex items-center gap-1">
                <Info className="w-3 h-3" />
                {docType === 'authorized_signatory_id'
                  ? 'Satisfies Mandatory Requirement 2 (Authorized Signatory ID)'
                  : docType === 'utility_bill'
                  ? 'Supplemental address verification document'
                  : 'Satisfies Mandatory Requirement 1 (Entity / Business Proof)'}
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Document Identification Number
              </label>
              <input
                type="text"
                value={rawId}
                onChange={e => setRawId(e.target.value)}
                placeholder={docType === 'authorized_signatory_id' ? 'Aadhaar (12 digits) or Passport' : 'PAN (e.g. ABCDE1234F) or GSTIN'}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1 font-mono">
                <Lock className="w-3 h-3 text-emerald-500" />
                UIDAI Safe: Only masked identifier (e.g. •••• •••• 1234) is permanently vaulted.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Upload File (PDF, PNG, JPG - Max 5MB)
              </label>
              <div className="border border-dashed border-zinc-300 dark:border-white/10 hover:border-violet-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-1.5">
                  <FileText className="w-6 h-6 text-violet-400" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {fileName || 'Click or drag file here'}
                  </span>
                  <span className="text-[10px] text-zinc-400">PDF, PNG, or JPEG up to 5MB</span>
                </div>
              </div>
            </div>

            {/* Mandatory Affirmative Statutory Consent */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={e => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 dark:border-white/20 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                  I affirmatively declare that this identity document is authentic and grant consent to Trinetra AI and its authorized carriers for statutory telecom KYC verification pursuant to the Digital Personal Data Protection Act.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading || !consentGiven || !fileBase64}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-violet-600/10"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{uploading ? 'Vaulting Encrypted Document...' : 'Submit for Compliance Review'}</span>
            </button>
          </form>
        </div>

        {/* Uploaded Documents History */}
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-4">
          <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-500" />
            Vaulted KYC Documents
          </h5>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              <p className="text-xs text-zinc-400 font-mono">Loading vaulted documents...</p>
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 space-y-2 border border-dashed border-zinc-200 dark:border-white/5 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-xs text-zinc-400">No documents submitted yet.</p>
              <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                Submit your business PAN or Signatory ID to activate live calling capabilities.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-150 dark:border-white/5 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-montserrat text-zinc-900 dark:text-white capitalize">
                        {doc.document_type.replace(/_/g, ' ')}
                      </span>
                      {getStatusBadge(doc.status)}
                    </div>
                    {doc.id_number_masked && (
                      <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        Masked ID: <span className="text-violet-400 font-semibold">{doc.id_number_masked}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400">
                      Submitted on {new Date(doc.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    {doc.rejection_reason && doc.status === 'rejected' && (
                      <p className="text-[11px] text-rose-400 font-medium">
                        Reason: {doc.rejection_reason}
                      </p>
                    )}
                    {doc.rejection_reason && doc.status === 'pending_review' && doc.rejection_reason.includes('[OCR') && (
                      <p className="text-[11px] text-emerald-400 font-medium">
                        {doc.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0" title="AES-256 Vaulted">
                    <Lock className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
