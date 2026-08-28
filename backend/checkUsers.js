const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

async function check() {
  await require('dotenv').config();
  await connectDB();
  const users = await User.find();
  console.log("Users:", users.map(u => ({ email: u.email, role: u.role, _id: u._id })));
  process.exit();
}
check();
