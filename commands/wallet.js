const connectToDatabase = require('../db');
const User = require('../models/User');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58'); // Import the bs58 package

module.exports = {
  command: 'wallet',
  description: 'Create or retrieve your Solana wallet',
  execute: async (ctx) => {
    const userId = ctx.from.id;

    try {
      await connectToDatabase();

      let user = await User.findOne({ telegramId: userId });

      if (!user) {
        // User doesn't exist, create a new user with wallet details
        const keypair = Keypair.generate();
        const publicKey = keypair.publicKey.toBase58();
        const privateKey = keypair.secretKey; // Uint8Array

        // Create new user without saving the private key
        user = new User({
          telegramId: userId,
          walletPublicKey: publicKey,
          referrerId: ctx.message.text.split(' ')[1] // Assuming the referrer ID is passed as a command argument
        });

        await user.save();

        // Convert private key to Base58 format
        const privateKeyBase58 = bs58.encode(privateKey); // Convert to Base58

        await ctx.reply(`🎉 Wallet created successfully! Your wallet address: ${publicKey}\nKeep your private key safe (Delete this message after copying): ${privateKeyBase58}`);
      } else {
        await ctx.reply(`🔑 Your wallet address: ${user.walletPublicKey}`);
      }
    } catch (error) {
      await ctx.reply('⚠️ An error occurred while processing your wallet request. Please try again later.');
    }
  }
};
