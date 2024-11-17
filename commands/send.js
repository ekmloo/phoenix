// commands/send.js

const { Scenes } = require('telegraf');
const { Connection, PublicKey, clusterApiUrl, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const connectToDatabase = require('../db');
const User = require('../models/User');
const { decrypt } = require('../encryption'); // Import decryption functions

// Helper function to validate Solana wallet addresses
function isValidSolanaAddress(address) {
  try {
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
}

const sendScene = new Scenes.WizardScene(
  'send-wizard',
  
  // Step 1: Ask for recipient's wallet address
  async (ctx) => {
    await ctx.reply("🔄 *Send SOL*\n\nPlease enter the recipient's wallet address:", { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  
  // Step 2: Receive and validate recipient's wallet address
  async (ctx) => {
    const recipientAddress = ctx.message.text.trim();
    
    if (!isValidSolanaAddress(recipientAddress)) {
      await ctx.reply("⚠️ Invalid wallet address. Please enter a valid Solana wallet address:");
      return; // Stay in the current step
    }
    
    ctx.wizard.state.recipient = recipientAddress;
    await ctx.reply("💰 Please enter the amount of SOL you wish to send:");
    return ctx.wizard.next();
  },
  
  // Step 3: Receive and validate amount, then process the transaction
  async (ctx) => {
    const amountText = ctx.message.text.trim();
    const amount = parseFloat(amountText);
    
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("⚠️ Invalid amount. Please enter a positive number for the amount of SOL:");
      return; // Stay in the current step
    }
    
    ctx.wizard.state.amount = amount;
    
    await ctx.reply("🔄 Processing your transaction...");
    
    try {
      // Connect to MongoDB
      await connectToDatabase();
      console.log(`[${new Date().toISOString()}] 🔗 Connected to MongoDB`);
      
      // Find the user in the database
      const userId = ctx.from.id;
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        await ctx.reply("❌ Wallet not found. Please create a wallet using `/wallet` command.");
        return ctx.scene.leave();
      }
      
      if (!user.walletPublicKey || !user.walletPrivateKey) {
        await ctx.reply("❌ Wallet information incomplete. Please create a wallet using `/wallet` command.");
        return ctx.scene.leave();
      }
      
      // Decrypt the private key
      const decryptedPrivateKeyString = decrypt(user.walletPrivateKey);
      const decryptedPrivateKeyArray = JSON.parse(decryptedPrivateKeyString);
      const secretKey = new Uint8Array(decryptedPrivateKeyArray);
      
      if (secretKey.length !== 64) {
        throw new Error('Invalid secret key length');
      }
      
      // Create Keypair from the decrypted private key
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Check sender's balance
      const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'); // Use 'devnet' for testing
      const senderBalance = await connection.getBalance(keypair.publicKey);
      
      const lamportsToSend = amount * LAMPORTS_PER_SOL;
      
      if (senderBalance < lamportsToSend + 5000) { // Adding a small buffer for transaction fees
        await ctx.reply("⚠️ Insufficient balance to complete the transaction.");
        return ctx.scene.leave();
      }
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: ctx.wizard.state.recipient,
          lamports: lamportsToSend,
        })
      );
      
      // Send transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair],
        { commitment: 'confirmed' }
      );
      
      await ctx.reply(`✅ Transaction successful!\n🔑 Signature: \`${signature}\`\n🔗 View on [Solana Explorer](https://explorer.solana.com/tx/${signature})`, { parse_mode: 'Markdown' });
      console.log(`[${new Date().toISOString()}] ✅ Transaction sent. Signature: ${signature}`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing transaction:`, error);
      await ctx.reply("❌ An error occurred while processing your transaction. Please ensure your wallet is correctly set up and try again.");
    }
    
    return ctx.scene.leave();
  }
);

module.exports = sendScene;
