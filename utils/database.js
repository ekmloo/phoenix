// utils/database.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[-] MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[+] MongoDB Connected');
  } catch (error) {
    console.error('[-] MongoDB Connection Error:', error);
    process.exit(1);
  }
};

export default connectDB;
