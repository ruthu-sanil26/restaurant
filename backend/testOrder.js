const mongoose = require('mongoose');
const Order = require('./models/Order');
const Table = require('./models/Table');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User');
const connectDB = require('./config/db');

async function testCreateOrder() {
  try {
    await require('dotenv').config();
    await connectDB();

    console.log("Connected to DB");

    const table = await Table.findOne();
    if (!table) {
        console.log("No table found");
        process.exit(1);
    }

    const menuItem = await MenuItem.findOne();
    if (!menuItem) {
        console.log("No menu item found");
        process.exit(1);
    }

    const user = await User.findOne({role: 'admin'});

    const reqData = {
      table: table._id.toString(),
      items: [ { menuItem: menuItem._id.toString(), quantity: 1 } ],
      paymentStatus: 'pending',
      paymentMethod: 'pending'
    };

    console.log("Mocking request with data:", reqData);

    const { createOrder } = require('./controllers/orderController');

    const req = {
        body: reqData,
        user: user
    };

    const res = {
        status: function(code) {
            console.log("STATUS:", code);
            return this;
        },
        json: function(data) {
            console.log("JSON:", JSON.stringify(data, null, 2));
            return this;
        }
    };

    await createOrder(req, res);
    console.log("Done checking");
    process.exit(0);

  } catch (err) {
    console.error("Uncaught exception:", err);
    process.exit(1);
  }
}

testCreateOrder();
