// commands/start.js
const User = require('../models/user');

module.exports = (bot) => {
  bot.start(async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const referralCode = args[0]; // Expected to be the referrer's telegramId

    if (referralCode) {
      // Check if referrer exists and is not the user themselves
      const referrer = await User.findOne({ telegramId: parseInt(referralCode) });
      if (referrer && referrer.telegramId !== ctx.from.id) {
        // Inform the user to use /wallet with referral code
        await ctx.reply(
          `Welcome to Phoenix! 🔥\n\nUse /wallet ${referralCode} to create your Solana wallet and ensure your referrer receives a bonus when you perform paid actions!`
        );
        return;
      }
    }

    await ctx.reply(
      'Welcome to Phoenix! 🔥\n\nUse /wallet to create or view your Solana wallet.'
    );
  });
};
