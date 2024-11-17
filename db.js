const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected;

const connectToDatabase = async () => {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return Promise.resolve();
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

module.exports = connectToDatabase;
