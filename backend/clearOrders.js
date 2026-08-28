const mongoose = require('mongoose');
const Order = require('./models/Order');
const Table = require('./models/Table');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant', {}).then(async () => {
  await Order.deleteMany({ status: { $ne: 'served' } }); // Clear orders for easy testing
  await Table.updateMany({}, { status: 'available', currentOrder: null });
  console.log("Cleared old testing orders and reset tables!");
  mongoose.connection.close();
});
