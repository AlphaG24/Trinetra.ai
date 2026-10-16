import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = getAdminClient()

    // Fetch user profile to enrich invoice customer details
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    const resolvedCustomerName =
      profile?.company_name ||
      profile?.full_name ||
      user.email!

    const resolvedCustomerAddress = [
      profile?.address || profile?.street,
      profile?.city,
      profile?.state,
      profile?.pincode ? `${profile.pincode}` : '',
      profile?.country || 'India'
    ].filter(Boolean).join(', ') || 'India'

    const resolvedCustomerGstin = profile?.gst_number || profile?.gstin || 'N/A'
    const resolvedPlaceOfSupply = profile?.state || 'Delhi / India'

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('id')

    if (invoiceId) {
      const { data: inv, error: invErr } = await adminClient
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .maybeSingle()

      if (invErr || !inv) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      // Verify ownership
      const isOwner =
        (profile?.organization_id && inv.organization_id === profile.organization_id) ||
        inv.customer_legal_name === profile?.full_name ||
        inv.customer_legal_name === profile?.company_name ||
        profile?.role === 'admin' ||
        profile?.role === 'super_admin'

      if (!isOwner) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const totalPaisa =
        (inv.grand_total_paisa && Number(inv.grand_total_paisa) > 0)
          ? Number(inv.grand_total_paisa)
          : (inv.total_amount && Number(inv.total_amount) > 0)
          ? Number(inv.total_amount)
          : (inv.subscription_amount && Number(inv.subscription_amount) > 0)
          ? Number(inv.subscription_amount)
          : 0

      return NextResponse.json({
        invoice: {
          ...inv,
          grand_total_paisa: totalPaisa,
          total_amount: totalPaisa,
          customer_legal_name: inv.customer_legal_name || resolvedCustomerName,
          customer_email: inv.customer_email || user.email,
          customer_address: inv.customer_address || resolvedCustomerAddress,
          customer_gstin: inv.customer_gstin || resolvedCustomerGstin,
          place_of_supply: inv.place_of_supply || resolvedPlaceOfSupply,
          supplier_name: inv.supplier_name || 'Vaakriti Technologies Private Limited',
          supplier_gstin: inv.supplier_gstin || '07AAAAA0000A1Z5'
        }
      })
    }

    // Query list of invoices for the user's organization or user email
    let invoices: any[] = []

    if (profile?.organization_id) {
      const { data: orgInvoices, error: fetchErr } = await adminClient
        .from('invoices')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

      if (fetchErr) {
        console.error('[INVOICES API] Org Invoices Fetch error:', fetchErr)
      } else if (orgInvoices) {
        invoices.push(...orgInvoices)
      }
    }

    if (user.email) {
      const { data: emailInvoices } = await adminClient
        .from('invoices')
        .select('*')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false })

      if (emailInvoices) {
        for (const ei of emailInvoices) {
          if (!invoices.some(i => i.id === ei.id)) {
            invoices.push(ei)
          }
        }
      }
    }

    // Sort combined invoices descending by date
    invoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log('[INVOICES API] Total invoices found:', invoices.length)

    const mappedInvoices = (invoices || []).map((inv: any, idx: number) => {
      let invNum = inv.invoice_number
      if (invNum?.startsWith('TRI-')) {
        invNum = `VAK/26-27/${String(idx + 1).padStart(5, '0')}`
      }
      const totalPaisa =
        (inv.grand_total_paisa && Number(inv.grand_total_paisa) > 0)
          ? Number(inv.grand_total_paisa)
          : (inv.total_amount && Number(inv.total_amount) > 0)
          ? Number(inv.total_amount)
          : (inv.subscription_amount && Number(inv.subscription_amount) > 0)
          ? Number(inv.subscription_amount)
          : 0

      return {
        ...inv,
        invoice_number: invNum,
        grand_total_paisa: totalPaisa,
        total_amount: totalPaisa,
        customer_legal_name: inv.customer_legal_name || resolvedCustomerName,
        customer_email: inv.customer_email || user.email,
        customer_address: inv.customer_address || resolvedCustomerAddress,
        customer_gstin: inv.customer_gstin || resolvedCustomerGstin,
        place_of_supply: inv.place_of_supply || resolvedPlaceOfSupply,
        supplier_name: inv.supplier_name || 'Vaakriti Technologies Private Limited',
        supplier_gstin: inv.supplier_gstin || '07AAAAA0000A1Z5'
      }
    })

    return NextResponse.json({ invoices: mappedInvoices })
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}