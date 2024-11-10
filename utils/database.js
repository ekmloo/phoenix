// utils/database.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[-] MONGODB_URI is not defined in environment variables.');
  throw new Error('MONGODB_URI is not defined');
}

// Suppress Mongoose Deprecation Warning
mongoose.set('strictQuery', true);

// Connect to Database
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[+] MongoDB Connected');
  } catch (error) {
    console.error('[-] MongoDB Connection Error:', error);
    // Do not exit the process in serverless environments
    throw error;
  }
};

module.exports = connectDB;
