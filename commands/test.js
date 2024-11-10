// commands/test.js
module.exports = (bot) => {
  bot.command('test', async (ctx) => {
    console.log('Test command invoked');
    try {
      await ctx.reply('✅ Bot is able to send messages.');
    } catch (error) {
      console.error('Error in /test command:', error);
    }
  });
};
