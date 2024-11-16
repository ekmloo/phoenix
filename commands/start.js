// commands/start.js
const User = require('../models/user');

module.exports = (bot) => {
  bot.start(async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const referralCode = args[0];
    const telegramId = ctx.from.id;

    console.log(`User ${telegramId} started the bot with referral code: ${referralCode}`);

    try {
      let user = await User.findOne({ telegramId });

      if (!user) {
        if (referralCode) {
          const referrerId = parseInt(referralCode);
          if (referrerId && referrerId !== telegramId) {
            const referrer = await User.findOne({ telegramId: referrerId });
            console.log(`Referrer found: ${referrer}`);

            if (referrer) {
              user = new User({ telegramId, referredBy: referrerId });
              await user.save();
              console.log(`New user created with referral: ${JSON.stringify(user, null, 2)}`);
              await ctx.reply('Welcome to Phoenix! 🔥\n\nUse /wallet to create your Solana wallet.');

              // Notify the referrer
              await bot.telegram.sendMessage(
                referrerId,
                `🎉 You have a new referral! User ID: ${telegramId} has joined using your referral link.`
              );
              return;
            }
          }
        }

        // No referral or invalid referral
        user = new User({ telegramId });
        await user.save();
        console.log(`New user created without referral: ${JSON.stringify(user, null, 2)}`);
        await ctx.reply('Welcome to Phoenix! 🔥\n\nUse /wallet to create your Solana wallet.');
      } else {
        console.log(`Existing user started the bot: ${JSON.stringify(user, null, 2)}`);
        await ctx.reply('Welcome back to Phoenix! 🔥\n\nUse /wallet to manage your Solana wallet.');
      }
    } catch (error) {
      console.error('Error in /start command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
