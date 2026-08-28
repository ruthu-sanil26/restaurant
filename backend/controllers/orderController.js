const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const { emitOrderUpdate, emitNewOrder } = require('../config/socket');

/**
 * Helper to auto-merge separate active unpaid orders for the same table session into 1 single order.
 */
const mergeActiveUnpaidOrders = async () => {
  try {
    const unpaidOrders = await Order.find({
      paymentStatus: { $ne: 'paid' },
      status: { $ne: 'cancelled' }
    }).sort('createdAt');

    const tableOrdersMap = {};
    for (const order of unpaidOrders) {
      const tId = order.table ? order.table.toString() : null;
      if (!tId) continue;
      if (!tableOrdersMap[tId]) {
        tableOrdersMap[tId] = [order];
      } else {
        tableOrdersMap[tId].push(order);
      }
    }

    for (const [tId, ordersList] of Object.entries(tableOrdersMap)) {
      if (ordersList.length > 1) {
        const mainOrder = ordersList[0];
        for (let i = 1; i < ordersList.length; i++) {
          const secondaryOrder = ordersList[i];
          for (const secItem of secondaryOrder.items) {
            const match = mainOrder.items.find(mi =>
              mi.menuItem.toString() === secItem.menuItem.toString() &&
              JSON.stringify(mi.customization || {}) === JSON.stringify(secItem.customization || {})
            );
            if (match) {
              match.quantity += secItem.quantity;
            } else {
              mainOrder.items.push(secItem);
            }
          }
          if (secondaryOrder.notes) {
            mainOrder.notes = mainOrder.notes ? `${mainOrder.notes} | ${secondaryOrder.notes}` : secondaryOrder.notes;
          }
          if (secondaryOrder.customerName && !mainOrder.customerName) mainOrder.customerName = secondaryOrder.customerName;
          if (secondaryOrder.customerPhone && !mainOrder.customerPhone) mainOrder.customerPhone = secondaryOrder.customerPhone;

          await Order.findByIdAndDelete(secondaryOrder._id);
        }
        mainOrder.status = 'pending';
        await mainOrder.save();
        await Table.findByIdAndUpdate(tId, { status: 'occupied', currentOrder: mainOrder._id });
      }
    }
  } catch (err) {
    console.error('Merge active unpaid orders error:', err.message);
  }
};

