const { generateInvoicePdf } = require('./lib/pdf');
const fs = require('fs');

try {
  const buf = generateInvoicePdf({
    invoiceNumber: '12345',
    date: '8/7/2026',
    customerName: 'raghav',
    customerEmail: 'raghav@example.com',
    customerAddress: 'Kanpur, UP',
    customerGstin: 'GST12345',
    subtotal: '7899.00',
    tax: '1421.82',
    total: '9320.82',
    paymentMethod: 'Razorpay',
    transactionId: 'pay_12345',
    placeOfSupply: 'UP',
    amountInWords: 'Rupees Nine Thousand Three Hundred Twenty Only',
    items: [
      { quantity: 1, description: 'Starter Voice Agent Bundle', rate: '7899.00', amount: '7899.00' }
    ]
  });

  fs.writeFileSync('test_invoice.pdf', buf);
  console.log('Successfully wrote test_invoice.pdf, size:', buf.length);
} catch (e) {
  console.error('Error generating PDF:', e);
}
