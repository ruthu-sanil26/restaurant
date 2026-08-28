require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Category = require('./models/Category');

const dburi = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant';

mongoose.connect(dburi, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    let mainCat = await Category.findOne({ name: /Main/i });
    if (!mainCat) {
      mainCat = await Category.findOne(); // Grab whatever exists
    }
    
    if (mainCat) {
      const res = await MenuItem.updateMany(
        { name: { $in: ['BBQ Chicken', 'Baked Chicken', 'Cheese Pizza'] } },
        { $set: { category: mainCat._id } }
      );
      console.log('Fixed categories! Modified', res.modifiedCount, 'documents.');
    } else {
        // If absolutely no categories exist, we make one
        const newCat = await Category.create({ name: 'Mains', description: 'Main course meals' });
        const res = await MenuItem.updateMany(
          { name: { $in: ['BBQ Chicken', 'Baked Chicken', 'Cheese Pizza'] } },
          { $set: { category: newCat._id } }
        );
        console.log('Created Main category and fixed linkages!', res.modifiedCount);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
