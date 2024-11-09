// commands/customWallet.js
const { PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const User = require('../models/user');
const { encrypt, decrypt } = require('../utils/crypto');
const { createWallet } = require('../utils/solana');
const { connection, botKeypair } = require('../utils/globals');

module.exports = (bot) => {
  bot.command('customwallet', async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      // Check if user has a main wallet
      let user = await User.findOne({ telegramId });

      if (!user || !user.walletPublicKey) {
        return ctx.reply('❌ You need to create a main wallet first using /wallet.');
      }

      // Set session variable to await the last 4 digits
      if (!ctx.session) ctx.session = {};
      ctx.session.awaitingLast4Digits = true;

      // Prompt user for the last 4 digits of their desired custom wallet
      await ctx.reply('🛠️ Please enter the last 4 digits of your desired custom wallet:');
    } catch (error) {
      console.error('Error in /customwallet command:', error);
      await ctx.reply('❌ An error occurred while initiating your custom wallet creation. Please try again later.');
    }
  });

  // Handler to process the last 4 digits input
  bot.on('text', async (ctx) => {
    if (ctx.session && ctx.session.awaitingLast4Digits) {
      const telegramId = ctx.from.id;
      const input = ctx.message.text.trim();

      // Rest of the code remains the same...
    }
  });
};
