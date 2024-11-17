// commands/wallet.js

const connectToDatabase = require('../db');
const Wallet = require('../models/Wallet');

module.exports = {
  command: 'wallet',
  description: 'Create or retrieve your wallet',
  execute: async (ctx) => {
    const userId = ctx.from.id;

    try {
      await connectToDatabase();

      // Check if the user already has a wallet
      let wallet = await Wallet.findOne({ userId });

      if (wallet) {
        await ctx.reply(`🔑 Your wallet address: ${wallet.walletAddress}`);
        console.log(`[${new Date().toISOString()}] ✅ Retrieved existing wallet for user ${userId}`);
      } else {
        // Generate a new wallet address (for demonstration, using a placeholder)
        // In a real scenario, integrate with a wallet generation service or library
        const newWalletAddress = `wallet_${userId}_${Date.now()}`;

        // Create and save the new wallet
        wallet = new Wallet({
          userId,
          walletAddress: newWalletAddress,
        });

        await wallet.save();

        await ctx.reply(`🎉 Wallet created successfully!\n🔑 Your wallet address: ${wallet.walletAddress}`);
        console.log(`[${new Date().toISOString()}] 🆕 Created new wallet for user ${userId}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error handling /wallet command for user ${userId}:`, error);
      await ctx.reply('⚠️ An error occurred while processing your wallet request.');
    }
  },
};
