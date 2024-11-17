// commands/wallet.js

const connectToDatabase = require('../db');
const Wallet = require('../models/Wallet');
const { Keypair } = require('@solana/web3.js');

module.exports = {
  command: 'wallet',
  description: 'Create or retrieve your Solana wallet',
  execute: async (ctx) => {
    const userId = ctx.from.id;

    try {
      await connectToDatabase();

      // Check if the user already has a wallet
      let wallet = await Wallet.findOne({ telegramId: userId });

      if (wallet) {
        await ctx.reply(`🔑 Your wallet address: ${wallet.walletPublicKey}`);
        console.log(`[${new Date().toISOString()}] ✅ Retrieved existing wallet for user ${userId}`);
      } else {
        // Generate a new Solana keypair
        const keypair = Keypair.generate();
        const publicKey = keypair.publicKey.toBase58();
        const privateKey = Buffer.from(keypair.secretKey).toString('hex');

        // Create and save the new wallet
        wallet = new Wallet({
          telegramId: userId,
          walletPublicKey: publicKey,
          walletPrivateKey: privateKey,
        });

        await wallet.save();

        await ctx.reply(`🎉 Wallet created successfully!\n🔑 Your wallet address: ${publicKey}`);
        console.log(`[${new Date().toISOString()}] 🆕 Created new wallet for user ${userId}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error handling /wallet command for user ${userId}:`, error);
      await ctx.reply('⚠️ An error occurred while processing your wallet request.');
    }
  },
};
