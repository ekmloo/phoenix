// commands/about.js
module.exports = (bot) => {
  bot.command('about', async (ctx) => {
    await ctx.replyWithMarkdown(
      `🔥 *Phoenix Bot* 🔥\n\nPhoenix Bot allows you to create and manage your Solana wallets directly within Telegram. Invite friends using your referral link and earn a 50% commission on their transaction fees when they perform paid actions!\n\nJoin our community: [t.me/phoenixbotsol](https://t.me/phoenixbotsol)`
    );
  });
};
