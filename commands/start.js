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
        // If started without referral code
        if (!referralCode) {
          user = new User({ telegramId });
          await user.save();
          await ctx.reply('Welcome to Phoenix! 🔥\n\nUse /wallet to create your Solana wallet.');
          return;
        }

        // If started with referral code
        const referrer = await User.findOne({ telegramId: parseInt(referralCode) });
        if (referrer && referrer.telegramId !== telegramId) {
          user = new User({ telegramId, referredBy: referrer.telegramId });
          await user.save();
          await ctx.reply('Welcome to Phoenix! 🔥\n\nUse /wallet to create your Solana wallet.');
          // Optionally, notify the referrer
          await bot.telegram.sendMessage(referrer.telegramId, `🎉 You have a new referral! User ID: ${telegramId} has joined using your referral link.`);
          return;
        }

        // Invalid referral code
        user = new User({ telegramId });
        await user.save();
        await ctx.reply('Welcome to Phoenix! 🔥\n\nUse /wallet to create your Solana wallet.');
      } else {
        await ctx.reply('Welcome back to Phoenix! 🔥\n\nUse /wallet to manage your Solana wallet.');
      }
    } catch (error) {
      console.error('Error in /start command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
