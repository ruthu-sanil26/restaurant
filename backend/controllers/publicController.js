const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const OtpCode = require('../models/OtpCode');
const { emitOrderUpdate, emitNewOrder } = require('../config/socket');
const DodoPayments = require('dodopayments');
const os = require('os');

/**
 * Get the machine's LAN IP address dynamically so phone callbacks work on local WiFi.
 */
const getServerBaseUrl = () => {
  if (process.env.SERVER_URL) return process.env.SERVER_URL.replace(/\/$/, '');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return `http://${net.address}:${process.env.PORT || 5000}`;
      }
    }
  }
  return `http://localhost:${process.env.PORT || 5000}`;
};

exports.getMenu = async (req, res) => {
  try {
    const categories = await Category.find().sort('sortOrder name').lean();
    const items = await MenuItem.find({ available: true })
      .populate('category', 'name')
      .sort('name')
      .lean();
    const byCategory = categories.map((c) => ({
      ...c,
      items: items.filter(
        (i) => i.category && i.category._id.toString() === c._id.toString()
      ),
    }));
    res.json(byCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTable = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id).select('number capacity status currentOrder');
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('table', 'number capacity')
      .populate('items.menuItem', 'name price');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all unpaid orders for a table and return a merged bill
exports.getTableOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      table: req.params.tableId,
      paymentStatus: { $ne: 'paid' },
      status: { $ne: 'cancelled' },
    })
      .populate('table', 'number capacity')
      .populate('items.menuItem', 'name price')
      .sort('createdAt');

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'No active orders found for this table' });
    }

    // Merge all orders into one bill
    const firstOrder = orders[0];
    const allItems = orders.flatMap(o => o.items);
    const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderIds = orders.map(o => o._id);

    res.json({
      _id: firstOrder._id,          // primary order ID (used for payment)
      orderIds,                      // all order IDs for reference
      table: firstOrder.table,
      customerName: firstOrder.customerName,
      customerPhone: firstOrder.customerPhone,
      createdAt: firstOrder.createdAt,
      items: allItems,
      totalAmount,
      paymentStatus: firstOrder.paymentStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { table: tableId, items: rawItems, notes, customerName, customerPhone, customerEmail, otpCode } = req.body;

    // Verify OTP if email is provided
    if (customerEmail) {
      if (!otpCode) {
        return res.status(400).json({ message: 'OTP verification code is required.' });
      }
      const record = await OtpCode.findOne({ email: customerEmail.toLowerCase(), code: otpCode });
      if (!record) {
        return res.status(400).json({ message: 'Invalid or expired OTP code.' });
      }
      // OTP verified successfully, clean up
      await OtpCode.deleteOne({ _id: record._id });
    }

    const table = await Table.findById(tableId);
    if (!table) return res.status(404).json({ message: 'Table not found' });

    const orderItems = [];
    for (const { menuItem: id, quantity, notes: itemNotes, customization } of rawItems) {
      const menuItem = await MenuItem.findById(id);
      if (!menuItem || !menuItem.available) {
        return res.status(400).json({
          message: `Item ${menuItem?.name || id} is not available`,
        });
      }
      let finalPrice = menuItem.price || 0;

      if (customization && Object.keys(customization).length > 0 && menuItem.customizationOptions) {
        menuItem.customizationOptions.forEach(opt => {
          const selected = customization[opt.label];
          if (selected) {
            if (Array.isArray(selected)) {
              selected.forEach(s => {
                const choice = opt.choices?.find(c => c.name === s);
                if (choice?.extraPrice) finalPrice += Number(choice.extraPrice);
              });
            } else {
              const choice = opt.choices?.find(c => c.name === selected);
              if (choice?.extraPrice) finalPrice += Number(choice.extraPrice);
            }
          }
        });
      }

      orderItems.push({
        menuItem: id,
        name: menuItem.name,
        price: finalPrice,
        quantity: quantity || 1,
        notes: itemNotes || '',
        customization: customization || {},
      });
    }

    // Check if an unpaid active order already exists for this table
    let order = await Order.findOne({
      table: tableId,
      paymentStatus: { $ne: 'paid' },
      status: { $ne: 'cancelled' }
    });

    if (order) {
      // Append or update items in existing active order
      for (const newItem of orderItems) {
        const existingItem = order.items.find(i =>
          i.menuItem.toString() === newItem.menuItem.toString() &&
          JSON.stringify(i.customization || {}) === JSON.stringify(newItem.customization || {})
        );
        if (existingItem) {
          existingItem.quantity += newItem.quantity;
        } else {
          order.items.push(newItem);
        }
      }
      if (notes) {
        order.notes = order.notes ? `${order.notes} | ${notes}` : notes;
      }
      if (customerName) order.customerName = customerName;
      if (customerPhone) order.customerPhone = customerPhone;
      if (customerEmail) order.customerEmail = customerEmail;

      order.status = 'pending'; // Reset status to pending so kitchen notices new items
      await order.save();
    } else {
      order = await Order.create({
        table: tableId,
        items: orderItems,
        notes: notes || '',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
        servedBy: null,
        orderType: 'ai',
      });
    }

    await Table.findByIdAndUpdate(tableId, {
      status: 'occupied',
      currentOrder: order._id,
    });


    const populated = await Order.findById(order._id)
      .populate('table', 'number capacity status')
      .populate('items.menuItem', 'name price');
    const plain = populated.toObject();
    
    emitOrderUpdate(order._id.toString(), plain);
    emitNewOrder(plain); // 🔔 Notify admin bell
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }
    
    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedEmail = email.toLowerCase().trim();

    // Save/update temporary record in Mongo (expires in 5 mins)
    await OtpCode.findOneAndDelete({ email: formattedEmail });
    await OtpCode.create({ email: formattedEmail, code });

    console.log(`\n======================================\n[OTP] Code ${code} for ${formattedEmail}\n======================================\n`);

    // Send OTP asynchronously using emailHelper
    const { sendOTPEmail } = require('../utils/emailHelper');
    sendOTPEmail(formattedEmail, code);

    res.json({ message: 'OTP sent successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.updatePayment = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    if (!['cash', 'online'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'paymentMethod must be cash or online' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.paymentMethod = paymentMethod;
    order.paymentStatus = 'paid';
    await order.save();

    // Free table and mark all unpaid orders for the table as paid on successful payment
    if (order.table) {
      await Order.updateMany(
        { table: order.table, paymentStatus: { $ne: 'paid' }, status: { $ne: 'cancelled' } },
        { paymentMethod, paymentStatus: 'paid' }
      );
      await Table.findByIdAndUpdate(order.table, {
        status: 'available',
        currentOrder: null,
      });
    }

    const populated = await Order.findById(order._id)
      .populate('table', 'number capacity')
      .populate('items.menuItem', 'name price');

    const plain = populated.toObject();
    emitOrderUpdate(order._id.toString(), plain);

    // Send SMS receipt if customer phone exists
    if (populated.customerPhone) {
      const { sendSMSBill } = require('../utils/smsHelper');
      sendSMSBill(populated);
    }

    // Generate and send Bill PDF via email if customer email exists
    if (populated.customerEmail) {
      const { generateBillPDF } = require('../utils/pdfHelper');
      const { sendBillEmail } = require('../utils/emailHelper');
      try {
        const pdfBuffer = await generateBillPDF(populated);
        await sendBillEmail(populated, pdfBuffer);
      } catch (pdfErr) {
        console.error('Failed to generate or send PDF bill:', pdfErr);
      }
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getETA = async (req, res) => {
  try {
    const { items = [] } = req.body; // current cart items

    // 1. Base overhead time
    let totalWaitTimeMins = 5;

    // 2. Add time for current kitchen backlog
    // Find orders that are currently waiting in the kitchen pipeline
    const pendingOrders = await Order.find({
      status: { $in: ['pending', 'confirmed', 'preparing'] },
    });

    // We assume an average of 3 minutes per item currently in the pipeline
    let backlogItemCount = 0;
    pendingOrders.forEach((order) => {
      order.items.forEach((item) => {
        backlogItemCount += item.quantity || 1;
      });
    });

    totalWaitTimeMins += Math.floor(backlogItemCount * 3);

    // 3. Add time for the user's specific cart complexity
    // We assume 2 minutes per item they are about to order
    let cartItemCount = 0;
    items.forEach((item) => {
      cartItemCount += item.quantity || 1;
    });

    totalWaitTimeMins += Math.floor(cartItemCount * 2);

    res.json({ eta: totalWaitTimeMins });
  } catch (error) {
    console.error('ETA calc error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createDodoCheckout = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order already paid' });

    const { returnUrl } = req.body;
    // Use the real LAN IP so phone-based payment callbacks work
    const serverBase = getServerBaseUrl();
    // Frontend base is either SERVER_FRONTEND_URL env or derived from server base (port 3000)
    const frontendBase = process.env.SERVER_FRONTEND_URL || serverBase.replace(`:${process.env.PORT || 5000}`, ':3000');
    const defaultRedirect = `${frontendBase}/bill`;
    const backendSuccessUrl = `${serverBase}/api/public/orders/${order._id}/dodo-success?redirect=${encodeURIComponent(returnUrl || defaultRedirect)}`;
    console.log(`[Dodo] Success callback URL: ${backendSuccessUrl}`);
    console.log(`[Dodo] Frontend redirect URL: ${returnUrl || defaultRedirect}`);

    if (!process.env.DODO_PAYMENTS_API_KEY || !process.env.DODO_PAYMENTS_PRODUCT_ID) {
      return res.status(400).json({
        message: 'Dodo Payments is not fully configured. Please add DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_PRODUCT_ID to backend/.env file.'
      });
    }

    try {
      const dodoClient = new DodoPayments({
        bearerToken: process.env.DODO_PAYMENTS_API_KEY,
        environment: 'test_mode'
      });

      const gst = order.totalAmount * 0.05;
      const grandTotal = order.totalAmount + gst;
      const grandTotalInCents = Math.round(grandTotal * 100);

      const session = await dodoClient.checkoutSessions.create({
        product_cart: [
          {
            product_id: process.env.DODO_PAYMENTS_PRODUCT_ID,
            quantity: 1,
            amount: grandTotalInCents
          }
        ],
        return_url: backendSuccessUrl,
      });
      return res.json({ checkout_url: session.checkout_url });
    } catch (dodoErr) {
      console.error('Dodo Payments API error:', dodoErr.message);
      return res.status(400).json({ message: 'Dodo Payments error: ' + dodoErr.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.dodoSuccess = async (req, res) => {
  try {
    const orderId = req.params.id;
    const redirectUrl = req.query.redirect || 'http://localhost:3000/bill';
    const paymentId = req.query.payment_id;

    let billingName = '';
    let billingPhone = '';
    let billingEmail = '';

    if (paymentId && process.env.DODO_PAYMENTS_API_KEY) {
      try {
        const dodoClient = new DodoPayments({
          bearerToken: process.env.DODO_PAYMENTS_API_KEY,
          environment: 'test_mode',
        });
        const payment = await dodoClient.payments.retrieve(paymentId);
        if (payment && payment.customer) {
          if (payment.customer.name) billingName = payment.customer.name;
          if (payment.customer.phone_number) billingPhone = payment.customer.phone_number;
          if (payment.customer.email_address) billingEmail = payment.customer.email_address;
          else if (payment.customer.email) billingEmail = payment.customer.email;
        }
      } catch (dodoErr) {
        console.error('Failed to retrieve billing info from Dodo Payments:', dodoErr.message);
      }
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send('Order not found');

    order.paymentMethod = 'online';
    order.paymentStatus = 'paid';
    if (billingName) order.customerName = billingName;
    if (billingEmail) order.customerEmail = billingEmail;
    if (billingPhone) {
      // Normalize phone: strip +91 prefix so it stores as clean 10-digit number
      const cleanPhone = billingPhone.startsWith('+91') ? billingPhone.slice(3) : billingPhone.replace(/^\+/, '');
      order.customerPhone = cleanPhone;
    }
    await order.save();

    // Free table and mark all unpaid orders for the table as paid on successful payment
    const updateFields = { paymentMethod: 'online', paymentStatus: 'paid' };
    if (billingName) updateFields.customerName = billingName;
    if (billingEmail) updateFields.customerEmail = billingEmail;
    if (billingPhone) updateFields.customerPhone = billingPhone;

    if (order.table) {
      await Order.updateMany(
        { table: order.table, paymentStatus: { $ne: 'paid' }, status: { $ne: 'cancelled' } },
        updateFields
      );
      await Table.findByIdAndUpdate(order.table, {
        status: 'available',
        currentOrder: null,
      });
    }

    const populated = await Order.findById(order._id)
      .populate('table', 'number capacity')
      .populate('items.menuItem', 'name price');

    const plain = populated.toObject();
    emitOrderUpdate(order._id.toString(), plain);

    // Send SMS receipt if customer phone exists
    if (populated.customerPhone) {
      const { sendSMSBill } = require('../utils/smsHelper');
      sendSMSBill(populated);
    }

    // Generate and send Bill PDF via email if customer email exists
    if (populated.customerEmail) {
      const { generateBillPDF } = require('../utils/pdfHelper');
      const { sendBillEmail } = require('../utils/emailHelper');
      try {
        const pdfBuffer = await generateBillPDF(populated);
        await sendBillEmail(populated, pdfBuffer);
      } catch (pdfErr) {
        console.error('Failed to generate or send PDF bill:', pdfErr);
      }
    }

    res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (rating && Number(rating) >= 1 && Number(rating) <= 5) {
      order.rating = Number(rating);
    }
    if (feedback) {
      order.feedback = order.feedback ? `${order.feedback} | ${feedback}` : feedback;
    }
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('table', 'number capacity')
      .populate('items.menuItem', 'name price');

    emitOrderUpdate(order._id.toString(), populated.toObject());
    res.json({ message: 'Feedback submitted successfully!', order: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderNotes = async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes || !notes.trim()) {
      return res.status(400).json({ message: 'Instruction notes are required.' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (['served', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot add notes to an order that is already served or cancelled.' });
    }

    order.notes = order.notes ? `${order.notes} | ${notes.trim()}` : notes.trim();
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('table', 'number capacity status')
      .populate('items.menuItem', 'name price');

    const plain = populated.toObject();
    emitOrderUpdate(order._id.toString(), plain);

    res.json({ message: 'Special cooking instructions added successfully!', order: plain });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


