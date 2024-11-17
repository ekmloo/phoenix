// commands/balance.js

const connectToDatabase = require('../db');
const User = require('../models/User');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');

// Helper function to validate Solana wallet addresses
function isValidSolanaAddress(address) {
  try {
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  command: 'balance',
  description: 'Check the balance of your Solana wallet',
  execute: async (ctx) => {
    const userId = ctx.from.id;

    try {
      console.log(`[${new Date().toISOString()}] 📊 Handling /balance command for user ${userId}`);

      // Connect to MongoDB
      await connectToDatabase();
      console.log(`[${new Date().toISOString()}] 🔗 Connected to MongoDB`);

      // Find the user in the database
      const user = await User.findOne({ telegramId: userId });
      console.log(`[${new Date().toISOString()}] 🔍 Searched for user: ${user ? 'Found' : 'Not Found'}`);

      if (!user) {
        await ctx.reply("❌ Wallet not found. Please create a wallet using the `/wallet` command.");
        console.log(`[${new Date().toISOString()}] ❌ Wallet not found for user ${userId}`);
        return;
      }

      if (!user.walletPublicKey || !isValidSolanaAddress(user.walletPublicKey)) {
        await ctx.reply("❌ Wallet information incomplete or invalid. Please create a wallet using the `/wallet` command.");
        console.log(`[${new Date().toISOString()}] ❌ Wallet information incomplete or invalid for user ${userId}`);
        return;
      }

      // Initialize Solana connection
      const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'); // Use 'devnet' for testing

      const publicKey = new PublicKey(user.walletPublicKey);

      // Fetch balance
      const balanceLamports = await connection.getBalance(publicKey);
      const balanceSOL = balanceLamports / 1e9; // Convert lamports to SOL

      await ctx.reply(`🔍 *Wallet Balance:*\n\nYour wallet address: \`${user.walletPublicKey}\`\nBalance: \`${balanceSOL} SOL\``, { parse_mode: 'Markdown' });
      console.log(`[${new Date().toISOString()}] ✅ Retrieved balance for user ${userId}: ${balanceSOL} SOL`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error handling /balance command for user ${userId}:`, error);
      await ctx.reply('⚠️ An error occurred while fetching your wallet balance. Please try again later.');
    }
  },
};
