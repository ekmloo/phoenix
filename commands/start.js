module.exports = {
  command: 'start',
  description: 'Start the Phoenix Bot',
  execute: async (ctx) => {
    await ctx.reply(
      `👋 Welcome to the Phoenix Bot!

Use the following commands to interact:

/start - Show this message
/wallet - Create or show your Solana wallet
/send - Send SOL to another wallet
/balance - Check your wallet balance`
    );
    console.log(`[${new Date().toISOString()}] 📥 /start command executed by user ${ctx.from.id}`);
  },
};
