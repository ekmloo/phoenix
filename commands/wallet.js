// commands/wallet.js
const User = require('../models/user');
const { encrypt } = require('../utils/crypto');
const { createWallet } = require('../utils/solana');

module.exports = (bot) => {
  bot.command('wallet', async (ctx) => {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);
    const referralCode = args[0]; // Assume referral code is the referrer's telegramId

    try {
      // Check if user already has a wallet
      let user = await User.findOne({ telegramId });

      if (user && user.walletPublicKey) {
        // User exists, return their public key
        await ctx.replyWithMarkdown(
          `✅ *Your Solana wallet address:*\n\`${user.walletPublicKey}\``
        );
        return;
      }

      // If user exists but doesn't have a wallet yet, update referredBy if not set
      if (user && !user.walletPublicKey) {
        if (referralCode) {
          const referrer = await User.findOne({ telegramId: parseInt(referralCode) });
          if (referrer && referrer.telegramId !== telegramId) {
            user.referredBy = referrer.telegramId;
          }
        }
      } else if (!user) {
        // Create a new user
        user = new User({
          telegramId,
        });

        if (referralCode) {
          const referrer = await User.findOne({ telegramId: parseInt(referralCode) });
          if (referrer && referrer.telegramId !== telegramId) {
            user.referredBy = referrer.telegramId;
          }
        }
      }

      // Create a new Solana wallet
      const { publicKey, privateKey } = createWallet();

      // Encrypt the private key
      const encryptedPrivateKey = encrypt(JSON.stringify(privateKey));

      // Update user with wallet info
      user.walletPublicKey = publicKey;
      user.walletPrivateKey = encryptedPrivateKey;

      await user.save();

      // Send public key to the user
      await ctx.replyWithMarkdown(
        `🪙 *Your new Solana wallet has been created!*\n\n*Public Key:* \`${publicKey}\``
      );
    } catch (error) {
      console.error('Error in /wallet command:', error);
      await ctx.reply('❌ An error occurred while processing your request. Please try again later.');
    }
  });
};
