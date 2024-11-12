// commands/referral.js
const User = require('../models/user');

module.exports = (bot) => {
  bot.command('referral', async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      const user = await User.findOne({ telegramId });

      if (!user) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      const referralLink = `https://t.me/phoenixlaunchbot?start=${telegramId}`;
      await ctx.replyWithMarkdown(`🔗 *Your Referral Link:*\n${referralLink}`);
    } catch (error) {
      console.error('Error in /referral command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
