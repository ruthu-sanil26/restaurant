const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Automatic migration from name to idNumber
    const User = require('../models/User');
    try {
      const result = await User.updateMany(
        { name: { $exists: true }, idNumber: { $exists: false } },
        [
          { $set: { idNumber: "$name" } },
          { $unset: ["name"] }
        ]
      );
      if (result.modifiedCount > 0) {
        console.log(`Migrated ${result.modifiedCount} users to use idNumber instead of name.`);
      }
    } catch (migError) {
      console.error('User migration error:', migError.message);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
