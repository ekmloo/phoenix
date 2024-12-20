const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String },
  walletPrivateKey: { type: String },
});

module.exports = mongoose.model('User', userSchema);
