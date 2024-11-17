// commands/wallet.js

const connectToDatabase = require('../db');
const User = require('../models/User');
const { Keypair } = require('@solana/web3.js');
const { encrypt } = require('../encryption'); // Import encryption functions

module.exports = {
  command: 'wallet',
  description: 'Create or retrieve your Solana wallet',
  execute: async (ctx) => {
    const userId = ctx.from.id;

    try {
      console.log(`[${new Date().toISOString()}] 📊 Handling /wallet command for user ${userId}`);

      // Connect to MongoDB
      await connectToDatabase();
      console.log(`[${new Date().toISOString()}] 🔗 Connected to MongoDB`);

      // Find the user in the database
      let user = await User.findOne({ telegramId: userId });
      console.log(`[${new Date().toISOString()}] 🔍 Searched for user: ${user ? 'Found' : 'Not Found'}`);

      if (user) {
        if (user.walletPublicKey && user.walletPrivateKey) {
          // Wallet already exists
          await ctx.reply(`🔑 Your wallet address: ${user.walletPublicKey}`);
          console.log(`[${new Date().toISOString()}] ✅ Retrieved existing wallet for user ${userId}`);
        } else {
          // Wallet doesn't exist, create a new one
          const keypair = Keypair.generate();
          const publicKey = keypair.publicKey.toBase58();
          const privateKeyArray = Array.from(keypair.secretKey); // Convert Uint8Array to Array
          const privateKeyString = JSON.stringify(privateKeyArray); // Convert Array to JSON string
          const privateKeyEncrypted = encrypt(privateKeyString); // Encrypt the JSON string

          // Update the user's document with encrypted private key
          user.walletPublicKey = publicKey;
          user.walletPrivateKey = privateKeyEncrypted; // Store as string
          await user.save();

          await ctx.reply(`🎉 Wallet created successfully!\n🔑 Your wallet address: ${publicKey}`);
          console.log(`[${new Date().toISOString()}] 🆕 Created new wallet for user ${userId}`);
        }
      } else {
        // User doesn't exist, create a new user with wallet
        const keypair = Keypair.generate();
        const publicKey = keypair.publicKey.toBase58();
        const privateKeyArray = Array.from(keypair.secretKey); // Convert Uint8Array to Array
        const privateKeyString = JSON.stringify(privateKeyArray); // Convert Array to JSON string
        const privateKeyEncrypted = encrypt(privateKeyString); // Encrypt the JSON string

        // Create new user with wallet details
        user = new User({
          telegramId: userId,
          walletPublicKey: publicKey,
          walletPrivateKey: privateKeyEncrypted, // Store as string
        });

        await user.save();

        await ctx.reply(`🎉 Wallet created successfully!\n🔑 Your wallet address: ${publicKey}`);
        console.log(`[${new Date().toISOString()}] 🆕 Created new user and wallet for user ${userId}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error handling /wallet command for user ${userId}:`, error);
      await ctx.reply('⚠️ An error occurred while processing your wallet request.');
    }
  },
};
