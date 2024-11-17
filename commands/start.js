// commands/start.js

module.exports = {
  command: 'start',
  description: 'Start command',
  execute: async (ctx) => {
    try {
      console.log(`Received /start command from user ${ctx.from.id}`);
      await ctx.reply('👋 Welcome to the Phoenix Bot! Use `/start` to initiate.');
    } catch (error) {
      console.error('Error handling /start command:', error);
      await ctx.reply('⚠️ An error occurred while processing your request.');
    }
  }
};
