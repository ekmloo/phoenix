// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, unique: true },
  walletPrivateKey: { type: String }, // Encrypted private key
  referredBy: { type: Number }, // Telegram ID of referrer
  referrals: { type: Number, default: 0 }, // Number of referrals
  last4: { type: String }, // Last 4 characters of public key
});

module.exports = mongoose.model('User', userSchema);
