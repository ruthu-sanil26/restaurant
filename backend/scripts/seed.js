/**
 * Optional seed script. Run: node scripts/seed.js
 * Requires: MONGODB_URI and JWT_SECRET in .env (or set below for local dev)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: 'admin@restaurant.com' });
  if (existing) {
    console.log('Admin user already exists. Exiting.');
    process.exit(0);
  }

  const admin = await User.create({
    idNumber: '101',
    email: 'admin@restaurant.com',
    password: 'admin123',
    role: 'admin',
  });
  console.log('Created admin:', admin.email);

  const categories = await Category.insertMany([
    { name: 'Starters', description: 'Appetizers', sortOrder: 0 },
    { name: 'Mains', description: 'Main courses', sortOrder: 1 },
    { name: 'Desserts', description: 'Sweet treats', sortOrder: 2 },
    { name: 'Drinks', description: 'Beverages', sortOrder: 3 },
  ]);
  console.log('Created categories:', categories.length);

  await MenuItem.insertMany([
    { name: 'Soup of the Day', description: 'Chef\'s daily soup', price: 6.99, category: categories[0]._id, available: true },
    { name: 'Caesar Salad', description: 'Romaine, parmesan, croutons', price: 8.99, category: categories[0]._id, available: true },
    { name: 'Grilled Salmon', description: 'With vegetables and rice', price: 18.99, category: categories[1]._id, available: true },
    { name: 'Beef Burger', description: 'Angus beef, fries', price: 14.99, category: categories[1]._id, available: true },
    { name: 'Chocolate Cake', description: 'Rich chocolate slice', price: 7.99, category: categories[2]._id, available: true },
    { name: 'Iced Coffee', description: 'Cold brew', price: 4.99, category: categories[3]._id, available: true },
  ]);
  console.log('Created menu items');

  await Table.insertMany([
    { number: 1, capacity: 2, status: 'available' },
    { number: 2, capacity: 4, status: 'available' },
    { number: 3, capacity: 4, status: 'available' },
    { number: 4, capacity: 6, status: 'available' },
  ]);
  console.log('Created tables');

  console.log('Seed done. Login with admin@restaurant.com / admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
