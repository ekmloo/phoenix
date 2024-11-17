// commands/start.js

module.exports = {
  command: 'start',
  description: 'Start command',
  execute: async (ctx) => {
    try {
      await ctx.reply('👋 Welcome to the Phoenix Bot!');
    } catch (error) {
      console.error('Error executing /start command:', error);
    }
  },
};
