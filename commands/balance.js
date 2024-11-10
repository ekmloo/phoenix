// commands/balance.js
const { PublicKey } = require('@solana/web3.js');
const { connection } = require('../utils/globals');
const User = require('../models/user');
const { decrypt } = require('../utils/crypto');

module.exports = (bot) => {
  bot.command('balance', async (ctx) => {
    const telegramId = ctx.from.id;
    console.log(`[+] /balance command received from Telegram ID: ${telegramId}`);

    try {
      const user = await User.findOne({ telegramId });
      console.log(`[+] User found: ${user ? user.telegramId : 'No user found'}`);

      if (!user || !user.walletPublicKey) {
        console.log('[-] Wallet not found for user.');
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      const userWallet = new PublicKey(user.walletPublicKey);
      console.log(`[+] Fetching balance for wallet: ${user.walletPublicKey}`);

      const balanceLamports = await connection.getBalance(userWallet);
      const balanceSOL = balanceLamports / 1e9;
      console.log(`[+] Balance fetched: ${balanceSOL} SOL`);

      await ctx.replyWithMarkdown(`💰 *Your wallet balance is:* ${balanceSOL} SOL`);
    } catch (error) {
      console.error('[-] Error in /balance command:', error);
      await ctx.reply('❌ An error occurred while fetching your balance. Please try again later.');
    }
  });
};
