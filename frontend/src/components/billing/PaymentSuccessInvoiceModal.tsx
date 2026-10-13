'use client'

import React, { useState } from 'react'
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight
} from 'lucide-react'

export interface InvoiceItem {
  item?: string
  description?: string
  sac_code?: string
  hsn_sac?: string
  quantity?: number
  rate?: number
  rate_paisa?: number
  amount?: number
  amount_paisa?: number
  taxable_paisa?: number
  total_paisa?: number
  cgst_paisa?: number
  sgst_paisa?: number
}

export interface InvoiceData {
  id?: string
  invoice_number?: string
  created_at?: string
  invoice_date?: string
  due_date?: string
  total_amount?: number
  grand_total_paisa?: number
  subtotal_paisa?: number
  subscription_amount?: number
  tax_amount?: number
  total_tax_paisa?: number
  cgst_amount_paisa?: number
  sgst_amount_paisa?: number
  payment_method?: string
  payment_id?: string
  payment_reference_id?: string
  customer_legal_name?: string
  customer_email?: string
  customer_address?: string
  customer_gstin?: string
  place_of_supply?: string
  supplier_name?: string
  supplier_gstin?: string
  status?: string
  line_items?: InvoiceItem[]
  plan_tier?: string
}

// Helper to reliably resolve line item financials without 100x multiplication bugs
function resolveLineItemAmounts(
  item: any,
  invTotalPaisa: number,
  invSubtotalPaisa: number,
  totalItemsCount: number
) {
  const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1

  // 1. Single-item invoice guarantee:
  // If there is only 1 line item, the item's taxable amount and gross total must exactly match the invoice totals
  if (totalItemsCount === 1) {
    return {
      qty,
      taxablePaisa: invSubtotalPaisa,
      totalItemPaisa: invTotalPaisa
    }
  }

  // 2. Explicit fields already in paisa
  if (item.taxable_paisa !== undefined && item.taxable_paisa !== null && Number(item.taxable_paisa) > 0) {
    const taxablePaisa = Number(item.taxable_paisa)
    const totalItemPaisa =
      item.total_paisa !== undefined && Number(item.total_paisa) > 0
        ? Number(item.total_paisa)
        : item.amount_paisa !== undefined && Number(item.amount_paisa) > 0
        ? Number(item.amount_paisa)
        : Math.round(taxablePaisa * 1.18)
    return { qty, taxablePaisa, totalItemPaisa }
  }

  // 3. Extract raw number
  const rawNum = Number(
    item.amount_paisa ?? item.total_paisa ?? item.amount ?? item.rate_paisa ?? item.rate ?? 0
  )

  if (rawNum <= 0) {
    const count = totalItemsCount > 0 ? totalItemsCount : 1
    const fallbackTaxable = Math.round(invSubtotalPaisa / count)
    const fallbackTotal = Math.round(invTotalPaisa / count)
    return { qty, taxablePaisa: fallbackTaxable, totalItemPaisa: fallbackTotal }
  }

  // 4. Determine if rawNum is in rupees or paisa
  // If invoice total is ₹10,027.64 (1,002,764 paisa), rawNum = 849800 is already in PAISA.
  // If rawNum is in rupees, it would be around 8498 or less.
  const invTotalRupees = invTotalPaisa / 100
  const isLikelyRupees =
    rawNum <= invTotalRupees * 1.25 &&
    !('amount_paisa' in item || 'taxable_paisa' in item || 'rate_paisa' in item || 'total_paisa' in item)

  const valInPaisa = isLikelyRupees ? Math.round(rawNum * 100) : Math.round(rawNum)

  // 5. Determine if valInPaisa represents taxable value (pre-GST) or total (incl. GST)
  // Subscriptions & Bundles in verify-payment store taxable finalPrice in item.amount
  let taxablePaisa = valInPaisa
  let totalItemPaisa = Math.round(valInPaisa * 1.18)

  // If valInPaisa matches or is closer to the invoice grand total (e.g. wallet top-up):
  if (
    valInPaisa > invSubtotalPaisa * 1.05 ||
    Math.abs(valInPaisa - invTotalPaisa) < Math.abs(valInPaisa - invSubtotalPaisa)
  ) {
    totalItemPaisa = valInPaisa
    taxablePaisa = Math.round(valInPaisa / 1.18)
  }

  return { qty, taxablePaisa, totalItemPaisa }
}


