const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, required: true },
  referrerId: { type: Number }, // Store the Telegram ID of the referrer
  paidVolume: { type: Number, default: 0 }, // Track the total paid action volume
  feesEarned: { type: Number, default: 0 } // Track the fees earned from referrals
});

module.exports = mongoose.model('User', userSchema);
