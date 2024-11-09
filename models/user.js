// models/user.js
const mongoose = require('mongoose');

const bumpbotSchema = new mongoose.Schema({
  contractAddress: { type: String, required: true },
  amountSOL: { type: Number, required: true },
  active: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, unique: true },
  walletPrivateKey: { type: String }, // Encrypted private key
  referredBy: { type: Number }, // Telegram ID of referrer
  referrals: { type: Number, default: 0 }, // Number of referrals
  customWalletPublicKey: { type: String }, // Custom wallet public key
  customWalletPrivateKey: { type: String }, // Encrypted custom wallet private key
  bumpbots: [bumpbotSchema], // Array of bumpbots
});

module.exports = mongoose.model('User', userSchema);
