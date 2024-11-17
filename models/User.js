// models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, required: true },
  walletPrivateKey: { type: String, required: true }, // Should be String to store encrypted data
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
