// commands/start.js
module.exports = (bot) => {
  bot.start(async (ctx) => {
    await ctx.reply('Welcome to Phoenix! 🔥\n\nUse /wallet to create or view your Solana wallet.');
  });
};
