import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateInvoicePdf } from '@/lib/pdf'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
  const invTotalRupees = invTotalPaisa / 100
  const isLikelyRupees =
    rawNum <= invTotalRupees * 1.25 &&
    !('amount_paisa' in item || 'taxable_paisa' in item || 'rate_paisa' in item || 'total_paisa' in item)

  const valInPaisa = isLikelyRupees ? Math.round(rawNum * 100) : Math.round(rawNum)

  let taxablePaisa = valInPaisa
  let totalItemPaisa = Math.round(valInPaisa * 1.18)

  if (
    valInPaisa > invSubtotalPaisa * 1.05 ||
    Math.abs(valInPaisa - invTotalPaisa) < Math.abs(valInPaisa - invSubtotalPaisa)
  ) {
    totalItemPaisa = valInPaisa
    taxablePaisa = Math.round(valInPaisa / 1.18)
  }

  return { qty, taxablePaisa, totalItemPaisa }
}

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
    return Object.values(addr).filter(v => typeof v === 'string' && (v as string).trim().length > 0).join(', ')
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('id')

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's profile
    const adminClient = getAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // Fetch the invoice to verify ownership
    const { data: invoice, error: invoiceErr } = await adminClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle()

    if (invoiceErr || !invoice) {
      console.error('[Invoice Download API] Invoice query error:', invoiceErr)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Verify ownership: match organization_id, profile email, or admin role
    const isOrgMatch = Boolean(profile?.organization_id && invoice.organization_id === profile.organization_id)
    const isCustomerMatch = Boolean(
      (profile?.full_name && invoice.customer_legal_name === profile.full_name) ||
      (profile?.company_name && invoice.customer_legal_name === profile.company_name) ||
      (user.email && invoice.customer_email === user.email)
    )
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    if (!isOrgMatch && !isCustomerMatch && !isAdmin) {
      console.warn('[Invoice Download API] Unauthorized download attempt by user:', user.id)
      return NextResponse.json({ error: 'Unauthorized to download this invoice' }, { status: 403 })
    }

    // Resolve customer details from profile
    const resolvedCustomerName = formatSafeString(
      invoice.customer_legal_name ||
      profile?.company_name ||
      profile?.full_name ||
      'Valued Customer'
    )

    const resolvedCustomerEmail = formatSafeString(
      invoice.customer_email ||
      profile?.email ||
      user.email ||
      ''
    )

    const rawAddr =
      invoice.customer_address ||
      invoice.customer_billing_address ||
      profile?.address ||
      profile?.street

    const resolvedCustomerAddress =
      formatAddressString(rawAddr) ||
      [
        profile?.address || profile?.street,
        profile?.city,
        profile?.state,
        profile?.pincode ? `${profile.pincode}` : '',
        profile?.country || 'India'
      ].filter(Boolean).join(', ') || 'IN'

    const resolvedCustomerGstin = formatSafeString(
      invoice.customer_gstin ||
      profile?.gst_number ||
      profile?.gstin ||
      'N/A'
    )

    const resolvedPlaceOfSupply = formatSafeString(
      invoice.place_of_supply ||
      profile?.state ||
      'Delhi'
    )

    // Financial calculations matching on-screen invoice modal exactly
    const finalTotalPaisa =
      Number(invoice.grand_total_paisa || 0) > 0
        ? Number(invoice.grand_total_paisa)
        : Number(invoice.total_amount || 0) > 0
        ? Number(invoice.total_amount)
        : Number(invoice.subscription_amount || 0)

    const subtotalPaisa =
      Number(invoice.subtotal_paisa || 0) > 0
        ? Number(invoice.subtotal_paisa)
        : Number(invoice.subscription_amount || 0) > 0 && Number(invoice.subscription_amount) < finalTotalPaisa
        ? Number(invoice.subscription_amount)
        : Math.round(finalTotalPaisa / 1.18)

    const taxPaisa =
      Number(invoice.total_tax_paisa || 0) > 0
        ? Number(invoice.total_tax_paisa)
        : Number(invoice.tax_amount || 0) > 0
        ? Number(invoice.tax_amount)
        : Math.max(0, finalTotalPaisa - subtotalPaisa)

    const cgstPaisa =
      Number(invoice.cgst_amount_paisa || 0) > 0
        ? Number(invoice.cgst_amount_paisa)
        : Math.round(taxPaisa / 2)

    const sgstPaisa =
      Number(invoice.sgst_amount_paisa || 0) > 0
        ? Number(invoice.sgst_amount_paisa)
        : taxPaisa - cgstPaisa

    const igstPaisa = Number(invoice.igst_amount_paisa || 0)

    const invoiceLines = Array.isArray(invoice.line_items) ? invoice.line_items : []

    const items = invoiceLines.length > 0 ? invoiceLines.map((item: any) => {
      const itemDesc = item.description || item.item || 'Cloud Voice & Platform Services'
      const sac = item.sac_code || item.hsn_sac || '998311'
      const { qty, taxablePaisa, totalItemPaisa } = resolveLineItemAmounts(
        item,
        finalTotalPaisa,
        subtotalPaisa,
        invoiceLines.length
      )
      return {
        quantity: qty,
        description: itemDesc,
        sac: sac,
        rate: (taxablePaisa / 100).toFixed(2),
        amount: (totalItemPaisa / 100).toFixed(2)
      }
    }) : [{
      quantity: 1,
      description: invoice.plan_tier ? `${invoice.plan_tier} Plan Subscription` : 'Trinetra Platform Services',
      sac: '998311',
      rate: (subtotalPaisa / 100).toFixed(2),
      amount: (finalTotalPaisa / 100).toFixed(2)
    }]

    const invoiceDateStr = invoice.created_at
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

    const pdfBuffer = generateInvoicePdf({
      invoiceNumber: invoice.invoice_number,
      date: invoiceDateStr,
      customerName: resolvedCustomerName,
      customerEmail: resolvedCustomerEmail,
      customerAddress: resolvedCustomerAddress,
      customerGstin: resolvedCustomerGstin,
      subtotal: (subtotalPaisa / 100).toFixed(2),
      tax: (taxPaisa / 100).toFixed(2),
      total: (finalTotalPaisa / 100).toFixed(2),
      cgst: (cgstPaisa / 100).toFixed(2),
      sgst: (sgstPaisa / 100).toFixed(2),
      igst: igstPaisa > 0 ? (igstPaisa / 100).toFixed(2) : undefined,
      paymentMethod: invoice.payment_method || 'Razorpay Gateway',
      transactionId: invoice.payment_id || invoice.payment_reference_id || 'N/A',
      placeOfSupply: resolvedPlaceOfSupply,
      amountInWords: 'Rupees ' + (finalTotalPaisa / 100).toLocaleString('en-IN') + ' Only',
      supplierName: invoice.supplier_name || 'Vaakriti Technologies Private Limited',
      supplierGstin: invoice.supplier_gstin || '07AAAAA0000A1Z5',
      sacCode: '998311',
      items
    })

    const safeInvoiceFilename = (invoice.invoice_number || 'receipt').replace(/[\/\\:*?"<>|]/g, '_')
    // Return PDF stream directly to trigger browser download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${safeInvoiceFilename}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[Invoice Download API] Fatal error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
