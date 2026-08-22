"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
const jspdf_1 = require("jspdf");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function generateInvoicePdf(invoiceData) {
    const { invoiceNumber, date, customerName, customerEmail = '', customerAddress = '', customerGstin = 'N/A', subtotal, tax, total, paymentMethod, transactionId = '', placeOfSupply = 'IN', amountInWords = '', items } = invoiceData;
    const publicDir = path_1.default.join(process.cwd(), 'public');
    const logoBuffer = fs_1.default.readFileSync(path_1.default.join(publicDir, 'logo-transparent.png'));
    const signatureBuffer = fs_1.default.readFileSync(path_1.default.join(publicDir, 'signature.png'));
    const watermarkBuffer = fs_1.default.readFileSync(path_1.default.join(publicDir, 'trident.png'));
    const doc = new jspdf_1.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    // 1. Draw Watermark (Large Trident logo in background)
    doc.addImage(watermarkBuffer, 'PNG', 45, 80, 120, 120, undefined, 'FAST');
    // 2. Draw Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(139, 92, 246); // var(--violet-accent): #8B5CF6 -> RGB: 139, 92, 246
    doc.text('Invoice', 15, 25);
    // Invoice Number under brand title
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55); // var(--headings): #1F2937 -> RGB: 31, 41, 55
    doc.text(`TRN-${invoiceNumber}`, 15, 31);
    // Logo on the top right
    doc.addImage(logoBuffer, 'PNG', 165, 15, 30, 20);
    // Company Name & Address under the logo
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text('TRINETRAEDU-AI', 195, 42, { align: 'right' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99); // var(--body): #4B5563 -> RGB: 75, 85, 99
    doc.text('India , Uttar Pradesh\nKanpur Nagar , 208022\nPhone no. : +91 9580619562\nEmail : support@trinetraedu-ai.com', 195, 47, { align: 'right' });
    // Horizontal divider line
    doc.setDrawColor(229, 231, 235); // var(--border): #E5E7EB -> RGB: 229, 231, 235
    doc.setLineWidth(0.5);
    doc.line(15, 68, 195, 68);
    // 3. Issued To (Left) & Invoice Details (Right)
    // "Issued to" Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Issued to:', 15, 75);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text([
        customerName,
        customerAddress,
        `GSTIN: ${customerGstin}`,
        customerEmail
    ], 15, 80);
    // "Invoice Details" Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Invoice Details:', 125, 75);
    doc.setFont('Helvetica', 'normal');
    doc.text([
        `Invoice Date:   ${date}`,
        `Due Date:        ${date}`,
        `Place of Supply: ${placeOfSupply}`
    ], 125, 80);
    // Horizontal divider line
    doc.line(15, 102, 195, 102);
    // 4. Line Items Table
    // Header: QTY, DESCRIPTION, PRICE, TOTAL
    doc.setFillColor(139, 92, 246);
    doc.rect(15, 107, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('QTY', 22, 112, { align: 'center' });
    doc.text('DESCRIPTION', 35, 112);
    doc.text('PRICE', 150, 112, { align: 'right' });
    doc.text('TOTAL', 190, 112, { align: 'right' });
    // Draw Items
    let currentY = 115;
    const rowHeight = 10;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    items.forEach(item => {
        // Row background
        doc.setFillColor(250, 250, 250); // var(--row-bg)
        doc.rect(15, currentY, 180, rowHeight, 'F');
        // Border line under row
        doc.setDrawColor(229, 231, 235);
        doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
        // Render columns
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.text(String(item.quantity), 22, currentY + 6, { align: 'center' });
        // Render description
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(item.description, 35, currentY + 4);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('Autonomous Voice Agent License Activation', 35, currentY + 8);
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text(`Rs ${item.rate}`, 150, currentY + 6, { align: 'right' });
        doc.text(`Rs ${item.amount}`, 190, currentY + 6, { align: 'right' });
        currentY += rowHeight;
    });
    // 5. Payment Info (Left) & Totals (Right)
    const dynamicSpacing = Math.max(10, 80 - items.length * 15);
    let totalsY = currentY + dynamicSpacing;
    // Left Column: Payment Info
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(139, 92, 246);
    doc.text('PAYMENT INFORMATION', 15, totalsY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    const statusStr = String(paymentMethod).toLowerCase() === 'razorpay' ? 'PAID' : 'PAID';
    doc.text([
        `Payment Gateway:   Razorpay`,
        `Method:                   ${paymentMethod}`,
        `Status:                   ${statusStr}`,
        `Transaction ID:       ${transactionId}`
    ], 15, totalsY + 6);
    // Right Column: Totals
    const subtotalNum = parseFloat(subtotal);
    const cgst = (subtotalNum * 0.09).toFixed(2);
    const sgst = (subtotalNum * 0.09).toFixed(2);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text('Subtotal', 140, totalsY);
    doc.text(`Rs ${subtotal}`, 190, totalsY, { align: 'right' });
    doc.text('CGST (9%)', 140, totalsY + 5);
    doc.text(`Rs ${cgst}`, 190, totalsY + 5, { align: 'right' });
    doc.text('SGST (9%)', 140, totalsY + 10);
    doc.text(`Rs ${sgst}`, 190, totalsY + 10, { align: 'right' });
    // Total Due row
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.8);
    doc.line(135, totalsY + 14, 195, totalsY + 14);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(139, 92, 246);
    doc.text('TOTAL DUE', 140, totalsY + 19);
    doc.text(`Rs ${total}`, 190, totalsY + 19, { align: 'right' });
    // 6. Amount in Words
    let wordsY = totalsY + 28;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, wordsY, 180, 10, 'F');
    doc.setFillColor(245, 158, 11); // Gold bar
    doc.rect(15, wordsY, 1.5, 10, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text('Amount in words: ', 20, wordsY + 6.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(amountInWords, 50, wordsY + 6.5);
    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(15, wordsY + 16, 195, wordsY + 16);
    // 7. Thank You / Signature Block
    let footerY = wordsY + 24;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(139, 92, 246);
    doc.text('Thank you!', 15, footerY + 10);
    // Signature image right above line
    doc.addImage(signatureBuffer, 'PNG', 150, footerY - 14, 35, 18);
    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.5);
    doc.line(145, footerY + 8, 195, footerY + 8);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Authorized Signatory — TRINETRAEDU-AI', 170, footerY + 12, { align: 'center' });
    // 8. Footer
    doc.line(15, 275, 195, 275);
    doc.text('India , Uttar Pradesh , Kanpur || Contact no. : +91 9452045499', 105, 281, { align: 'center' });
    doc.text('billing@trinetraedu-ai.com', 105, 285, { align: 'center' });
    return Buffer.from(doc.output('arraybuffer'));
}
