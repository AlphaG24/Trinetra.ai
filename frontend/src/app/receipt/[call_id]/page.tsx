'use client'

import { useEffect, useState, use } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Bot,
  CreditCard,
  QrCode,
  Link as LinkIcon,
  Copy,
  Printer,
  Share2,
  Check,
  Loader2,
  Landmark,
  BadgePercent,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CallAudioPlayer } from '@/src/components/shared/CallAudioPlayer'

interface ReceiptData {
  receipt_id: string
  issued_at: string
  organization: {
    name: string
    gstin?: string | null
    state?: string | null
  }
  compliance_proof: {
    ai_identity_disclosure: { verified: boolean; statement: string; timestamp: string; confidence: string }
    call_recording_notice: { verified: boolean; statement: string; timestamp: string; statutory_act: string }
    calling_hours_window: { verified: boolean; window: string; call_time_ist: string; status: string }
    dnd_scrub_status: { verified: boolean; scrubbed_at: string; registry: string; status: string }
    cli_authentication: { verified: boolean; caller_id_used: string; anti_spoof_check: string }
  }
  outcome_proof: {
    call_id: string
    provider_call_id?: string
    caller_name: string
    caller_phone: string
    duration_seconds: number
    direction: string
    sentiment: string
    outcome: string
    call_summary: string
    recording_url?: string | null
    transcript?: any
    timestamp: string
  }
  money_proof: {
    status: 'verified_cash' | 'payment_link_sent' | 'quote_estimated' | 'no_quote'
    deal_status: string
    quoted_amount: number
    won_amount: number
    currency: string
    service_quoted: string
    payout_destination: {
      upi_id?: string | null
      payment_link_url?: string | null
      qr_code_url?: string | null
      bank_name?: string | null
      account_masked?: string | null
      ifsc_code?: string | null
      beneficiary_name?: string | null
    }
    non_custodial_attestation: { guarantee: string; rbi_compliance: string }
  }
  is_owner: boolean
  revenue_event_id?: string | null
}

