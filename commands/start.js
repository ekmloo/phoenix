// commands/start.js

module.exports = {
  command: 'start',
  description: 'Start command',
  execute: async (ctx) => {
    try {
      const welcomeMessage = `
👋 Welcome to the Phoenix Bot!

Use the following commands to interact:

/start - Show this message
/wallet - Create or retrieve your Solana wallet
      `;
      await ctx.reply(welcomeMessage);
      console.log(`[${new Date().toISOString()}] ✅ /start command executed successfully.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error executing /start command:`, error);
      await ctx.reply('⚠️ An error occurred while processing your request.');
    }
  },
};
