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

    // Get the user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, full_name, city, state, country, gst_number')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found for user' }, { status: 404 })
    }

    const adminClient = getAdminClient()

    // Fetch the invoice to verify ownership
    const { data: invoice, error: invoiceErr } = await adminClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (invoiceErr || !invoice) {
      console.error('[Invoice Download API] Invoice query error or unauthorized:', invoiceErr)
      return NextResponse.json({ error: 'Invoice not found or unauthorized' }, { status: 404 })
    }

    const pdfPath = `${invoice.id}.pdf`
    let pdfBuffer: Buffer

    try {
      // 1. Try to download the PDF from storage
      const { data: fileData, error: downloadErr } = await adminClient.storage
        .from('invoices')
        .download(pdfPath)

      if (downloadErr || !fileData) {
        throw new Error('Not found in storage')
      }

      pdfBuffer = Buffer.from(await fileData.arrayBuffer())
      console.log(`[Invoice Download API] Loaded PDF from storage for invoice: ${invoice.invoice_number}`)
    } catch (err) {
      // 2. Generate on-the-fly if not found
      console.log(`[Invoice Download API] PDF not found in storage. Generating on the fly for: ${invoice.invoice_number}`)
      
      const subtotalPaisa = invoice.subscription_amount || 0
      const taxPaisa = invoice.tax_amount || 0
      const finalTotalPaisa = invoice.total_amount || 0
      const invoiceLines = invoice.line_items || []

      pdfBuffer = generateInvoicePdf({
        invoiceNumber: invoice.invoice_number,
        date: new Date(invoice.created_at).toLocaleDateString('en-IN'),
        customerName: profile.full_name || user.email!,
        customerEmail: user.email!,
        customerAddress: `${profile.city || ''}, ${profile.state || ''}, ${profile.country || 'IN'}`.replace(/^,\s*/, '').replace(/,\s*,$/, ''),
        customerGstin: profile.gst_number || 'N/A',
        subtotal: (subtotalPaisa / 100).toFixed(2),
        tax: (taxPaisa / 100).toFixed(2),
        total: (finalTotalPaisa / 100).toFixed(2),
        paymentMethod: invoice.payment_method || 'Razorpay',
        transactionId: invoice.payment_id || 'N/A',
        placeOfSupply: profile.state || 'IN',
        amountInWords: 'Rupees ' + (finalTotalPaisa / 100).toLocaleString('en-IN') + ' Only',
        items: invoiceLines.map((line: any) => {
          const qty = line.quantity || 1
          const rateVal = line.rate !== undefined ? line.rate : (line.amount || 0)
          const amtVal = line.amount || 0
          return {
            quantity: qty,
            description: line.item || 'Service Activation',
            rate: (rateVal / 100).toFixed(2),
            amount: (amtVal / 100).toFixed(2)
          }
        })
      })

      // Try uploading to cache for future requests
      try {
        await adminClient.storage
          .from('invoices')
          .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })
        
        // Also update DB with the signed URL or a direct mark
        const { data: signedData } = await adminClient.storage
          .from('invoices')
          .createSignedUrl(pdfPath, 7776000)

        if (signedData?.signedUrl) {
          await adminClient
            .from('invoices')
            .update({ pdf_url: signedData.signedUrl })
            .eq('id', invoice.id)
        }
      } catch (uploadErr: any) {
        console.error('[Invoice Download API] Failed to cache generated PDF in storage:', uploadErr.message)
      }
    }

    // Return PDF stream directly to trigger browser download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[Invoice Download API] Fatal error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
