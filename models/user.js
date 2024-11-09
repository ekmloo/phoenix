// models/user.js
const mongoose = require('mongoose');

const bumpbotSchema = new mongoose.Schema({
  contractAddress: { type: String, required: true },
  amountSOL: { type: Number, required: true },
  active: { type: Boolean, default: true },
});

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  walletPublicKey: { type: String },
  walletPrivateKey: { type: String },
  customWalletPublicKey: { type: String },
  customWalletPrivateKey: { type: String },
  referredBy: { type: Number },
  bumpbots: [bumpbotSchema],
});

module.exports = mongoose.model('User', userSchema);
