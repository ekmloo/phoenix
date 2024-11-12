// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  walletPublicKey: { type: String },
  walletPrivateKey: { type: String },
  referredBy: { type: Number },
  referralEarnings: { type: Number, default: 0 }, // Total SOL earned from referrals
  token: {
    name: String,
    ticker: String,
    photoUrl: String,
    mintAddress: String,
  },
});

module.exports = mongoose.model('User', userSchema);
