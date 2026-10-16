import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

export interface InvoicePdfItem {
  quantity?: number
  description?: string
  sac?: string
  rate?: string | number
  taxableValue?: string | number
  amount?: string | number
  totalValue?: string | number
}

export interface InvoicePdfData {
  invoiceNumber: string
  date: string
  customerName: string
  customerEmail?: string
  customerAddress?: string
  customerGstin?: string
  subtotal: string | number
  tax?: string | number
  total: string | number
  cgst?: string | number
  sgst?: string | number
  igst?: string | number
  paymentMethod?: string
  transactionId?: string
  placeOfSupply?: string
  amountInWords?: string
  supplierName?: string
  supplierGstin?: string
  supplierAddress?: string
  supplierContact?: string
  sacCode?: string
  items?: InvoicePdfItem[]
}

// Module-level cache for embedded base64 fonts to optimize performance
let cachedRegularFontB64: string | null = null
let cachedBoldFontB64: string | null = null

function getBase64Fonts(): { regular: string | null; bold: string | null } {
  if (cachedRegularFontB64 && cachedBoldFontB64) {
    return { regular: cachedRegularFontB64, bold: cachedBoldFontB64 }
  }

  try {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts')
    const regularPath = path.join(fontsDir, 'Arial.ttf')
    const boldPath = path.join(fontsDir, 'Arial-Bold.ttf')

    if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
      cachedRegularFontB64 = fs.readFileSync(regularPath).toString('base64')
      cachedBoldFontB64 = fs.readFileSync(boldPath).toString('base64')
      return { regular: cachedRegularFontB64, bold: cachedBoldFontB64 }
    }
  } catch (err) {
    console.warn('[Invoice PDF] Error reading embedded fonts:', err)
  }

  return { regular: null, bold: null }
}

function formatInr(val: any): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDateStr(dateVal: any): string {
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return String(dateVal)
  }
}

