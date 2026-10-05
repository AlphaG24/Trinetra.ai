'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Lock, 
  FileText, 
  Building2, 
  Loader2,
  KeyRound,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getValidStepUpToken, cacheStepUpToken } from '@/lib/safety/adminAuthService'

interface KYCDocument {
  id: string
  organization_id: string
  organization_name: string
  user_id: string
  user_email: string
  user_name: string
  document_type: string
  id_number_masked: string
  mime_type: string
  file_size_bytes: number
  status: 'verified' | 'pending_review' | 'rejected'
  rejection_reason?: string
  upload_consent_given: boolean
  upload_consent_at?: string
  created_at: string
  verified_at?: string
}

export default function AdminKYCVerificationPage() {
  const [documents, setDocuments] = useState<KYCDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'verified' | 'rejected'>('all')

  // Step-up Re-authentication Modal State
  const [needsStepUp, setNeedsStepUp] = useState(false)
  const [stepUpPassword, setStepUpPassword] = useState('')
  const [submittingStepUp, setSubmittingStepUp] = useState(false)

  // Review / Reject Modal State
  const [rejectModalDoc, setRejectModalDoc] = useState<KYCDocument | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingReviewId, setProcessingReviewId] = useState<string | null>(null)

  const fetchDocuments = async (overrideToken?: string) => {
    try {
      setLoading(true)
      const token = overrideToken || getValidStepUpToken('kyc_view')

      if (!token) {
        setNeedsStepUp(true)
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/kyc', {
        headers: {
          'x-admin-step-up-token': token,
        },
      })

      const data = await res.json()

      if (res.status === 403 && data.requires_step_up) {
        setNeedsStepUp(true)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch KYC documents')
      }

      setDocuments(data.documents || [])
      setNeedsStepUp(false)
    } catch (err: any) {
      toast.error(err.message || 'Error fetching documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleStepUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stepUpPassword.trim()) {
      toast.error('Please enter the administrative password')
      return
    }

    try {
      setSubmittingStepUp(true)
      const res = await fetch('/api/admin/step-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kyc_view',
          credential: stepUpPassword,
          credential_type: 'password',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Step-up authentication failed')
      }

      cacheStepUpToken('kyc_view', data.step_up_token, data.expires_in_seconds || 300)
      toast.success('Admin authorization verified (5-minute session unlocked)')
      setNeedsStepUp(false)
      setStepUpPassword('')
      fetchDocuments(data.step_up_token)
    } catch (err: any) {
      toast.error(err.message || 'Failed step-up authorization')
    } finally {
      setSubmittingStepUp(false)
    }
  }

  const handleReview = async (id: string, status: 'verified' | 'rejected', reason?: string) => {
    try {
      setProcessingReviewId(id)
      const res = await fetch(`/api/admin/kyc/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejection_reason: reason,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update review status')
      }

      toast.success(data.message || `Document marked as ${status}`)
      setRejectModalDoc(null)
      setRejectionReason('')
      fetchDocuments()
    } catch (err: any) {
      toast.error(err.message || 'Review action failed')
    } finally {
      setProcessingReviewId(null)
    }
  }

  const formatDocType = (type: string) => {
    switch (type) {
      case 'authorized_signatory_id':
        return 'Signatory ID (Aadhaar)'
      case 'company_pan':
        return 'Company PAN'
      case 'certificate_of_incorporation':
        return 'Certificate of Incorporation'
      default:
        return type.replace(/_/g, ' ').toUpperCase()
    }
  }

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      doc.organization_name.toLowerCase().includes(q) ||
      doc.user_email.toLowerCase().includes(q) ||
      (doc.id_number_masked && doc.id_number_masked.toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    return matchesQuery && matchesStatus
  })

  const pendingCount = documents.filter(d => d.status === 'pending_review').length
  const verifiedCount = documents.filter(d => d.status === 'verified').length
  const rejectedCount = documents.filter(d => d.status === 'rejected').length

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-300 py-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 font-display">
            <ShieldCheck className="w-8 h-8 text-emerald-400" /> KYC Verification Center
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Statutory compliance vault for customer identification documents conforming to UIDAI masking & DPDP 2023.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDocuments()}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Submissions</span>
          <div className="text-2xl font-bold text-white mt-1">{documents.length}</div>
        </div>
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Pending Review</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Verified</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{verifiedCount}</div>
        </div>
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Rejected</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by org, email, or masked ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {(['all', 'pending_review', 'verified', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Document Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-16 text-center text-zinc-500 text-xs">
          No KYC verification records found.
        </div>
      ) : (
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-5">Organization & User</th>
                  <th className="py-3.5 px-5">Document Type</th>
                  <th className="py-3.5 px-5">Masked Identifier</th>
                  <th className="py-3.5 px-5">DPDP Consent</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Uploaded At</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs text-zinc-300">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Building2 size={13} className="text-zinc-500" />
                        {doc.organization_name}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{doc.user_email}</div>
                    </td>

                    <td className="py-4 px-5">
                      <span className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-300">
                        {formatDocType(doc.document_type)}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-mono text-zinc-300 bg-black/40 border border-white/5 px-2.5 py-1 rounded-lg text-xs">
                        {doc.id_number_masked || '•••• •••• ••••'}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      {doc.upload_consent_given ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 size={13} /> Granted
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-[11px]">Pending</span>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        doc.status === 'verified'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : doc.status === 'rejected'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}>
                        {doc.status === 'verified' && <CheckCircle2 size={12} />}
                        {doc.status === 'rejected' && <XCircle size={12} />}
                        {doc.status === 'pending_review' && <Clock size={12} className="animate-spin" />}
                        {doc.status.replace('_', ' ')}
                      </span>
                      {doc.rejection_reason && (
                        <p className="text-[10px] text-rose-400/80 mt-1 max-w-xs">{doc.rejection_reason}</p>
                      )}
                    </td>

                    <td className="py-4 px-5 text-zinc-500 text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-4 px-5 text-right">
                      {doc.status === 'pending_review' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={processingReviewId === doc.id}
                            onClick={() => handleReview(doc.id, 'verified')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={processingReviewId === doc.id}
                            onClick={() => setRejectModalDoc(doc)}
                            className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500 italic">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step-Up Re-Authentication Modal (Section 18.4 & 18.5) */}
      {needsStepUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Privileged Step-Up Authentication Required</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Per Master Plan Section 18.4 & 18.5, viewing customer KYC records requires administrative verification. Enter your password to unlock a 5-minute privileged session.
              </p>
            </div>
            <form onSubmit={handleStepUpSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  placeholder="Enter administrator password..."
                  value={stepUpPassword}
                  onChange={(e) => setStepUpPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submittingStepUp}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingStepUp ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Verify & Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Reject KYC Document</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Provide a reason for rejecting this document for {rejectModalDoc.organization_name}. This reason will be displayed to the customer in their settings tab.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Incomplete signatory identification or unreadable document scan..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectModalDoc(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingReviewId === rejectModalDoc.id}
                onClick={() => handleReview(rejectModalDoc.id, 'rejected', rejectionReason)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
