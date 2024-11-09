// utils/database.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[-] MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

// Suppress Mongoose Deprecation Warning
mongoose.set('strictQuery', true);

// Connect to Database
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[+] MongoDB Connected');
  } catch (error) {
    console.error('[-] MongoDB Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
