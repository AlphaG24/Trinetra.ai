'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Upload,
  Check,
  Building2,
  QrCode,
  CreditCard,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export interface ClientInvoiceConfig {
  id?: string
  business_name: string
  trade_name?: string
  logo_url?: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  gstin?: string
  pan?: string
  upi_id: string
  upi_qr_url?: string
  bank_name?: string
  bank_account_no?: string
  bank_ifsc?: string
  bank_branch?: string
  invoice_prefix: string
  default_tax_rate: number
  invoice_terms: string
  letterhead_mode: 'dynamic' | 'letterhead'
  letterhead_pdf_url?: string
  is_active: boolean
}

const DEFAULT_CONFIG: ClientInvoiceConfig = {
  business_name: '',
  trade_name: '',
  logo_url: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: 'Delhi',
  pincode: '',
  phone: '',
  email: '',
  gstin: '',
  pan: '',
  upi_id: '',
  upi_qr_url: '',
  bank_name: '',
  bank_account_no: '',
  bank_ifsc: '',
  bank_branch: '',
  invoice_prefix: 'INV/26-27/',
  default_tax_rate: 18,
  invoice_terms: 'Payment due upon receipt. Goods or services once confirmed are subject to company policy.',
  letterhead_mode: 'dynamic',
  is_active: true
}

