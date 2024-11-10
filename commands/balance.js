// commands/balance.js
module.exports = (bot) => {
  bot.command('balance', async (ctx) => {
    console.log('Balance command invoked');
    try {
      await ctx.reply('✅ Bot is responding to /balance command.');
    } catch (error) {
      console.error('Error in /balance command:', error);
    }
  });
};
