// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  walletPublicKey: { type: String },
  walletPrivateKey: { type: String },
});

module.exports = mongoose.model('User', userSchema);
