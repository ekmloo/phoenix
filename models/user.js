// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, required: true, unique: true },
  walletPrivateKey: { type: String, required: true }, // Encrypted private key stored as string
});

module.exports = mongoose.model('User', userSchema);
