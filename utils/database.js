// utils/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // Options can be added here
    });
    console.log('[+] Connected to MongoDB');
  } catch (error) {
    console.error('[-] MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
