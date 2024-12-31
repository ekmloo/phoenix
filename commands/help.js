module.exports = {
    command: 'help',
    description: 'Get help from the official group',
    execute: async (ctx) => {
      await ctx.reply(
        `🤖 *Phoenix Bot Help* 🤖\n\n` +
        `For assistance, join our support group: [Telegram Support](https://t.me/phoenixbotsol)`
      );
      console.log(`[${new Date().toISOString()}] 📥 /help command executed by user ${ctx.from.id}`);
    }
  };

