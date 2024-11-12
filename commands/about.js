// commands/about.js
module.exports = (bot) => {
  bot.command('about', async (ctx) => {
    const aboutMessage = `🔥 *Phoenix Bot* 🔥

Phoenix Bot allows you to create and manage your Solana wallets directly within Telegram. Invite friends using your referral link and earn a 50% commission on their transaction fees when they perform paid actions!

Join our community: [t.me/phoenixbotsol](https://t.me/phoenixbotsol)`;
    await ctx.replyWithMarkdown(aboutMessage);
  });
};
