// models/Wallet.js

const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
  },
  walletPublicKey: {
    type: String,
    required: true,
    unique: true,
  },
  walletPrivateKey: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
