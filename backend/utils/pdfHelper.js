const PDFDocument = require('pdfkit');

/**
 * Generates a PDF bill for a given order.
 * @param {Object} order - The populated order object.
 * @returns {Promise<Buffer>} - A promise that resolves to the PDF buffer.
 */
const generateBillPDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('Royal Rasoi', { align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(10)
        .text('Udupi, Karnataka', { align: 'center' })
        .text('Ph: +91 98765 43210', { align: 'center' })
        .moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

      // Bill Details
      const tableNumber = order.table && order.table.number ? order.table.number : 'N/A';
      const orderDate = new Date(order.createdAt || Date.now()).toLocaleString();
      
      doc.font('Helvetica-Bold').fontSize(12).text('Bill Details');
      doc.font('Helvetica').fontSize(10);
      doc.text(`Order ID: ${order._id}`);
      doc.text(`Date: ${orderDate}`);
      doc.text(`Table: ${tableNumber}`);
      if (order.customerName) {
        doc.text(`Customer: ${order.customerName}`);
      }
      if (order.customerPhone) {
        doc.text(`Phone: ${order.customerPhone}`);
      }
      doc.moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

      // Table Header
      doc.font('Helvetica-Bold').fontSize(10);
      const startY = doc.y;
      doc.text('Item', 50, startY);
      doc.text('Qty', 350, startY, { width: 50, align: 'right' });
      doc.text('Price', 400, startY, { width: 50, align: 'right' });
      doc.text('Total', 450, startY, { width: 100, align: 'right' });
      doc.moveDown();

      // Items
      doc.font('Helvetica').fontSize(10);
      order.items.forEach(item => {
        const itemY = doc.y;
        doc.text(item.name, 50, itemY, { width: 290 });
        doc.text(item.quantity.toString(), 350, itemY, { width: 50, align: 'right' });
        doc.text(`Rs. ${item.price.toFixed(2)}`, 400, itemY, { width: 50, align: 'right' });
        doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, 450, itemY, { width: 100, align: 'right' });
        
        let customizationText = '';
        if (item.customization && Object.keys(item.customization).length > 0) {
          const custArr = Object.entries(item.customization)
            .filter(([_, v]) => v && (!Array.isArray(v) || v.length > 0))
            .map(([k, v]) => Array.isArray(v) ? `${k}: ${v.join('|')}` : `${k}: ${v}`);
          if (custArr.length > 0) {
            customizationText = `[${custArr.join(', ')}]`;
            doc.fontSize(8).fillColor('gray').text(customizationText, 60, doc.y, { width: 280 });
            doc.fontSize(10).fillColor('black'); // reset
          }
        }
      });
      doc.moveDown();
      
      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

      // Totals
      const subtotal = order.totalAmount || 0;
      const gst = subtotal * 0.05;
      const grandTotal = subtotal + gst;

      doc.font('Helvetica').text('Subtotal:', 350, doc.y, { width: 100, align: 'right' });
      doc.text(`Rs. ${subtotal.toFixed(2)}`, 450, doc.y - 12, { width: 100, align: 'right' });
      
      doc.text('GST (5%):', 350, doc.y, { width: 100, align: 'right' });
      doc.text(`Rs. ${gst.toFixed(2)}`, 450, doc.y - 12, { width: 100, align: 'right' });
      doc.moveDown();

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Grand Total:', 350, doc.y, { width: 100, align: 'right' });
      doc.text(`Rs. ${grandTotal.toFixed(2)}`, 450, doc.y - 14, { width: 100, align: 'right' });
      doc.moveDown(2);

      // Footer
      if (order.paymentStatus === 'paid') {
        doc.fillColor('green').text('PAID', { align: 'center' }).fillColor('black');
        doc.moveDown();
      }

      doc.font('Helvetica').fontSize(10).text('Thank You! Visit Again', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateBillPDF };
