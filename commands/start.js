module.exports = {
  command: 'start',
  description: 'Start command',
  execute: async (ctx) => {
    try {
      await ctx.reply('Welcome!');
    } catch (error) {
      console.error('Error in /start command:', error);
    }
  },
};