export default function ClientInvoiceSetupTab() {
  const [config, setConfig] = useState<ClientInvoiceConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Fetch existing config from catalog on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true)
        const res = await fetch('/api/business-catalog?category=custom_invoice_config')
        if (res.ok) {
          const data = await res.json()
          if (data.items && data.items.length > 0) {
            const item = data.items[0]
            const meta = item.metadata || {}
            setConfig({
              id: item.id,
              business_name: item.title || meta.business_name || '',
              trade_name: meta.trade_name || '',
              logo_url: meta.logo_url || '',
              address_line1: meta.address_line1 || '',
              address_line2: meta.address_line2 || '',
              city: meta.city || '',
              state: meta.state || 'Delhi',
              pincode: meta.pincode || '',
              phone: meta.phone || '',
              email: meta.email || '',
              gstin: meta.gstin || '',
              pan: meta.pan || '',
              upi_id: meta.upi_id || '',
              upi_qr_url: meta.upi_qr_url || '',
              bank_name: meta.bank_name || '',
              bank_account_no: meta.bank_account_no || '',
              bank_ifsc: meta.bank_ifsc || '',
              bank_branch: meta.bank_branch || '',
              invoice_prefix: meta.invoice_prefix || 'INV/26-27/',
              default_tax_rate: meta.default_tax_rate ?? 18,
              invoice_terms: meta.invoice_terms || DEFAULT_CONFIG.invoice_terms,
              letterhead_mode: meta.letterhead_mode || 'dynamic',
              letterhead_pdf_url: meta.letterhead_pdf_url || '',
              is_active: item.status === 'active'
            })
          }
        }
      } catch (err) {
        console.error('Failed to load client invoice config:', err)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  // Save handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!config.business_name.trim()) {
      toast.error('Please enter your Business / Trade Name')
      return
    }

    try {
      setSaving(true)
      const payload = {
        id: config.id,
        title: config.business_name,
        category: 'custom_invoice_config',
        status: config.is_active ? 'active' : 'paused',
        metadata: {
          business_name: config.business_name,
          trade_name: config.trade_name,
          logo_url: config.logo_url,
          address_line1: config.address_line1,
          address_line2: config.address_line2,
          city: config.city,
          state: config.state,
          pincode: config.pincode,
          phone: config.phone,
          email: config.email,
          gstin: config.gstin,
          pan: config.pan,
          upi_id: config.upi_id,
          upi_qr_url: config.upi_qr_url,
          bank_name: config.bank_name,
          bank_account_no: config.bank_account_no,
          bank_ifsc: config.bank_ifsc,
          bank_branch: config.bank_branch,
          invoice_prefix: config.invoice_prefix,
          default_tax_rate: config.default_tax_rate,
          invoice_terms: config.invoice_terms,
          letterhead_mode: config.letterhead_mode,
          letterhead_pdf_url: config.letterhead_pdf_url
        }
      }

      const res = await fetch('/api/business-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to save invoice configuration')
      const data = await res.json()
      if (data.item?.id && !config.id) {
        setConfig(prev => ({ ...prev, id: data.item.id }))
      }
      toast.success('Custom invoice & payment settings saved successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Error saving invoice setup')
    } finally {
      setSaving(false)
    }
  }

  // Handle sample PDF download
  const handleDownloadSample = () => {
    try {
      setDownloading(true)
      const sampleNumber = `${config.invoice_prefix || 'INV/'}0001`
      const taxRate = Number(config.default_tax_rate) || 18
      const subtotal = 1200
      const taxAmount = (subtotal * taxRate) / 100
      const total = subtotal + taxAmount

      const win = window.open('', '_blank')
      if (!win) {
        toast.error('Pop-up blocked. Please allow pop-ups to view invoice.')
        return
      }

      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sample Invoice - ${sampleNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; margin: 0; background: #fff; }
            .invoice-box { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .logo-cell { width: 40%; vertical-align: top; }
            .meta-cell { width: 60%; text-align: right; vertical-align: top; }
            .biz-title { font-size: 22px; font-weight: bold; color: #0f172a; margin: 0; }
            .biz-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
            .inv-badge { display: inline-block; background: #f1f5f9; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
            .items-table th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; }
            .items-table td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; font-size: 12px; }
            .total-row td { font-weight: bold; font-size: 14px; border-top: 2px solid #0f172a; }
            .payment-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 12px; }
            .footer-notes { margin-top: 30px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            @media print { body { padding: 0; } .invoice-box { border: none; } }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <table class="header-table">
              <tr>
                <td class="logo-cell">
                  ${config.logo_url ? `<img src="${config.logo_url}" style="max-height: 50px; margin-bottom: 8px;" alt="Logo" /><br/>` : ''}
                  <h1 class="biz-title">${config.business_name || 'Your Business Name'}</h1>
                  <div class="biz-sub">
                    ${config.address_line1 ? `${config.address_line1}, ` : ''}${config.city ? `${config.city}, ` : ''}${config.state || ''} ${config.pincode || ''}<br/>
                    ${config.gstin ? `<strong>GSTIN:</strong> ${config.gstin} | ` : ''}Phone: ${config.phone || '+91 98765 00000'}
                  </div>
                </td>
                <td class="meta-cell">
                  <span class="inv-badge">TAX INVOICE</span>
                  <div style="margin-top: 10px; font-size: 13px;">
                    <strong>Invoice #:</strong> ${sampleNumber}<br/>
                    <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br/>
                    <strong>Place of Supply:</strong> ${config.state || 'Delhi'}
                  </div>
                </td>
              </tr>
            </table>

            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 12px; margin-bottom: 20px;">
              <strong>Billed To:</strong> Rahul Sharma (+91 98765 43210)<br/>
              <em>Order booked via AI Voice Assistant</em>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item / Service</th>
                  <th>SAC/HSN</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Rate</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consultation / Premium Service Booking</td>
                  <td>998311</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">₹1,200.00</td>
                  <td style="text-align: right;">₹1,200.00</td>
                </tr>
                <tr>
                  <td colspan="4" style="text-align: right;">Taxable Subtotal:</td>
                  <td style="text-align: right;">₹${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="4" style="text-align: right;">GST (${taxRate}%):</td>
                  <td style="text-align: right;">₹${taxAmount.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="4" style="text-align: right;">Grand Total:</td>
                  <td style="text-align: right;">₹${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="payment-card">
              <h4 style="margin: 0 0 8px 0; font-size: 13px;">Payment Instructions:</h4>
              ${config.upi_id ? `<div><strong>UPI ID:</strong> <span style="font-family: monospace; font-size: 13px;">${config.upi_id}</span></div>` : ''}
              ${config.bank_account_no ? `<div><strong>Bank Transfer:</strong> A/C: ${config.bank_account_no} | IFSC: ${config.bank_ifsc || 'N/A'} | Bank: ${config.bank_name || 'N/A'}</div>` : ''}
            </div>

            <div class="footer-notes">
              <strong>Terms:</strong> ${config.invoice_terms}
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `)
      win.document.close()
    } catch (err) {
      toast.error('Failed to open sample invoice')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading your custom invoice settings...
      </div>
    )
  }

  const sampleTaxRate = Number(config.default_tax_rate) || 18
  const sampleSubtotal = 1200
  const sampleTax = (sampleSubtotal * sampleTaxRate) / 100
  const sampleGrandTotal = sampleSubtotal + sampleTax

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Intro Banner */}
      <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--heading)] font-display flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--heading)]" />
            Client Invoice & Payment Dispatch Setup
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Configure your brand identity, logo, GST details, and UPI information. When your AI voice bot closes an order or appointment on a call, it automatically generates and sends this branded invoice to the customer on WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadSample}
            disabled={downloading}
            className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--hover-bg)] text-xs font-semibold text-[var(--heading)] hover:bg-[var(--card-bg)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Print / Preview Sample
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Card 1: Business Identity */}
            <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--heading)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <Building2 className="w-4 h-4" />
                1. Business Identity & Branding
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Business / Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Purvi Roadlines / Aura Hair Salon"
                    value={config.business_name}
                    onChange={e => setConfig({ ...config, business_name: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Legal / Registered Entity (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Purvi Logistics Pvt. Ltd."
                    value={config.trade_name}
                    onChange={e => setConfig({ ...config, trade_name: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Logo Image URL (PNG / JPG / WebP)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={config.logo_url}
                      onChange={e => setConfig({ ...config, logo_url: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                    {config.logo_url && (
                      <div className="w-9 h-9 rounded-lg border border-[var(--border)] p-1 bg-white flex items-center justify-center shrink-0">
                        <img src={config.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    GSTIN (Tax ID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    value={config.gstin}
                    onChange={e => setConfig({ ...config, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 uppercase"
                  />
                  <span className="text-[10px] text-[var(--muted)] mt-0.5 block">Leave empty if unregistered MSME</span>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    PAN Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={config.pan}
                    onChange={e => setConfig({ ...config, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Registered Business Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop #12, Ground Floor, Central Market"
                    value={config.address_line1}
                    onChange={e => setConfig({ ...config, address_line1: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City (e.g. Kanpur)"
                      value={config.city}
                      onChange={e => setConfig({ ...config, city: e.target.value })}
                      className="px-3 py-1.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg text-[var(--heading)] text-xs"
                    />
                    <input
                      type="text"
                      placeholder="State (e.g. Uttar Pradesh)"
                      value={config.state}
                      onChange={e => setConfig({ ...config, state: e.target.value })}
                      className="px-3 py-1.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg text-[var(--heading)] text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Pincode (e.g. 208001)"
                      value={config.pincode}
                      onChange={e => setConfig({ ...config, pincode: e.target.value })}
                      className="px-3 py-1.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg text-[var(--heading)] text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={config.phone}
                    onChange={e => setConfig({ ...config, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Support / Invoicing Email
                  </label>
                  <input
                    type="email"
                    placeholder="billing@yourbusiness.com"
                    value={config.email}
                    onChange={e => setConfig({ ...config, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)]"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Payment Collection & Banking */}
            <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--heading)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <QrCode className="w-4 h-4" />
                2. Payment Details (Sent to Callers via WhatsApp)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Primary UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. business@okhdfcbank"
                    value={config.upi_id}
                    onChange={e => setConfig({ ...config, upi_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                  <span className="text-[10px] text-[var(--muted)] mt-0.5 block">
                    Your bot uses this UPI ID to generate direct payment links during calls.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    UPI QR Code Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/my-qr.png"
                    value={config.upi_qr_url}
                    onChange={e => setConfig({ ...config, upi_qr_url: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono text-[11px]"
                  />
                  <span className="text-[10px] text-[var(--muted)] mt-0.5 block">
                    Printed in the payment box on generated invoice PDFs.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Bank Name & Branch
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, Mall Road Branch"
                    value={config.bank_name}
                    onChange={e => setConfig({ ...config, bank_name: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50200012345678"
                    value={config.bank_account_no}
                    onChange={e => setConfig({ ...config, bank_account_no: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Bank IFSC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    value={config.bank_ifsc}
                    onChange={e => setConfig({ ...config, bank_ifsc: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Invoice Prefix & Custom Terms */}
            <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--heading)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <FileText className="w-4 h-4" />
                3. Invoice Formatting & Legal Terms
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SALON/ or TRANS/26-27/"
                    value={config.invoice_prefix}
                    onChange={e => setConfig({ ...config, invoice_prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-mono"
                  />
                  <span className="text-[10px] text-[var(--muted)] mt-0.5 block">
                    Example output: {config.invoice_prefix || 'INV/'}0042
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Default Tax Rate (GST %)
                  </label>
                  <select
                    value={config.default_tax_rate}
                    onChange={e => setConfig({ ...config, default_tax_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] font-medium"
                  >
                    <option value={0}>0% (Tax Exempt / Non-GST)</option>
                    <option value={5}>5% (Transport, Essential Services)</option>
                    <option value={12}>12% (Standard MSME Services)</option>
                    <option value={18}>18% (Commercial / Consulting / IT)</option>
                    <option value={28}>28% (Luxury / Specific Goods)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[var(--heading)] mb-1">
                    Terms & Conditions / Footer Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter standard warranty, refund, or payment terms..."
                    value={config.invoice_terms}
                    onChange={e => setConfig({ ...config, invoice_terms: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)]"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--heading)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.is_active}
                  onChange={e => setConfig({ ...config, is_active: e.target.checked })}
                  className="rounded border-[var(--border)] w-4 h-4"
                />
                <span>Enable automated invoice dispatch on completed calls</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Right Live Preview: 5 cols */}
        <div className="lg:col-span-5 sticky top-24 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--muted)] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Live Caller Invoice Preview
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Interactive
            </span>
          </div>

          {/* Rendered Invoice Card */}
          <div className="p-5 rounded-2xl bg-white text-zinc-900 border border-zinc-200 shadow-md text-[11px] space-y-4 font-sans select-none">
            {/* Top Header */}
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <div>
                {config.logo_url && (
                  <img src={config.logo_url} alt="Logo" className="max-h-8 mb-1.5 object-contain" />
                )}
                <h4 className="font-bold text-sm text-zinc-900 leading-tight">
                  {config.business_name || 'Your Business Name'}
                </h4>
                {config.trade_name && (
                  <p className="text-[10px] text-zinc-500">{config.trade_name}</p>
                )}
                <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                  {config.address_line1 || '123 Market Road'}{config.city ? `, ${config.city}` : ''}
                  <br />
                  {config.state || 'Delhi'} {config.pincode || ''}
                  {config.gstin && <><br /><strong>GSTIN:</strong> {config.gstin}</>}
                </p>
              </div>

              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-300 text-[10px] font-bold text-zinc-800">
                  TAX INVOICE
                </span>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">
                  {config.invoice_prefix || 'INV/'}0042
                </p>
                <p className="text-[10px] text-zinc-500">
                  {new Date().toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            {/* Billed To Box */}
            <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-700">
              <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[9px]">Billed To (Caller)</span>
              <p className="font-semibold text-zinc-900 text-xs mt-0.5">Rahul Sharma</p>
              <p className="font-mono text-zinc-500">+91 98765 43210</p>
            </div>

            {/* Items Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-300 text-[9px] uppercase tracking-wider text-zinc-500">
                  <th className="py-1">Description</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[10px]">
                <tr>
                  <td className="py-1.5 font-medium">Booked Service / Product Order</td>
                  <td className="py-1.5 text-center font-mono">1</td>
                  <td className="py-1.5 text-right font-mono">₹{sampleSubtotal.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono">₹{sampleSubtotal.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot className="border-t border-zinc-200 text-[10px]">
                <tr>
                  <td colSpan={3} className="py-1 text-right text-zinc-500">Subtotal:</td>
                  <td className="py-1 text-right font-mono">₹{sampleSubtotal.toFixed(2)}</td>
                </tr>
                {sampleTaxRate > 0 && (
                  <tr>
                    <td colSpan={3} className="py-1 text-right text-zinc-500">GST ({sampleTaxRate}%):</td>
                    <td className="py-1 text-right font-mono">₹{sampleTax.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="font-bold text-xs border-t border-zinc-300">
                  <td colSpan={3} className="pt-1.5 text-right text-zinc-900">Total Due:</td>
                  <td className="pt-1.5 text-right font-mono text-emerald-700">₹{sampleGrandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Payment & UPI Block */}
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Scan & Pay via UPI</span>
                <p className="font-mono text-xs font-bold text-zinc-900">{config.upi_id || 'your-vpa@upi'}</p>
                {config.bank_account_no && (
                  <p className="text-[9px] text-zinc-500 font-mono">
                    A/C: {config.bank_account_no} • IFSC: {config.bank_ifsc || 'N/A'}
                  </p>
                )}
              </div>

              <div className="w-12 h-12 bg-white border border-zinc-300 rounded p-1 flex items-center justify-center shrink-0">
                {config.upi_qr_url ? (
                  <img src={config.upi_qr_url} alt="QR" className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-8 h-8 text-zinc-400" />
                )}
              </div>
            </div>

            {/* Terms Footer */}
            <p className="text-[9px] text-zinc-500 italic border-t border-zinc-200 pt-2 leading-relaxed">
              <strong>Terms:</strong> {config.invoice_terms}
            </p>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-[11px] text-[var(--muted)] flex items-start gap-2">
            <Info className="w-4 h-4 text-[var(--heading)] shrink-0 mt-0.5" />
            <span>
              During live calls, the bot automatically fills the caller's agreed price, quantities, and items from your catalog or spoken orders into this invoice layout.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