export interface PaymentSuccessInvoiceModalProps {
  isOpen: boolean
  status: 'verifying' | 'success' | 'error'
  title?: string
  errorMessage?: string
  paymentId?: string
  invoice?: InvoiceData | null
  invoiceId?: string
  profile?: any
  onClose: () => void
  onContinue?: () => void
  continueLabel?: string
}

export default function PaymentSuccessInvoiceModal({
  isOpen,
  status,
  title,
  errorMessage,
  paymentId,
  invoice,
  invoiceId,
  profile,
  onClose,
  onContinue,
  continueLabel = 'Continue to Dashboard'
}: PaymentSuccessInvoiceModalProps) {
  const [downloading, setDownloading] = useState(false)

  if (!isOpen) return null

  // Financial calculations
  const totalPaisa =
    Number(invoice?.grand_total_paisa || 0) > 0
      ? Number(invoice?.grand_total_paisa)
      : Number(invoice?.total_amount || 0) > 0
      ? Number(invoice?.total_amount)
      : Number(invoice?.subscription_amount || 0)

  const subtotalPaisa =
    Number(invoice?.subtotal_paisa || 0) > 0
      ? Number(invoice?.subtotal_paisa)
      : Number(invoice?.subscription_amount || 0) > 0 && Number(invoice?.subscription_amount) < totalPaisa
      ? Number(invoice?.subscription_amount)
      : Math.round(totalPaisa / 1.18)

  const taxPaisa =
    Number(invoice?.total_tax_paisa || 0) > 0
      ? Number(invoice?.total_tax_paisa)
      : Number(invoice?.tax_amount || 0) > 0
      ? Number(invoice?.tax_amount)
      : Math.max(0, totalPaisa - subtotalPaisa)

  const cgstPaisa =
    Number(invoice?.cgst_amount_paisa || 0) > 0
      ? Number(invoice?.cgst_amount_paisa)
      : Math.round(taxPaisa / 2)

  const sgstPaisa =
    Number(invoice?.sgst_amount_paisa || 0) > 0
      ? Number(invoice?.sgst_amount_paisa)
      : taxPaisa - cgstPaisa

  const effectiveInvoiceId = invoice?.id || invoiceId
  const invoiceNumber = invoice?.invoice_number || 'VAK/26-27/00001'
  const displayPaymentId = invoice?.payment_id || invoice?.payment_reference_id || paymentId || 'N/A'

  const invoiceDateStr = invoice?.created_at
    ? new Date(invoice.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })

// Helper to reliably format any address input (string, object, or array) into a clean string
function formatAddressString(addr: any): string {
  if (!addr) return ''
  if (typeof addr === 'string') return addr.trim()
  if (typeof addr === 'object') {
    const parts = [
      addr.address || addr.street || addr.line1,
      addr.city,
      addr.state,
      addr.pincode || addr.zip || addr.postal_code,
      addr.country || 'India'
    ].filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
    return Object.values(addr).filter(v => typeof v === 'string' && v.trim().length > 0).join(', ')
  }
  return String(addr)
}

