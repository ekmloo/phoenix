const { Scenes } = require('telegraf');
const { Connection, PublicKey, clusterApiUrl, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const connectToDatabase = require('../db');
const User = require('../models/User');
const { decrypt } = require('../encryption');

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
    await ctx.reply("🔄 *Send SOL*\n\nPlease enter the recipient's wallet address or type `/cancel` to abort:", { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },

  // Step 2: Receive and validate recipient's wallet address
  async (ctx) => {
    // Handle commands first
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
      if (ctx.message.text === '/cancel') {
        await ctx.reply('❌ Send operation cancelled.');
        return ctx.scene.leave();
      }
      // If it's any other command, leave the scene and let the command be handled
      await ctx.scene.leave();
      return;
    }

    const recipientAddress = ctx.message.text.trim();

    if (!isValidSolanaAddress(recipientAddress)) {
      await ctx.reply("⚠️ Invalid wallet address. Please enter a valid Solana wallet address or type `/cancel` to abort:");
      return; // Stay in the current step
    }

    ctx.wizard.state.recipient = recipientAddress;
    await ctx.reply("💰 Please enter the amount of SOL you wish to send or type `/cancel` to abort:");
    return ctx.wizard.next();
  },

  // Step 3: Receive and validate amount, then process the transaction
  async (ctx) => {
    try {
      // Handle commands first
      if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
        if (ctx.message.text === '/cancel') {
          await ctx.reply('❌ Send operation cancelled.');
          return ctx.scene.leave();
        }
        // If it's any other command, leave the scene and let the command be handled
        await ctx.scene.leave();
        return;
      }

      const amountText = ctx.message.text.trim();
      const amount = parseFloat(amountText);

      if (isNaN(amount) || amount <= 0) {
        await ctx.reply("⚠️ Invalid amount. Please enter a positive number for the amount of SOL or type `/cancel` to abort:");
        return; // Stay in the current step
      }

      ctx.wizard.state.amount = amount;
      await ctx.reply("🔄 Processing your transaction...");

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

      // Connect to Solana mainnet
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      
      // Create keypair from secret key
      const senderKeypair = Keypair.fromSecretKey(secretKey);
      
      // Get sender's public key
      const senderPublicKey = senderKeypair.publicKey;
      
      // Create recipient public key
      const recipientPublicKey = new PublicKey(ctx.wizard.state.recipient);
      
      // Get recent blockhash
      const { blockhash } = await connection.getRecentBlockhash();
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: recipientPublicKey,
          lamports: ctx.wizard.state.amount * LAMPORTS_PER_SOL,
        })
      );
      
      // Set recent blockhash and fee payer
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;
      
      console.log(`[${new Date().toISOString()}] 📝 Transaction created`);
      
      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair]
      );
      
      console.log(`[${new Date().toISOString()}] ✅ Transaction confirmed: ${signature}`);
      
      // Send success message
      await ctx.reply(
        `✅ Transaction successful!\n\n` +
        `Amount: ${ctx.wizard.state.amount} SOL\n` +
        `Recipient: \`${ctx.wizard.state.recipient}\`\n` +
        `Transaction: [View on Solana Explorer](https://explorer.solana.com/tx/${signature})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing transaction:`, error);
      
      let errorMessage = '❌ Transaction failed: ';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds in your wallet.';
      } else {
        errorMessage += 'An unexpected error occurred. Please try again later.';
      }
      
      await ctx.reply(errorMessage);
    }
    
    return ctx.scene.leave();
  }
);

// Export the scene
module.exports = sendScene;
