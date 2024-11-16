// index.js

const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const { PublicKey, Connection, clusterApiUrl } = require('@solana/web3.js');

// Initialize environment variables (handled by Vercel)
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'mainnet-beta';
const BOT_WALLET_PRIVATE_KEY = process.env.BOT_WALLET_PRIVATE_KEY;

// Validate Environment Variables
if (!BOT_TOKEN) {
  throw new Error('Environment variable BOT_TOKEN is not defined.');
}

if (!MONGODB_URI) {
  throw new Error('Environment variable MONGODB_URI is not defined.');
}

if (BOT_WALLET_PRIVATE_KEY) {
  try {
    JSON.parse(BOT_WALLET_PRIVATE_KEY);
  } catch (error) {
    throw new Error('BOT_WALLET_PRIVATE_KEY must be a valid JSON array of numbers.');
  }
}

// Connect to MongoDB with connection reuse for serverless environments
let isConnected = false;

const connectToMongoDB = async () => {
  if (isConnected) {
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    throw new Error('Failed to connect to MongoDB.');
  }
};

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, required: true },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Initialize Solana Connection
const solanaConnection = new Connection(clusterApiUrl(SOLANA_CLUSTER), 'confirmed');

// Initialize Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);

// /balance Command Handler
bot.command('balance', async (ctx) => {
  try {
    await connectToMongoDB();

    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❗ You do not have a wallet associated with your account. Please set it using /setwallet command.');
    }

    const publicKey = new PublicKey(user.walletPublicKey);
    const balanceLamports = await solanaConnection.getBalance(publicKey);
    const balanceSOL = balanceLamports / 1e9;

    ctx.reply(`💰 Your balance is **${balanceSOL} SOL**.`, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Error in /balance command:', error);
    ctx.reply('⚠️ An error occurred while fetching your balance. Please try again later.');
  }
});

// /setwallet Command Handler
bot.command('setwallet', async (ctx) => {
  try {
    await connectToMongoDB();

    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);
    const walletPublicKey = args[0];

    if (!walletPublicKey) {
      return ctx.reply('❗ Please provide your wallet public key. Usage: `/setwallet YOUR_PUBLIC_KEY`', { parse_mode: 'Markdown' });
    }

    // Validate Solana Public Key
    try {
      new PublicKey(walletPublicKey);
    } catch (err) {
      return ctx.reply('❌ Invalid wallet public key. Please provide a valid Solana public key.');
    }

    // Upsert User Document
    await User.findOneAndUpdate(
      { telegramId },
      { walletPublicKey },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    ctx.reply('✅ Your wallet public key has been set successfully.');
  } catch (error) {
    console.error('❌ Error in /setwallet command:', error);
    ctx.reply('⚠️ An error occurred while setting your wallet. Please try again later.');
  }
});

// Handle Unknown Commands
bot.on('text', (ctx) => {
  ctx.reply('❓ Unknown command. Available commands:\n• `/balance` - Check your SOL balance\n• `/setwallet` - Set your wallet public key', { parse_mode: 'Markdown' });
});

// Graceful Shutdown (optional but recommended)
process.once('SIGINT', () => {
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
});

// Export the handler for Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body, res);
    } catch (error) {
      console.error('❌ Error handling update:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(200).send('Phoenix Bot Webhook is active.');
  }
};
