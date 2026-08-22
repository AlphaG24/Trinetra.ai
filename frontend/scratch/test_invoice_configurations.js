const { generateInvoicePdf } = require('../lib/pdf');
const fs = require('fs');
const path = require('path');

// Mock data generator
function makeInvoiceData(itemCount) {
  const items = [];
  for (let i = 1; i <= itemCount; i++) {
    items.push({
      quantity: 1,
      description: `Autonomous Voice Agent License #${i}`,
      rate: '7899.00',
      amount: '7899.00'
    });
  }

  const subtotalVal = (7899.00 * itemCount).toFixed(2);
  const totalVal = (7899.00 * itemCount).toFixed(2);

  return {
    invoiceNumber: '1786085864485',
    date: new Date().toLocaleDateString('en-IN'),
    customerName: 'Raghav Sharma',
    customerEmail: 'raghav@example.com',
    customerAddress: 'Kanpur, Uttar Pradesh, India',
    customerGstin: '09AAACT1234A1Z1',
    subtotal: subtotalVal,
    tax: '0.00',
    total: totalVal,
    paymentMethod: 'Razorpay',
    transactionId: 'pay_P123456789',
    placeOfSupply: 'Uttar Pradesh',
    amountInWords: `Rupees ${totalVal} Only`,
    items: items
  };
}

function run() {
  const counts = [1, 3, 6];
  
  counts.forEach(count => {
    try {
      console.log(`Generating PDF for ${count} row(s)...`);
      const data = makeInvoiceData(count);
      const pdfBuffer = generateInvoicePdf(data);
      
      const outputPath = path.join(__dirname, `invoice_${count}_rows.pdf`);
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(`PDF saved successfully to: ${outputPath}`);
    } catch (err) {
      console.error(`Error generating PDF for ${count} row(s):`, err);
    }
  });
}

run();
