// models/User.js

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
  },
  walletPublicKey: {
    type: String,
    default: null, // Initially null until wallet is created
  },
  walletPrivateKey: {
    type: Buffer, // Store as binary data
    default: null, // Initially null until wallet is created
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
