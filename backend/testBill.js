require('dotenv').config();
const fs = require('fs');
const { generateBillPDF } = require('./utils/pdfHelper');
const { sendBillEmail } = require('./utils/emailHelper');

const testOrder = {
  _id: 'TEST-ORDER-123',
  table: { number: '5' },
  createdAt: new Date().toISOString(),
  customerName: 'Test User',
  customerPhone: '9876543210',
  customerEmail: process.env.GMAIL_USER || 'test@example.com', // use sender email to test receiving
  items: [
    { name: 'Paneer Butter Masala', quantity: 2, price: 250 },
    { name: 'Garlic Naan', quantity: 4, price: 40 },
    { name: 'Sweet Lassi', quantity: 2, price: 60 }
  ],
  totalAmount: 780,
  paymentStatus: 'paid'
};

async function test() {
  console.log('Generating PDF...');
  try {
    const pdfBuffer = await generateBillPDF(testOrder);
    
    // Write it to disk just so we can see it exists
    fs.writeFileSync('./test-bill.pdf', pdfBuffer);
    console.log('PDF saved to test-bill.pdf (size:', pdfBuffer.length, 'bytes)');
    
    if (process.env.GMAIL_USER) {
      console.log('Sending email to:', testOrder.customerEmail);
      await sendBillEmail(testOrder, pdfBuffer);
      console.log('Test completed successfully. Check your email!');
    } else {
      console.log('No GMAIL_USER set in .env. Skipping email sending test.');
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
