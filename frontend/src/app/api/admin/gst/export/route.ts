import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SUPPLIER_GSTIN, SUPPLIER_STATE, INDIAN_GST_STATES } from '@/lib/gst'

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
    const { data: invoices, error: invErr } = await adminClient
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (invErr) throw invErr

    const rows = invoices || []

    // Build standard GSTR-1 CSV format
    const csvHeaders = [
      'Invoice Number',
      'Invoice Date',
      'Fiscal Year',
      'Customer Legal Name',
      'Customer GSTIN',
      'Customer Type',
      'Place of Supply (State)',
      'State Code',
      'HSN/SAC Code',
      'Taxable Value (INR)',
      'GST Rate (%)',
      'CGST Amount (INR)',
      'SGST Amount (INR)',
      'IGST Amount (INR)',
      'Total Tax Amount (INR)',
      'Total Invoice Value (INR)',
      'Payment Status',
      'Payment Reference ID'
    ]

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""'
      const val = String(str).replace(/"/g, '""')
      return `"${val}"`
    }

    const csvLines = [csvHeaders.join(',')]

    rows.forEach(inv => {
      const gstin = inv.customer_gstin && inv.customer_gstin !== 'N/A' && inv.customer_gstin.trim() !== ''
        ? inv.customer_gstin.trim().toUpperCase()
        : ''
      const customerType = gstin ? 'B2B' : 'B2C'
      const stateCode = inv.customer_state_code || (gstin ? gstin.substring(0, 2) : '07')
      const placeOfSupply = inv.place_of_supply || inv.customer_state || INDIAN_GST_STATES[stateCode] || 'Delhi'

      const taxableInr = ((inv.subtotal_paisa || inv.subscription_amount || 0) / 100).toFixed(2)
      const cgstInr = ((inv.cgst_amount_paisa || 0) / 100).toFixed(2)
      const sgstInr = ((inv.sgst_amount_paisa || 0) / 100).toFixed(2)
      const igstInr = ((inv.igst_amount_paisa || 0) / 100).toFixed(2)
      const totalTaxInr = ((inv.total_tax_paisa || inv.tax_amount || 0) / 100).toFixed(2)
      const grandTotalInr = ((inv.grand_total_paisa || inv.total_amount || 0) / 100).toFixed(2)

      const line = [
        escapeCsv(inv.invoice_number),
        escapeCsv(new Date(inv.created_at).toISOString().split('T')[0]),
        escapeCsv(inv.fiscal_year || '2026-2027'),
        escapeCsv(inv.customer_legal_name || 'Individual Customer'),
        escapeCsv(gstin || 'URP'), // Unregistered Person
        escapeCsv(customerType),
        escapeCsv(placeOfSupply),
        escapeCsv(stateCode),
        escapeCsv('998311'), // SAC for IT & Software Cloud
        escapeCsv(taxableInr),
        escapeCsv('18.00'),
        escapeCsv(cgstInr),
        escapeCsv(sgstInr),
        escapeCsv(igstInr),
        escapeCsv(totalTaxInr),
        escapeCsv(grandTotalInr),
        escapeCsv(inv.status || 'paid'),
        escapeCsv(inv.payment_id || inv.payment_reference_id || '')
      ].join(',')

      csvLines.push(line)
    })

    const csvContent = csvLines.join('\n')

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="GSTR-1_Report_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error: any) {
    console.error('[Admin GSTR-1 CSV Export] Error:', error)
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 })
  }
}
