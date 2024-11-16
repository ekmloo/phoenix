// index.js

const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const { PublicKey, Connection, clusterApiUrl } = require('@solana/web3.js');

// Initialize environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'mainnet-beta';

// Validate Environment Variables
if (!BOT_TOKEN) {
  console.error('❌ Environment variable BOT_TOKEN is not defined.');
  throw new Error('BOT_TOKEN is required.');
}

if (!MONGODB_URI) {
  console.error('❌ Environment variable MONGODB_URI is not defined.');
  throw new Error('MONGODB_URI is required.');
}

// Connect to MongoDB
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

// /start Command Handler
bot.start((ctx) => {
  console.log(`Received /start command from user ${ctx.from.id}`);
  ctx.reply('👋 Welcome to the Phoenix Bot! Use /setwallet to register your wallet and /balance to check your SOL balance.');
});

// /balance Command Handler
bot.command('balance', async (ctx) => {
  // ... (existing /balance handler code)
});

// /setwallet Command Handler
bot.command('setwallet', async (ctx) => {
  // ... (existing /setwallet handler code)
});

// Handle Unknown Commands
bot.on('text', (ctx) => {
  console.log(`Received unknown command: ${ctx.message.text} from user ${ctx.from.id}`);
  ctx.reply('❓ Unknown command. Available commands:\n• `/balance` - Check your SOL balance\n• `/setwallet` - Set your wallet public key', { parse_mode: 'Markdown' });
});

// Error Handling Middleware
bot.catch((err, ctx) => {
  console.error(`❌ Telegraf Error for ${ctx.updateType}`, err);
});

// Vercel Serverless Function Handler
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      console.log('Received POST request:', req.body);
      await bot.handleUpdate(req.body, res);
    } catch (error) {
      console.error('❌ Error handling update:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(200).send('Phoenix Bot Webhook is active.');
  }
};