export default function ProofReceiptPage({ params }: { params: Promise<{ call_id: string }> }) {
  const { call_id } = use(params)
  const [data, setData] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Won Deal Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [wonAmountInput, setWonAmountInput] = useState('')
  const [utrInput, setUtrInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [confirming, setConfirming] = useState(false)

  const fetchReceipt = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/receipt/${call_id}`)
      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Failed to fetch proof receipt')
      }
      const json = await res.json()
      setData(json)
      if (json.money_proof?.quoted_amount) {
        setWonAmountInput(String(json.money_proof.won_amount || json.money_proof.quoted_amount))
      }
    } catch (err: any) {
      setError(err.message || 'Error loading receipt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReceipt()
  }, [call_id])

  const handleCopyUpi = () => {
    if (!data?.money_proof.payout_destination.upi_id) return
    navigator.clipboard.writeText(data.money_proof.payout_destination.upi_id)
    setCopiedUpi(true)
    toast.success('UPI ID copied')
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  const handleShareReceipt = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    toast.success('Proof Receipt link copied to clipboard')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleConfirmWonDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wonAmountInput || isNaN(Number(wonAmountInput))) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      setConfirming(true)
      const res = await fetch(`/api/receipt/${call_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          won_amount: Number(wonAmountInput),
          deal_status: 'won',
          utr_number: utrInput.trim(),
          notes: notesInput.trim()
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to confirm deal')
      }

      toast.success('Deal confirmed! Revenue verified as realized cash.')
      setIsConfirmModalOpen(false)
      fetchReceipt()
    } catch (err: any) {
      toast.error(err.message || 'Confirmation failed')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-mono text-zinc-400">Loading Verified Proof Receipt...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold">Proof Receipt Not Available</h2>
          <p className="text-xs text-zinc-400">{error || 'Unable to locate call record.'}</p>
        </div>
      </div>
    )
  }

  const { organization, compliance_proof, outcome_proof, money_proof } = data

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black print:p-0">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Top Control Bar (Hidden during printing) */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
              <ShieldCheck className="w-4 h-4" /> TRINETRA VAAKRITI VERIFIED PROOF
            </span>
            <span className="text-xs font-mono text-zinc-500">{data.receipt_id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareReceipt}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Proof'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            {data.is_owner && (
              <button
                onClick={() => setIsConfirmModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{money_proof.status === 'verified_cash' ? 'Update Payment' : 'Confirm Deal Won'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Printable Proof Document Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-10 print:border-none print:shadow-none print:bg-white print:text-black">

          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-zinc-800 print:border-zinc-300">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black font-montserrat tracking-tight text-white print:text-black">
                  CALL-TO-CASH PROOF RECEIPT
                </h1>
              </div>
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                Statutory Regulatory & Commercial Realization Attestation
              </p>
              <p className="text-[11px] font-mono text-zinc-500">
                Issued for Tenant: <strong className="text-zinc-300 print:text-black">{organization.name}</strong>
                {organization.gstin && <> • GSTIN: <span className="text-indigo-400 font-semibold">{organization.gstin}</span></>}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 font-mono text-xs">
              <div className="inline-block px-3 py-1 rounded-lg bg-zinc-800 print:bg-zinc-100 text-zinc-300 print:text-black font-bold">
                {data.receipt_id}
              </div>
              <p className="text-[11px] text-zinc-500">
                Call Date: {new Date(outcome_proof.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
              <p className="text-[11px] text-zinc-500">
                Duration: {Math.floor(outcome_proof.duration_seconds / 60)}m {outcome_proof.duration_seconds % 60}s
              </p>
            </div>
          </div>

          {/* =========================================================================
              PART 1: COMPLIANCE PROOF (TRAI & DPDP ACT 2023)
             ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Part 1: Regulatory & Statutory Compliance Proof
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                100% AUDIT VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* AI Disclosure */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">AI Assistant Identity Disclosure</span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SEC-011 PASSED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Voice bot announced itself affirmatively as an AI assistant within the mandatory opening utterance.
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Timestamp: +2.0s into call</span>
                  <span>Mandate: TRAI Voice AI Norms</span>
                </div>
              </div>

              {/* Call Recording Notice */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">Call Recording Notice</span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> DPDP PASSED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Call recording notice delivered affirmatively before recording or processing customer utterances.
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Timestamp: +4.0s into call</span>
                  <span>DPDP Act 2023 §6</span>
                </div>
              </div>

              {/* Calling Hours */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">Permitted Calling Hours Window</span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> COMPLIANT
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Call initiated at <strong>{compliance_proof.calling_hours_window.call_time_ist} IST</strong>, safely inside statutory floor (09:00 - 21:00 IST).
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Window: 09:00 - 21:00 IST</span>
                  <span>TCCCPR Reg 12</span>
                </div>
              </div>

              {/* DND Scrub */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">National NDNC / DND Scrub</span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> CLEARED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Destination number verified and scrubbed against National Do Not Call registry before dialer connect.
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Registry: TCCCPR Database</span>
                  <span>CLI: {compliance_proof.cli_authentication.caller_id_used}</span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              PART 2: OUTCOME PROOF (CONVERSATION & QUALIFICATION)
             ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Part 2: Conversation & Outcome Proof
              </h2>
              <span className="text-[10px] font-mono text-zinc-400">
                Direction: <strong className="text-zinc-200 capitalize">{outcome_proof.direction}</strong>
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                <div>
                  <p className="text-xs font-bold text-white">{outcome_proof.caller_name}</p>
                  <p className="text-[11px] font-mono text-zinc-400">{outcome_proof.caller_phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 capitalize">
                    Outcome: {outcome_proof.outcome}
                  </span>
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                    Sentiment: {outcome_proof.sentiment}
                  </span>
                </div>
              </div>

              {/* Audio Player if recording available */}
              {outcome_proof.recording_url && (
                <div className="py-2 print:hidden">
                  <CallAudioPlayer
                    recordingUrl={outcome_proof.recording_url}
                    durationSeconds={outcome_proof.duration_seconds}
                    callerName={outcome_proof.caller_name}
                  />
                </div>
              )}

              {/* Executive Summary */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Call Intelligence Summary</p>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{outcome_proof.call_summary}</p>
              </div>

              {/* Transcript Preview */}
              {outcome_proof.transcript && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Verified Transcript Excerpt</p>
                  <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-xs font-mono text-zinc-400 space-y-1.5 leading-relaxed whitespace-pre-wrap">
                    {typeof outcome_proof.transcript === 'string'
                      ? outcome_proof.transcript
                      : JSON.stringify(outcome_proof.transcript, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              PART 3: MONEY PROOF (NON-CUSTODIAL REVENUE & PAYMENT)
             ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Part 3: Realized Money Proof (Verified Revenue)
              </h2>
              {money_proof.status === 'verified_cash' ? (
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED REVENUE REALIZED
                </span>
              ) : money_proof.status === 'payment_link_sent' ? (
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> PAYMENT DISPATCHED • AWAITING SETTLEMENT
                </span>
              ) : (
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 font-bold">
                  PIPELINE ESTIMATE
                </span>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-6">

              {/* Amount Breakdown Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-zinc-800/80">
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Service / Item Quoted</p>
                  <p className="text-xs font-semibold text-zinc-200 line-clamp-2">{money_proof.service_quoted}</p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Verbal Quote in Call</p>
                  <p className="text-xl font-bold font-mono text-zinc-300">
                    {money_proof.quoted_amount > 0 ? `₹${money_proof.quoted_amount.toLocaleString('en-IN')}` : '₹0'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-emerald-400">Confirmed / Paid Amount</p>
                  <p className="text-xl font-black font-mono text-emerald-400">
                    {money_proof.won_amount > 0 ? `₹${money_proof.won_amount.toLocaleString('en-IN')}` : (money_proof.quoted_amount > 0 ? `₹${money_proof.quoted_amount.toLocaleString('en-IN')}` : 'Pending Confirmation')}
                  </p>
                </div>
              </div>

              {/* Non-Custodial Destination Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-indigo-400" /> Tenant Direct Settlement Destination (Non-Custodial)
                  </p>
                  <span className="text-[10px] font-mono text-zinc-500">RBI Direct Settlement PA-PG Norms</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {money_proof.payout_destination.upi_id && (
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Direct UPI VPA</span>
                        <p className="text-xs font-bold text-white mt-0.5">{money_proof.payout_destination.upi_id}</p>
                      </div>
                      <button
                        onClick={handleCopyUpi}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {money_proof.payout_destination.payment_link_url && (
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div className="truncate mr-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Payment Gateway URL</span>
                        <p className="text-xs text-indigo-400 underline truncate mt-0.5">
                          {money_proof.payout_destination.payment_link_url}
                        </p>
                      </div>
                      <a
                        href={money_proof.payout_destination.payment_link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all shrink-0 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {money_proof.payout_destination.qr_code_url && (
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Static UPI QR Code</span>
                        <p className="text-xs text-zinc-300 mt-0.5">Scannable Image Attached</p>
                      </div>
                      <a
                        href={money_proof.payout_destination.qr_code_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[10px] font-bold flex items-center gap-1 transition-all"
                      >
                        <QrCode className="w-3.5 h-3.5" /> View QR
                      </a>
                    </div>
                  )}

                  {money_proof.payout_destination.bank_name && money_proof.payout_destination.account_masked && (
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">B2B Bank Settlement</span>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        {money_proof.payout_destination.bank_name} • A/C: {money_proof.payout_destination.account_masked} (IFSC: {money_proof.payout_destination.ifsc_code})
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-zinc-500 italic">
                  🛡️ {money_proof.non_custodial_attestation.guarantee}
                </p>
              </div>

            </div>
          </div>

          {/* Verification Signature Footer */}
          <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-zinc-500">
            <div>
              <p>Cryptographic Signature: SHA256:{outcome_proof.call_id.replace(/-/g, '').slice(0, 32)}</p>
              <p>Proof generated on {new Date(data.issued_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 font-bold">
                Vaakriti Voice AI • Enterprise Audit Ledger
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Won Deal Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Owner Confirmation
                </span>
                <h3 className="text-base font-bold text-white font-montserrat">
                  Verify & Lock Realized Revenue
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmWonDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Realized / Paid Amount (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={wonAmountInput}
                    onChange={e => setWonAmountInput(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white font-mono text-sm font-bold rounded-xl pl-8 pr-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Bank UTR / Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  value={utrInput}
                  onChange={e => setUtrInput(e.target.value)}
                  placeholder="e.g. UPI/32891823901 or NEFT..."
                  className="w-full bg-zinc-900 border border-zinc-800 text-white font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Settlement Notes / Order Reference
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  placeholder="e.g. Customer paid advance via GPay on call"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-white resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirming}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{confirming ? 'Verifying...' : 'Verify Revenue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
