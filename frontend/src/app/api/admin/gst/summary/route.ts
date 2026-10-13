import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SUPPLIER_GSTIN, SUPPLIER_STATE, SUPPLIER_STATE_CODE, INDIAN_GST_STATES } from '@/lib/gst'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden: Admin role required', status: 403 }
  }

  return { user }
}

export async function GET() {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const adminClient = getAdminClient()

    // Query all paid invoices
    const { data: invoices, error: invErr } = await adminClient
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (invErr) {
      throw invErr
    }

    const allInvoices = invoices || []

    let totalTaxCollectedPaisa = 0
    let totalCgstPaisa = 0
    let totalSgstPaisa = 0
    let totalIgstPaisa = 0
    let totalTaxablePaisa = 0
    let totalGrandTotalPaisa = 0

    let b2bInvoicesCount = 0
    let b2cInvoicesCount = 0

    const b2bCustomersMap: Record<string, {
      legalName: string
      gstin: string
      state: string
      stateCode: string
      invoiceCount: number
      totalTaxablePaisa: number
      totalTaxPaisa: number
      lastInvoiceDate: string
      lastInvoiceNumber: string
    }> = {}

    const stateDistributionMap: Record<string, {
      stateName: string
      stateCode: string
      invoiceCount: number
      taxablePaisa: number
      taxPaisa: number
    }> = {}

    allInvoices.forEach(inv => {
      // Feature 3: Exclude ₹99 trial invoices from GST collection & ITC ledger
      const isTrial =
        inv.plan_tier === 'trial' ||
        inv.invoice_type === 'trial' ||
        (Array.isArray(inv.line_items) && inv.line_items.some((item: any) =>
          item.is_trial === true ||
          item.invoice_type === 'trial' ||
          (item.item || item.description || '').toLowerCase().includes('trial')
        )) ||
        ((inv.grand_total_paisa === 9900 || inv.total_amount === 9900) && (inv.total_tax_paisa === 0 || !inv.total_tax_paisa))

      if (isTrial) {
        // ₹99 Trial has 0 CGST/SGST and does not affect the platform GST tax ledger
        return
      }

      const taxable = inv.subtotal_paisa || inv.subscription_amount || 0
      const totalTax = inv.total_tax_paisa || inv.tax_amount || 0
      const grandTotal = inv.grand_total_paisa || inv.total_amount || (taxable + totalTax)

      const cgst = inv.cgst_amount_paisa || 0
      const sgst = inv.sgst_amount_paisa || 0
      const igst = inv.igst_amount_paisa || 0

      totalTaxablePaisa += taxable
      totalTaxCollectedPaisa += totalTax
      totalGrandTotalPaisa += grandTotal
      totalCgstPaisa += cgst
      totalSgstPaisa += sgst
      totalIgstPaisa += igst

      const gstin = inv.customer_gstin && inv.customer_gstin !== 'N/A' && inv.customer_gstin.trim() !== ''
        ? inv.customer_gstin.trim().toUpperCase()
        : null

      const stateCode = inv.customer_state_code || (gstin ? gstin.substring(0, 2) : SUPPLIER_STATE_CODE)
      const stateName = inv.customer_state || inv.place_of_supply || INDIAN_GST_STATES[stateCode] || 'Delhi'

      if (gstin) {
        b2bInvoicesCount += 1
        if (!b2bCustomersMap[gstin]) {
          b2bCustomersMap[gstin] = {
            legalName: inv.customer_legal_name || 'Registered Business',
            gstin,
            state: stateName,
            stateCode,
            invoiceCount: 0,
            totalTaxablePaisa: 0,
            totalTaxPaisa: 0,
            lastInvoiceDate: inv.created_at,
            lastInvoiceNumber: inv.invoice_number
          }
        }
        b2bCustomersMap[gstin].invoiceCount += 1
        b2bCustomersMap[gstin].totalTaxablePaisa += taxable
        b2bCustomersMap[gstin].totalTaxPaisa += totalTax
      } else {
        b2cInvoicesCount += 1
      }

      // State distribution
      if (!stateDistributionMap[stateCode]) {
        stateDistributionMap[stateCode] = {
          stateName,
          stateCode,
          invoiceCount: 0,
          taxablePaisa: 0,
          taxPaisa: 0
        }
      }
      stateDistributionMap[stateCode].invoiceCount += 1
      stateDistributionMap[stateCode].taxablePaisa += taxable
      stateDistributionMap[stateCode].taxPaisa += totalTax
    })

    return NextResponse.json({
      summary: {
        totalTaxCollectedInr: totalTaxCollectedPaisa / 100,
        totalTaxableInr: totalTaxablePaisa / 100,
        totalGrandTotalInr: totalGrandTotalPaisa / 100,
        intraState: {
          cgstInr: totalCgstPaisa / 100,
          sgstInr: totalSgstPaisa / 100,
          totalIntraInr: (totalCgstPaisa + totalSgstPaisa) / 100
        },
        interState: {
          igstInr: totalIgstPaisa / 100
        },
        b2bInvoicesCount,
        b2cInvoicesCount,
        totalInvoices: allInvoices.length,
        supplierGstin: SUPPLIER_GSTIN,
        supplierState: SUPPLIER_STATE
      },
      b2bCustomers: Object.values(b2bCustomersMap).map(c => ({
        ...c,
        totalTaxableInr: c.totalTaxablePaisa / 100,
        totalTaxInr: c.totalTaxPaisa / 100
      })),
      stateDistribution: Object.values(stateDistributionMap).map(s => ({
        ...s,
        taxableInr: s.taxablePaisa / 100,
        taxInr: s.taxPaisa / 100
      })),
      recentInvoices: allInvoices.slice(0, 50)
    })
  } catch (error: any) {
    console.error('[Admin GST Summary GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
