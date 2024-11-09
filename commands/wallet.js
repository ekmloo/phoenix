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

      // Rest of the code remains the same...
    } catch (error) {
      console.error('Error in /wallet command:', error);
      await ctx.reply('❌ An error occurred while processing your request. Please try again later.');
    }
  });
};
