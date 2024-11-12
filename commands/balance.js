// commands/balance.js
const { PublicKey } = require('@solana/web3.js');
const { connection } = require('../utils/globals');
const User = require('../models/user');

module.exports = (bot) => {
  bot.command('balance', async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      const user = await User.findOne({ telegramId });

      if (!user || !user.walletPublicKey) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      const userWallet = new PublicKey(user.walletPublicKey);
      const balanceLamports = await connection.getBalance(userWallet);
      const balanceSOL = balanceLamports / 1e9;

      await ctx.replyWithMarkdown(`💰 *Your wallet balance is:* ${balanceSOL} SOL`);
    } catch (error) {
      console.error('Error in /balance command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
