// utils/database.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[+] MongoDB Connected');
  } catch (error) {
    console.error('[-] MongoDB Connection Error:', error);
  }
};

module.exports = connectDB;
