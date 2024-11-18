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
      const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
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
          toPubkey: new PublicKey(ctx.wizard.state.recipient),
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
      if (error.message.includes('Invalid secret key length')) {
        await ctx.reply("❌ Your wallet seems corrupted. Please recreate it using `/wallet` command.");
      } else {
        await ctx.reply("❌ An error occurred while processing your transaction. Please try again later.");
      }
    }

    return ctx.scene.leave();
  }
);

// Add handlers for all commands to exit the scene
const commands = ['start', 'wallet', 'balance', 'send'];
commands.forEach(command => {
  sendScene.command(command, async (ctx) => {
    await ctx.scene.leave();
  });
});

// Add a handler for any message that starts with '/'
sendScene.hears(/^\/.*/, async (ctx) => {
  await ctx.scene.leave();
});

module.exports = sendScene;
