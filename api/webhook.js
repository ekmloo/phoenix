// api/webhook.js

const { Telegraf, Markup } = require('telegraf');
const crypto = require('crypto');
const User = require('../models/user'); // Updated path
const connectDB = require('../utils/database'); // Updated path
const { createWallet } = require('../utils/solana'); // Updated path
const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const mongoose = require('mongoose'); // Moved to top

// Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be exactly 32 characters

// Validate Environment Variables
if (!BOT_TOKEN || !ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.error('[-] Missing or invalid environment variables.');
  process.exit(1);
}

// Initialize Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);

// Encryption Function with Random IV
const encrypt = (text) => {
  const iv = crypto.randomBytes(16); // Random IV for each encryption
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Return IV and encrypted data
  return iv.toString('hex') + ':' + encrypted;
};

// Decryption Function
const decrypt = (encrypted) => {
  const textParts = encrypted.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Suppress Mongoose Deprecation Warning
mongoose.set('strictQuery', true);

// Connect to Database
connectDB();

// /start Command Handler
bot.start(async (ctx) => {
  await ctx.reply(
    'Welcome to Phoenix! 🔥 You can launch Solana tokens quickly.\n\nUse /wallet to create or view your Solana wallet.'
  );
});

// /wallet Command Handler
bot.command('wallet', async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    // Check if user already has a wallet
    let user = await User.findOne({ telegramId });

    if (user) {
      // User exists, return their public key
      await ctx.replyWithMarkdown(`✅ *Your Solana wallet address:*\n\`${user.walletPublicKey}\``);
    } else {
      // Create a new Solana wallet using the utility function
      const { publicKey, privateKey } = createWallet();

      // Encrypt the private key
      const encryptedPrivateKey = encrypt(JSON.stringify(privateKey));

      // Save user to database
      user = new User({
        telegramId,
        walletPublicKey: publicKey,
        walletPrivateKey: encryptedPrivateKey,
      });

      await user.save();

      // Send public key to the user
      await ctx.replyWithMarkdown(
        `🪙 *Your new Solana wallet has been created!*\n\n*Public Key:* \`${publicKey}\``
      );
    }
  } catch (error) {
    console.error('Error in /wallet command:', error);
    await ctx.reply('❌ An error occurred while processing your request. Please try again later.');
  }
});

// /balance Command Handler
bot.command('balance', async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    const user = await User.findOne({ telegramId });

    if (!user) {
      return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
    }

    const publicKey = new PublicKey(user.walletPublicKey);

    // Create a connection to the Solana cluster
    const connection = new Connection(clusterApiUrl('mainnet-beta'));

    // Get balance in lamports
    const balanceLamports = await connection.getBalance(publicKey);

    const balanceSOL = balanceLamports / 1e9; // Convert lamports to SOL

    await ctx.reply(`💰 Your wallet balance is: ${balanceSOL} SOL`);
  } catch (error) {
    console.error('Error in /balance command:', error);
    await ctx.reply('❌ An error occurred while fetching your balance.');
  }
});

// /help Command Handler
bot.command('help', async (ctx) => {
  const helpMessage = `
Available commands:
/start - Start the bot
/wallet - Create or view your Solana wallet
/balance - Check your wallet balance
/help - Show this help message
`;
  await ctx.reply(helpMessage);
});

// Export the webhook handler for Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
};