/* ---------------- GET ALL ORDERS ---------------- */
exports.getOrders = async (req, res) => {
  try {
    // Auto-merge duplicate unpaid orders for the same table session
    await mergeActiveUnpaidOrders();

    const { status, table } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (table) filter.table = table;

    const orders = await Order.find(filter)
      .populate('table', 'number capacity status')
      .populate('items.menuItem', 'name price')
      .sort('-createdAt');

    res.json(orders);
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET SINGLE ORDER ---------------- */
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('table', 'number capacity status')
      .populate('items.menuItem', 'name price description');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.json(order);
  } catch (error) {
    console.error("GET ORDER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- CREATE ORDER (FIXED) ---------------- */
exports.createOrder = async (req, res) => {
  try {
    const { tableId, items, notes, paymentMethod, customerName, customerPhone } = req.body;

    if (!tableId || !items || items.length === 0) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // ✅ VALIDATE TABLE
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(400).json({ message: "Invalid table ID" });
    }

    const orderItems = [];

    for (const item of items) {
      let menuItem;

      // ✅ SUPPORT BOTH ID & NAME (SMART FIX)
      if (item.menuItem) {
        menuItem = await MenuItem.findById(item.menuItem);
      } else if (item.name) {
        menuItem = await MenuItem.findOne({
          name: new RegExp(`^${item.name}$`, 'i')
        });
      }

      if (!menuItem) {
        return res.status(400).json({
          message: `Menu item not found`
        });
      }

      if (!menuItem.available) {
        return res.status(400).json({
          message: `${menuItem.name} is not available`
        });
      }

      let finalPrice = menuItem.price || 0;

      if (item.customization && Object.keys(item.customization).length > 0 && menuItem.customizationOptions) {
        menuItem.customizationOptions.forEach(opt => {
          const selected = item.customization[opt.label];
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
        menuItem: menuItem._id,
        name: menuItem.name,
        price: finalPrice,
        quantity: item.quantity || 1,
        notes: item.notes || '',
        customization: item.customization || {},
      });
    }

    // Check if an unpaid active order already exists for this table
    let order = await Order.findOne({
      table: tableId,
      paymentStatus: { $ne: 'paid' },
      status: { $ne: 'cancelled' }
    });

    if (order) {
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

      order.status = 'pending';
      await order.save();
    } else {
      order = await Order.create({
        table: tableId,
        items: orderItems,
        notes: notes || '',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        servedBy: req.user?.id,
        status: 'pending',
        paymentStatus: req.body.paymentStatus || 'pending',
        paymentMethod: paymentMethod || 'pending',
        orderType: 'manual',
      });
    }

    await Table.findByIdAndUpdate(tableId, {
      status: 'occupied',
      currentOrder: order._id,
    });

    const populated = await Order.findById(order._id)
      .populate('table', 'number capacity status')
      .populate('items.menuItem', 'name price');
    res.status(201).json(populated);

    // 🔔 Broadcast new order to all admin clients
    emitNewOrder(populated.toObject());

  } catch (error) {
    console.error("🔥 CREATE ORDER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- UPDATE STATUS ---------------- */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('table', 'number capacity status')
      .populate('items.menuItem', 'name price');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // ✅ FREE TABLE WHEN DONE
    if (status === 'cancelled') {
      await Table.findByIdAndUpdate(order.table._id, {
        status: 'available',
        currentOrder: null,
      });
    }

    emitOrderUpdate(order._id.toString(), order.toObject());

    res.json(order);

  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- UPDATE PAYMENT STATUS ---------------- */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    )
      .populate('table', 'number capacity status')
      .populate('items.menuItem', 'name price');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Free table and mark all unpaid orders for the table as paid on successful payment
    if (paymentStatus === 'paid' && order.table) {
      const tableId = order.table._id || order.table;
      await Order.updateMany(
        { table: tableId, paymentStatus: { $ne: 'paid' }, status: { $ne: 'cancelled' } },
        { paymentStatus: 'paid' }
      );
      await Table.findByIdAndUpdate(tableId, {
        status: 'available',
        currentOrder: null,
      });
    }

    emitOrderUpdate(order._id.toString(), order.toObject());

    // Send SMS receipt if customer phone exists
    if (paymentStatus === 'paid' && order.customerPhone) {
      const { sendSMSBill } = require('../utils/smsHelper');
      sendSMSBill(order);
    }

    res.json(order);

  } catch (error) {
    console.error("UPDATE PAYMENT STATUS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- CANCEL ORDER (AI-driven or UI) ---------------- */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('table', 'number capacity status')
      .populate('items.menuItem', 'name price');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Business Logic: Check Status Eligibility
    if (order.status === 'pending') {
      // Action: Proceed with cancellation automatically
      order.status = 'cancelled';
      await order.save();

      // Free the table
      if (order.table) {
        await Table.findByIdAndUpdate(order.table._id, {
          status: 'available',
          currentOrder: null,
        });
      }

      emitOrderUpdate(order._id.toString(), order.toObject());

      return res.status(200).json({
        success: true,
        message: 'Your order has been successfully canceled.',
        order
      });
    } else {
      // Action: Stop the cancellation if Preparing or Further along
      return res.status(400).json({
        success: false,
        message: "I'm sorry, but our kitchen has already started preparing your order, so it can no longer be canceled automatically. Please speak to a staff member for assistance."
      });
    }

  } catch (error) {
    console.error("CANCEL ORDER ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- DELETE ORDER ---------------- */
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.table) {
      await Table.findByIdAndUpdate(order.table, {
        status: 'available',
        currentOrder: null
      });
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({ message: 'Order deleted' });

  } catch (error) {
    console.error("DELETE ORDER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET ANALYTICS ---------------- */
exports.getAnalytics = async (req, res) => {
  try {
    const Reservation = require('../models/Reservation');

    // 1. Fetch all orders (excluding cancelled ones for sales/AOV, or including for counts)
    const orders = await Order.find({ status: { $ne: 'cancelled' } }).lean();

    // 2. Fetch all reservations
    const reservations = await Reservation.find().lean();

    // --- A. Daily Sales and AOV (Last 30 Days) ---
    const dailyDataMap = {};
    orders.forEach(order => {
      if (order.createdAt) {
        const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
        if (!dailyDataMap[dateStr]) {
          dailyDataMap[dateStr] = { sales: 0, count: 0 };
        }
        dailyDataMap[dateStr].sales += order.totalAmount || 0;
        dailyDataMap[dateStr].count += 1;
      }
    });

    const dailySales = Object.entries(dailyDataMap).map(([date, data]) => ({
      date,
      sales: Number(data.sales.toFixed(2)),
      count: data.count,
      aov: Number((data.sales / data.count).toFixed(2))
    })).sort((a, b) => a.date.localeCompare(b.date));

    // --- B. Hourly Sales ---
    const hourlySalesMap = Array(24).fill(0).reduce((acc, _, i) => {
      acc[i] = { hour: `${i}:00`, sales: 0, count: 0 };
      return acc;
    }, {});

    orders.forEach(order => {
      if (order.createdAt) {
        const hour = new Date(order.createdAt).getHours();
        if (hourlySalesMap[hour]) {
          hourlySalesMap[hour].sales += order.totalAmount || 0;
          hourlySalesMap[hour].count += 1;
        }
      }
    });

    const hourlySales = Object.values(hourlySalesMap).map(h => ({
      ...h,
      sales: Number(h.sales.toFixed(2)),
      aov: h.count > 0 ? Number((h.sales / h.count).toFixed(2)) : 0
    }));

    // --- C. AI Chatbot vs Manual Browsing ---
    let aiOrdersCount = 0;
    let manualOrdersCount = 0;
    let aiSales = 0;
    let manualSales = 0;

    orders.forEach(order => {
      if (order.orderType === 'ai') {
        aiOrdersCount += 1;
        aiSales += order.totalAmount || 0;
      } else {
        manualOrdersCount += 1;
        manualSales += order.totalAmount || 0;
      }
    });

    const orderSourceStats = {
      aiOrdersCount,
      manualOrdersCount,
      totalOrdersCount: aiOrdersCount + manualOrdersCount,
      aiSales: Number(aiSales.toFixed(2)),
      manualSales: Number(manualSales.toFixed(2)),
      aiAov: aiOrdersCount > 0 ? Number((aiSales / aiOrdersCount).toFixed(2)) : 0,
      manualAov: manualOrdersCount > 0 ? Number((manualSales / manualOrdersCount).toFixed(2)) : 0,
    };

    // --- D. Most Popular Reservation Times ---
    const reservationHoursMap = {};
    reservations.forEach(res => {
      if (res.time) {
        const hourStr = res.time.split(':')[0];
        const hourNum = parseInt(hourStr, 10);
        if (!isNaN(hourNum)) {
          const key = `${hourNum}:00`;
          reservationHoursMap[key] = (reservationHoursMap[key] || 0) + 1;
        }
      }
    });

    const popularReservationTimes = Object.entries(reservationHoursMap).map(([time, count]) => ({
      time,
      count
    })).sort((a, b) => {
      const hourA = parseInt(a.time, 10);
      const hourB = parseInt(b.time, 10);
      return hourA - hourB;
    });

    const reservationStatusStats = {
      pending: reservations.filter(r => r.status === 'pending').length,
      confirmed: reservations.filter(r => r.status === 'confirmed').length,
      completed: reservations.filter(r => r.status === 'completed').length,
      cancelled: reservations.filter(r => r.status === 'cancelled').length,
    };

    res.json({
      dailySales,
      hourlySales,
      orderSourceStats,
      popularReservationTimes,
      reservationStatusStats,
    });
  } catch (error) {
    console.error("GET ANALYTICS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};