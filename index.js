// index.js

const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const { PublicKey, Connection, clusterApiUrl } = require('@solana/web3.js');

// Initialize environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'mainnet-beta';
const BOT_WALLET_PRIVATE_KEY = process.env.BOT_WALLET_PRIVATE_KEY;

// Validate Environment Variables
if (!BOT_TOKEN) {
  console.error('❌ Environment variable BOT_TOKEN is not defined.');
  throw new Error('BOT_TOKEN is required.');
}

if (!MONGODB_URI) {
  console.error('❌ Environment variable MONGODB_URI is not defined.');
  throw new Error('MONGODB_URI is required.');
}

if (BOT_WALLET_PRIVATE_KEY) {
  try {
    const parsedKey = JSON.parse(BOT_WALLET_PRIVATE_KEY);
    if (!Array.isArray(parsedKey) || !parsedKey.every(num => typeof num === 'number')) {
      throw new Error();
    }
  } catch (error) {
    console.error('❌ BOT_WALLET_PRIVATE_KEY must be a valid JSON array of numbers.');
    throw new Error('Invalid BOT_WALLET_PRIVATE_KEY format.');
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

// /start Command Handler
bot.start((ctx) => {
  console.log(`Received /start command from user ${ctx.from.id}`);
  ctx.reply('👋 Welcome to the Phoenix Bot! Use /setwallet to register your wallet and /balance to check your SOL balance.');
});

// /balance Command Handler
bot.command('balance', async (ctx) => {
  try {
    await connectToMongoDB();

    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❗ You do not have a wallet associated with your account. Please set it using `/setwallet` command.', { parse_mode: 'Markdown' });
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
  console.log(`Received unknown command: ${ctx.message.text} from user ${ctx.from.id}`);
  ctx.reply('❓ Unknown command. Available commands:\n• `/balance` - Check your SOL balance\n• `/setwallet` - Set your wallet public key', { parse_mode: 'Markdown' });
});

// Error Handling Middleware
bot.catch((err, ctx) => {
  console.error(`❌ Telegraf Error for ${ctx.updateType}`, err);
});

// Graceful Shutdown (optional but recommended)
process.once('SIGINT', () => {
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
});

// Vercel Serverless Function Handler
module.exports = async (req, res) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  
  if (req.method === 'POST' && req.url === '/webhook') {
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
