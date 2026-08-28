const mongoose = require('mongoose');
const Order = require('./models/Order');
const Table = require('./models/Table');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant', {}).then(async () => {
  const tables = await Table.find();
  console.log("Tables:", tables.map(t => ({ id: t._id, num: t.number, name: t.name })));
  const orders = await Order.find({ paymentStatus: 'pending' }).populate('items.menuItem');
  console.log("Pending Orders:");
  orders.forEach(o => {
    console.log(`Order ID: ${o._id}, Table: ${o.table}, Items: ${o.items.map(i => i.name || (i.menuItem && i.menuItem.name)).join(', ')}`);
  });
  mongoose.connection.close();
});
