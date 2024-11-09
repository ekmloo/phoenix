// commands/referral.js
module.exports = (bot) => {
  bot.command('referral', async (ctx) => {
    const telegramId = ctx.from.id;
    const referralLink = `https://t.me/phoenixlaunchbot?start=${telegramId}`;
    await ctx.replyWithMarkdown(`🔗 *Your referral link:*\n[Click here](${referralLink})`);
  });
};
