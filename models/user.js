// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  walletPublicKey: { type: String },
  walletPrivateKey: { type: String },
  customWalletPublicKey: { type: String },
  customWalletPrivateKey: { type: String },
  referredBy: { type: Number },
});

module.exports = mongoose.model('User', userSchema);
