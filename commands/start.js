// commands/start.js
const User = require('../models/user');

module.exports = (bot) => {
  bot.start(async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const referralCode = args[0];
    const telegramId = ctx.from.id;

    try {
      let user = await User.findOne({ telegramId });

      if (!user) {
        // New user
        user = new User({ telegramId });
      }

      // If referralCode is provided and user doesn't already have 'referredBy' set
      if (referralCode && !user.referredBy) {
        const referrerId = parseInt(referralCode);
        if (referrerId && referrerId !== telegramId) {
          const referrer = await User.findOne({ telegramId: referrerId });
          if (referrer) {
            user.referredBy = referrerId;
            // Notify the referrer
            await bot.telegram.sendMessage(
              referrerId,
              `🎉 You have a new referral! User ID: ${telegramId} has joined using your referral link.`
            );
          }
        }
      }

      await user.save();

      // Send welcome message
      if (user.walletPublicKey) {
        await ctx.reply('Welcome back to Phoenix! 🔥\n\nUse /wallet to manage your Solana wallet.');
      } else {
        await ctx.reply('Welcome to Phoenix! 🔥\n\nUse /wallet to create your Solana wallet.');
      }
    } catch (error) {
      console.error('Error in /start command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
