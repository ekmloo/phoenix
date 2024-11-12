// commands/referral.js
const User = require('../models/user');

module.exports = (bot) => {
  bot.command('referral', async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      const user = await User.findOne({ telegramId });

      if (!user) {
        return ctx.reply('❌ You have not created a wallet yet. Use /wallet to get started.');
      }

      const referralCount = await User.countDocuments({ referredBy: telegramId });
      const totalEarnings = user.referralEarnings || 0;

      const referralMessage = `🔗 *Your Referral Stats:*

• *Referrals:* ${referralCount}
• *Total Earnings:* ${totalEarnings.toFixed(4)} SOL

Share your referral link: https://t.me/phoenixlaunchbot?start=${telegramId}`;
      await ctx.replyWithMarkdown(referralMessage);
    } catch (error) {
      console.error('Error in /referral command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