function formatSafeString(val: any, fallback = ''): string {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    return val.name || val.company || val.full_name || val.label || val.value || fallback
  }
  return String(val)
}

  // Customer metadata resolved dynamically from profile (100% object-safe)
  const customerName = formatSafeString(
    invoice?.customer_legal_name ||
    profile?.company_name ||
    profile?.full_name ||
    'Valued Customer'
  )

  const customerEmail = formatSafeString(
    invoice?.customer_email ||
    profile?.email ||
    ''
  )

  const rawAddr =
    invoice?.customer_address ||
    (invoice as any)?.customer_billing_address ||
    profile?.address ||
    profile?.street

  const customerAddress =
    formatAddressString(rawAddr) ||
    [
      profile?.address || profile?.street,
      profile?.city,
      profile?.state,
      profile?.pincode ? `${profile.pincode}` : '',
      profile?.country || 'India'
    ].filter(Boolean).join(', ') || 'India'

  const customerGstin = formatSafeString(
    invoice?.customer_gstin ||
    profile?.gst_number ||
    profile?.gstin ||
    'N/A'
  )

  const placeOfSupply = formatSafeString(
    invoice?.place_of_supply ||
    profile?.state ||
    'Delhi'
  )

  // Format currency helper
  const formatInr = (paisa: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(paisa / 100)
  }

  // Handle single unified Download action
  const handleDownload = async () => {
    if (!effectiveInvoiceId) {
      if (typeof window !== 'undefined') window.print()
      return
    }

    try {
      setDownloading(true)
      const res = await fetch(`/api/billing/invoices/download?id=${effectiveInvoiceId}`)
      if (!res.ok) throw new Error('Download request failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeNum = invoiceNumber.replace(/[\/\\:*?"<>|]/g, '_')
      a.download = `Invoice_${safeNum}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[Invoice Modal] Download failed:', err)
      if (typeof window !== 'undefined') window.print()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-stone-900/35 backdrop-blur-[2px] animate-in fade-in duration-150 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* 1. VERIFYING LOADER: WARM WHITE & GREY, SIMPLE & CLEAN        */}
      {/* ------------------------------------------------------------- */}
      {status === 'verifying' && (
        <div className="relative w-full max-w-sm bg-[#FAF9F6] border border-stone-200/90 rounded-2xl p-8 sm:p-9 shadow-xl text-center text-stone-900 space-y-4 animate-in zoom-in-95 duration-150">
          <div className="w-10 h-10 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin mx-auto" />
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-stone-900 tracking-tight">
              {title || 'Confirming payment...'}
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
              Please do not refresh or close this window while we finalize your order and generate your tax invoice.
            </p>
          </div>
          {paymentId && (
            <div className="pt-1">
              <span className="inline-block px-2.5 py-1 rounded-md bg-stone-100 text-stone-600 font-mono text-[10px] border border-stone-200/60">
                Ref: {paymentId}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ERROR STATE                                                */}
      {/* ------------------------------------------------------------- */}
      {status === 'error' && (
        <div className="relative w-full max-w-sm bg-[#FAF9F6] border border-stone-200/90 rounded-2xl p-7 shadow-xl text-center text-stone-900 space-y-4 animate-in zoom-in-95 duration-150">
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-stone-900">
              Payment Verification
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              {errorMessage || 'Payment could not be verified. If amount was deducted, our automatic reconciliation will credit it.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SUCCESS STATE: ON-SCREEN GST TAX INVOICE                    */}
      {/* ------------------------------------------------------------- */}
      {status === 'success' && (
        <div className="relative w-full max-w-3xl my-6 bg-[#FAF9F6] border border-stone-200/90 rounded-2xl shadow-2xl overflow-hidden text-stone-900 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
          {/* Top Bar: Exactly ONE Download PDF button + Close */}
          <div className="no-print p-3.5 sm:p-4 bg-white border-b border-stone-200/80 flex items-center justify-between gap-3 sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                  Payment Confirmed · Tax Invoice
                </h3>
                <span className="text-[10px] text-stone-500 block font-mono">
                  {invoiceNumber} · {formatInr(totalPaisa)}
                </span>
              </div>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Document Container */}
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-[#F5F5F3]/50">
            <div
              id="printable-invoice-document"
              className="bg-white text-stone-900 rounded-xl p-6 sm:p-8 shadow-sm border border-stone-200/80 space-y-6"
            >
              {/* Document Header: Statutory Entity Only */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-200/80 pb-5">
                <div className="space-y-1">
                  <h1 className="text-base font-bold text-stone-900 tracking-tight">
                    {invoice?.supplier_name || 'Vaakriti Technologies Private Limited'}
                  </h1>
                  <p className="text-[11px] text-stone-500 leading-relaxed max-w-sm">
                    India, Uttar Pradesh, Kanpur Nagar - 208022<br />
                    Email: support@trinetraedu-ai.com | Phone: +91 9580619562<br />
                    GSTIN: <span className="font-mono font-medium text-stone-700">{invoice?.supplier_gstin || '07AAAAA0000A1Z5'}</span>
                  </p>
                </div>

                <div className="sm:text-right space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-semibold tracking-wider uppercase font-mono border border-stone-200/60">
                    TAX INVOICE
                  </span>
                  <div className="text-sm font-semibold text-stone-900 font-mono">
                    {invoiceNumber}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Date: <span className="text-stone-700">{invoiceDateStr}</span>
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Place of Supply: <span className="text-stone-700">{placeOfSupply}</span>
                  </p>
                </div>
              </div>

              {/* Billed To (Customer Details From Profile) & Transaction Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Customer Details: Dynamic from Profile */}
                <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-stone-200/70 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                    Billed To
                  </span>
                  <p className="font-semibold text-stone-900 text-xs">
                    {customerName}
                  </p>
                  <p className="text-stone-600 font-mono text-[11px]">
                    {customerEmail}
                  </p>
                  {customerAddress && (
                    <p className="text-[11px] text-stone-500 leading-tight">
                      {customerAddress}
                    </p>
                  )}
                  {customerGstin && customerGstin !== 'N/A' && (
                    <p className="text-[11px] text-stone-600">
                      GSTIN: <span className="font-mono font-medium text-stone-800">{customerGstin}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-stone-500 pt-0.5">
                    Status: <span className="text-emerald-700 font-medium uppercase">Paid &amp; Settled</span>
                  </p>
                </div>

                {/* Transaction Details */}
                <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-stone-200/70 space-y-1 font-mono text-[11px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block font-sans">
                    Transaction Details
                  </span>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-500 font-sans">Payment Method:</span>
                    <span className="text-stone-800 font-sans">{invoice?.payment_method || 'Razorpay Gateway'}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-500 font-sans">Gateway Ref ID:</span>
                    <span className="text-stone-800 font-medium">{displayPaymentId}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-500 font-sans">Currency:</span>
                    <span className="text-stone-800">INR (₹)</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-500 font-sans">SAC Code:</span>
                    <span className="text-stone-800">998311</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-stone-200/80 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F6] border-b border-stone-200/80 text-[10px] font-semibold text-stone-500 uppercase tracking-wider font-mono">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Description / SAC</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">Total (Incl. GST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    {invoice?.line_items && invoice.line_items.length > 0 ? (
                      invoice.line_items.map((item, index) => {
                        const itemDesc = item.description || item.item || 'Cloud Voice & Platform Services'
                        const sac = item.sac_code || item.hsn_sac || '998311'
                        const { qty, taxablePaisa, totalItemPaisa } = resolveLineItemAmounts(
                          item,
                          totalPaisa,
                          subtotalPaisa,
                          invoice.line_items!.length
                        )

                        return (
                          <tr key={index} className="hover:bg-stone-50/50">
                            <td className="py-2.5 px-3 text-stone-400 font-mono text-[11px]">{index + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-stone-900 block">{itemDesc}</span>
                              <span className="text-[10px] text-stone-400 font-mono">SAC: {sac}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">{qty}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatInr(taxablePaisa)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">{formatInr(totalItemPaisa)}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td className="py-2.5 px-3 text-stone-400 font-mono text-[11px]">1</td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-stone-900 block">
                            {invoice?.plan_tier ? `${invoice.plan_tier} Plan Subscription` : 'Trinetra Platform Services'}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">SAC: 998311</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">1</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatInr(subtotalPaisa)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium">{formatInr(totalPaisa)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-800 space-y-0.5">
                  <div className="font-semibold flex items-center gap-1.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Paid &amp; Verified
                  </div>
                  <p className="text-[10px] text-emerald-700">Official GST computer-generated tax invoice</p>
                </div>

                <div className="w-full sm:w-64 space-y-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">{formatInr(subtotalPaisa)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>CGST (9.0%):</span>
                    <span className="font-mono">{formatInr(cgstPaisa)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>SGST (9.0%):</span>
                    <span className="font-mono">{formatInr(sgstPaisa)}</span>
                  </div>
                  <div className="h-px bg-stone-200 my-1" />
                  <div className="flex justify-between text-sm font-bold text-stone-900">
                    <span>Total Amount Paid:</span>
                    <span className="font-mono text-stone-900">{formatInr(totalPaisa)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Exactly ONE Download PDF button + Forward Navigation Button */}
          <div className="no-print p-3.5 sm:p-4 bg-white border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-stone-500 text-center sm:text-left flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Invoice generated &amp; saved to your Billing History
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 sm:flex-initial py-2 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-medium text-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={onContinue || onClose}
                className="flex-1 sm:flex-initial py-2 px-5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{continueLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