export function generateInvoicePdf(invoiceData: InvoicePdfData): Buffer {
  const {
    invoiceNumber = 'VAK/26-27/00001',
    date = new Date().toISOString(),
    customerName = 'Valued Customer',
    customerEmail = '',
    customerAddress = 'IN',
    customerGstin = 'N/A',
    subtotal = '0.00',
    tax = '0.00',
    total = '0.00',
    cgst,
    sgst,
    igst,
    paymentMethod = 'Razorpay Gateway',
    transactionId = 'N/A',
    placeOfSupply = 'Delhi',
    supplierName = 'Vaakriti Technologies Private Limited',
    supplierGstin = '07AAAAA0000A1Z5',
    supplierAddress = 'India, Uttar Pradesh, Kanpur Nagar - 208022',
    supplierContact = 'Email: support@trinetraedu-ai.com | Phone: +91 9580619562',
    sacCode = '998311',
    items = []
  } = invoiceData

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // Load and embed Arial font for native ₹ symbol rendering
  const { regular, bold } = getBase64Fonts()
  let fontName = 'Helvetica'

  if (regular && bold) {
    try {
      doc.addFileToVFS('Arial-Regular.ttf', regular)
      doc.addFont('Arial-Regular.ttf', 'Arial', 'normal')
      doc.addFileToVFS('Arial-Bold.ttf', bold)
      doc.addFont('Arial-Bold.ttf', 'Arial', 'bold')
      doc.setFont('Arial')
      fontName = 'Arial'
    } catch (e) {
      console.warn('[Invoice PDF] Could not register Arial fonts, falling back to Helvetica', e)
      doc.setFont('Helvetica')
      fontName = 'Helvetica'
    }
  } else {
    doc.setFont('Helvetica')
  }

  // Page margins & dimensions
  const marginX = 15
  const pageWidth = 210
  const contentWidth = 180
  const rightX = marginX + contentWidth // 195mm

  // Ensure invoice number has statutory format
  const displayInvNumber = invoiceNumber.startsWith('VAK/') || invoiceNumber.startsWith('TRI-')
    ? invoiceNumber
    : `VAK/26-27/${invoiceNumber}`

  // Standardize payment method
  const displayPaymentMethod = paymentMethod.toLowerCase() === 'razorpay'
    ? 'Razorpay Gateway'
    : paymentMethod

  // 1. TOP HEADER SECTION
  // Left: Statutory Company Information
  doc.setFont(fontName, 'bold')
  doc.setFontSize(14.5)
  doc.setTextColor(17, 24, 39) // #111827
  doc.text(supplierName, marginX, 24)

  doc.setFont(fontName, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(107, 114, 128) // #6B7280
  doc.text(supplierAddress, marginX, 29.5)
  doc.text(supplierContact, marginX, 34.5)

  doc.text('GSTIN: ', marginX, 39.5)
  const gstinLabelWidth = doc.getTextWidth('GSTIN: ')
  doc.setFont(fontName, 'bold')
  doc.setTextColor(31, 41, 55) // #1F2937
  doc.text(supplierGstin, marginX + gstinLabelWidth, 39.5)

  // Right: Badge + Invoice Identifier Details
  // TAX INVOICE Pill Badge
  const badgeWidth = 27
  const badgeHeight = 5.5
  const badgeX = rightX - badgeWidth
  const badgeY = 19
  doc.setFillColor(243, 244, 246) // #F3F4F6
  doc.setDrawColor(229, 231, 235) // #E5E7EB
  doc.setLineWidth(0.2)
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.2, 1.2, 'FD')

  doc.setFont(fontName, 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(55, 65, 81) // #374151
  doc.text('TAX INVOICE', badgeX + badgeWidth / 2, badgeY + 3.8, { align: 'center' })

  // Invoice Number
  doc.setFont(fontName, 'bold')
  doc.setFontSize(13)
  doc.setTextColor(17, 24, 39) // #111827
  doc.text(displayInvNumber, rightX, 30, { align: 'right' })

  // Date
  doc.setFont(fontName, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(107, 114, 128)
  const formattedDate = formatDateStr(date)
  doc.text(`Date: ${formattedDate}`, rightX, 35.5, { align: 'right' })

  // Place of Supply
  doc.text(`Place of Supply: ${placeOfSupply}`, rightX, 40.5, { align: 'right' })

  // 2. HORIZONTAL DIVIDER
  doc.setDrawColor(229, 231, 235) // #E5E7EB
  doc.setLineWidth(0.3)
  doc.line(marginX, 46, rightX, 46)

  // 3. MIDDLE SECTION: BILLED TO & TRANSACTION DETAILS CARDS
  const cardY = 51
  const cardWidth = 87
  const cardHeight = 36
  const gap = 6
  const rightCardX = marginX + cardWidth + gap // 108mm

  // Left Card: BILLED TO
  doc.setFillColor(250, 249, 246) // #FAF9F6
  doc.setDrawColor(229, 231, 235) // #E5E7EB
  doc.setLineWidth(0.25)
  doc.roundedRect(marginX, cardY, cardWidth, cardHeight, 2.5, 2.5, 'FD')

  const padX = marginX + 4.5
  doc.setFont(fontName, 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(156, 163, 175) // #9CA3AF
  doc.text('BILLED TO', padX, cardY + 6.5)

  // Customer Name
  doc.setFont(fontName, 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(17, 24, 39) // #111827
  const safeCustName = customerName || 'Valued Customer'
  const truncatedName = doc.splitTextToSize(safeCustName, cardWidth - 9)[0] || safeCustName
  doc.text(truncatedName, padX, cardY + 12)

  // Customer Email
  doc.setFont(fontName, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(75, 85, 99) // #4B5563
  const safeCustEmail = customerEmail || ''
  const truncatedEmail = doc.splitTextToSize(safeCustEmail, cardWidth - 9)[0] || safeCustEmail
  doc.text(truncatedEmail, padX, cardY + 16.5)

  // Customer Address
  doc.setTextColor(107, 114, 128) // #6B7280
  const safeCustAddr = customerAddress && customerAddress !== 'N/A' ? customerAddress : 'IN'
  const truncatedAddr = doc.splitTextToSize(safeCustAddr, cardWidth - 9)[0] || safeCustAddr
  doc.text(truncatedAddr, padX, cardY + 21)

  // Optional GSTIN
  if (customerGstin && customerGstin !== 'N/A') {
    doc.text(`GSTIN: ${customerGstin}`, padX, cardY + 25.5)
  }

  // Status: PAID & SETTLED
  doc.setFont(fontName, 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text('Status: ', padX, cardY + 31)
  const statusLabelW = doc.getTextWidth('Status: ')
  doc.setFont(fontName, 'bold')
  doc.setTextColor(4, 120, 87) // #047857 Emerald
  doc.text('PAID & SETTLED', padX + statusLabelW, cardY + 31)

  // Right Card: TRANSACTION DETAILS
  doc.setFillColor(250, 249, 246) // #FAF9F6
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(rightCardX, cardY, cardWidth, cardHeight, 2.5, 2.5, 'FD')

  const rightPadX = rightCardX + 4.5
  const rightValX = rightCardX + cardWidth - 4.5

  doc.setFont(fontName, 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(156, 163, 175)
  doc.text('TRANSACTION DETAILS', rightPadX, cardY + 6.5)

  doc.setFont(fontName, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text('Payment Method:', rightPadX, cardY + 13)
  doc.setTextColor(31, 41, 55)
  doc.text(displayPaymentMethod, rightValX, cardY + 13, { align: 'right' })

  doc.setTextColor(107, 114, 128)
  doc.text('Gateway Ref ID:', rightPadX, cardY + 19)
  doc.setFont(fontName, 'bold')
  doc.setTextColor(31, 41, 55)
  doc.text(transactionId || 'N/A', rightValX, cardY + 19, { align: 'right' })

  doc.setFont(fontName, 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text('Currency:', rightPadX, cardY + 25)
  doc.setTextColor(31, 41, 55)
  doc.text('INR (₹)', rightValX, cardY + 25, { align: 'right' })

  doc.setTextColor(107, 114, 128)
  doc.text('SAC Code:', rightPadX, cardY + 31)
  doc.setFont(fontName, 'bold')
  doc.setTextColor(31, 41, 55)
  doc.text(sacCode, rightValX, cardY + 31, { align: 'right' })

  // 4. LINE ITEMS TABLE
  const tableStartY = 93
  const tableHeaderHeight = 8
  const rowHeight = 15
  const renderItems = items.length > 0 ? items : [
    {
      quantity: 1,
      description: 'Trinetra Platform Services',
      sac: sacCode,
      rate: subtotal,
      amount: total
    }
  ]
  const totalTableHeight = tableHeaderHeight + renderItems.length * rowHeight

  // Table Outer Box
  doc.setDrawColor(229, 231, 235) // #E5E7EB
  doc.setLineWidth(0.25)
  doc.roundedRect(marginX, tableStartY, contentWidth, totalTableHeight, 2, 2, 'S')

  // Header Background Fill
  doc.setFillColor(250, 249, 246) // #FAF9F6
  doc.rect(marginX, tableStartY, contentWidth, tableHeaderHeight, 'F')
  doc.line(marginX, tableStartY + tableHeaderHeight, rightX, tableStartY + tableHeaderHeight)

  // Header Text
  doc.setFont(fontName, 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(107, 114, 128)

  const colX = {
    num: marginX + 4.5,
    desc: marginX + 16,
    qty: marginX + 98,
    taxable: marginX + 138,
    total: rightX - 4.5
  }

  doc.text('#', colX.num, tableStartY + 5.5)
  doc.text('DESCRIPTION / SAC', colX.desc, tableStartY + 5.5)
  doc.text('QTY', colX.qty, tableStartY + 5.5, { align: 'center' })
  doc.text('TAXABLE VALUE', colX.taxable, tableStartY + 5.5, { align: 'right' })
  doc.text('TOTAL (INCL. GST)', colX.total, tableStartY + 5.5, { align: 'right' })

  // Render Table Rows
  let curY = tableStartY + tableHeaderHeight
  renderItems.forEach((item, idx) => {
    if (idx > 0) {
      doc.setDrawColor(243, 244, 246)
      doc.line(marginX, curY, rightX, curY)
    }

    // Line Index
    doc.setFont(fontName, 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(156, 163, 175)
    doc.text(String(idx + 1), colX.num, curY + 6.5)

    // Description (Line 1)
    doc.setFont(fontName, 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(17, 24, 39)
    const descText = item.description || 'Cloud Voice & Platform Services'
    const truncatedDesc = doc.splitTextToSize(descText, 78)[0] || descText
    doc.text(truncatedDesc, colX.desc, curY + 5.5)

    // SAC (Line 2)
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(156, 163, 175)
    doc.text(`SAC: ${item.sac || sacCode}`, colX.desc, curY + 10.5)

    // Qty
    doc.setFont(fontName, 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(55, 65, 81)
    doc.text(String(item.quantity || 1), colX.qty, curY + 7, { align: 'center' })

    // Taxable Value
    const rateVal = item.rate ?? item.taxableValue ?? subtotal
    doc.text(formatInr(rateVal), colX.taxable, curY + 7, { align: 'right' })

    // Total Value (Incl. GST)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(17, 24, 39)
    const totalVal = item.amount ?? item.totalValue ?? total
    doc.text(formatInr(totalVal), colX.total, curY + 7, { align: 'right' })

    curY += rowHeight
  })

  // 5. BOTTOM SECTION: VERIFIED BADGE & TOTALS
  const bottomY = curY + 8

  // Left: Paid & Verified Box
  const badgeBoxW = 72
  const badgeBoxH = 20
  doc.setFillColor(236, 253, 245) // #ECFDF5 emerald-50
  doc.setDrawColor(167, 243, 208) // #A7F3D0 emerald-200
  doc.setLineWidth(0.25)
  doc.roundedRect(marginX, bottomY, badgeBoxW, badgeBoxH, 2.5, 2.5, 'FD')

  // Green checkmark icon
  const checkCenterX = marginX + 6.5
  const checkCenterY = bottomY + 6.5
  doc.setDrawColor(5, 150, 105) // #059669
  doc.setLineWidth(0.4)
  doc.circle(checkCenterX, checkCenterY, 2.6, 'S')
  doc.line(checkCenterX - 1.2, checkCenterY, checkCenterX - 0.2, checkCenterY + 1.1)
  doc.line(checkCenterX - 0.2, checkCenterY + 1.1, checkCenterX + 1.4, checkCenterY - 1)

  // Title
  doc.setFont(fontName, 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(6, 95, 70) // #065F46
  doc.text('Paid & Verified', marginX + 11.5, bottomY + 7.5)

  // Subtext
  doc.setFont(fontName, 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(4, 120, 87) // #047857
  doc.text('Official GST computer-generated tax invoice', marginX + 4.5, bottomY + 14)

  // Right: Financial Totals Breakdown
  const totalsLeftX = 125
  let totalsRowY = bottomY + 3.5

  // Taxable Amount
  doc.setFont(fontName, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(75, 85, 99)
  doc.text('Taxable Amount:', totalsLeftX, totalsRowY)
  doc.setTextColor(17, 24, 39)
  doc.text(formatInr(subtotal), rightX, totalsRowY, { align: 'right' })

  // Taxes: CGST & SGST or IGST
  const taxNum = parseFloat(String(tax).replace(/[^0-9.-]+/g, '')) || 0
  const cgstVal = cgst !== undefined ? cgst : (taxNum / 2).toFixed(2)
  const sgstVal = sgst !== undefined ? sgst : (taxNum / 2).toFixed(2)

  if (igst !== undefined && parseFloat(String(igst).replace(/[^0-9.-]+/g, '')) > 0) {
    totalsRowY += 5
    doc.setTextColor(75, 85, 99)
    doc.text('IGST (18.0%):', totalsLeftX, totalsRowY)
    doc.setTextColor(17, 24, 39)
    doc.text(formatInr(igst), rightX, totalsRowY, { align: 'right' })
  } else {
    totalsRowY += 5
    doc.setTextColor(75, 85, 99)
    doc.text('CGST (9.0%):', totalsLeftX, totalsRowY)
    doc.setTextColor(17, 24, 39)
    doc.text(formatInr(cgstVal), rightX, totalsRowY, { align: 'right' })

    totalsRowY += 5
    doc.setTextColor(75, 85, 99)
    doc.text('SGST (9.0%):', totalsLeftX, totalsRowY)
    doc.setTextColor(17, 24, 39)
    doc.text(formatInr(sgstVal), rightX, totalsRowY, { align: 'right' })
  }

  // Divider
  totalsRowY += 3.5
  doc.setDrawColor(229, 231, 235)
  doc.line(totalsLeftX, totalsRowY, rightX, totalsRowY)

  // Total Amount Paid
  totalsRowY += 6
  doc.setFont(fontName, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text('Total Amount Paid:', totalsLeftX, totalsRowY)

  doc.setFont(fontName, 'bold')
  doc.setFontSize(13)
  doc.text(formatInr(total), rightX, totalsRowY + 0.5, { align: 'right' })

  // Bottom of page compliance text
  doc.setFont(fontName, 'normal')
  doc.setFontSize(7)
  doc.setTextColor(156, 163, 175)
  doc.text(
    'This is an authentic, computer-generated tax invoice issued by Vaakriti Technologies Private Limited under Rule 46 of CGST Rules, 2017.',
    pageWidth / 2,
    285,
    { align: 'center' }
  )

  return Buffer.from(doc.output('arraybuffer'))
}
