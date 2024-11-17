// models/Wallet.js

const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true,
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
