// commands/start.js

module.exports = {
  command: 'start',
  description: 'Start command',
  execute: async (ctx) => {
    try {
      console.log(`[${new Date().toISOString()}] 🟢 Executing /start command for user ${ctx.from.id}`);
      await ctx.reply('👋 Welcome to the Phoenix Bot! Use `/start` to initiate.');
      console.log(`[${new Date().toISOString()}] ✅ /start command executed successfully.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error executing /start command:`, error);
      await ctx.reply('⚠️ An error occurred while processing your request.');
    }
  }
};
