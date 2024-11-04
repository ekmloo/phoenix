// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, required: true, unique: true },
  walletPrivateKey: { type: [Number], required: true }, // Stored as an array of numbers
  connectedPhantom: { type: String } // Optional: Store Phantom wallet address if connected
});

module.exports = mongoose.model('User', userSchema);
