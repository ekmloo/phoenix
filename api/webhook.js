// webhook.js

const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { Keypair } = require('@solana/web3.js');

// Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be exactly 32 characters

// Validate Environment Variables
if (!BOT_TOKEN || !MONGODB_URI || !ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.error('[-] Missing or invalid environment variables.');
  process.exit(1);
}

// Initialize Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);

// Mongoose Connection Cache
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('[+] Connected to MongoDB');
  } catch (err) {
    console.error('[-] MongoDB connection error:', err);
    throw err;
  }
};

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, required: true, unique: true },
  walletPrivateKey: { type: String, required: true }, // Encrypted private key
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Encryption Function
const encrypt = (text) => {
  const iv = Buffer.alloc(16, 0); // Initialization vector (should be random in production)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Decryption Function
const decrypt = (encrypted) => {
  const iv = Buffer.alloc(16, 0); // Must match the IV used during encryption
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// /start Command Handler
bot.start((ctx) => {
  ctx.reply('Welcome to Phoenix! 🔥 You can launch Solana tokens quickly.\n\nUse /wallet to create or view your Solana wallet.');
});

// /wallet Command Handler
bot.command('wallet', async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    await connectToDatabase();

    // Check if user already has a wallet
    let user = await User.findOne({ telegramId });

    if (user) {
      // User exists, return their public key and a button to show private key
      ctx.replyWithMarkdown(
        `✅ *Your Solana wallet address:*\n\`${user.walletPublicKey}\``,
        Markup.inlineKeyboard([
          Markup.button.callback('🔒 Show Private Key', `show_private_key_${telegramId}`)
        ])
      );
    } else {
      // Create a new Solana wallet
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toBase58();
      const privateKey = Array.from(keypair.secretKey); // Convert Uint8Array to Array for JSON compatibility

      // Encrypt the private key
      const encryptedPrivateKey = encrypt(JSON.stringify(privateKey));

      // Save user to database
      user = new User({
        telegramId,
        walletPublicKey: publicKey,
        walletPrivateKey: encryptedPrivateKey,
      });

      await user.save();

      // Send public key with button to show private key
      ctx.replyWithMarkdown(
        `🪙 *Your new Solana wallet has been created!*\n\n*Public Key:* \`${publicKey}\``,
        Markup.inlineKeyboard([
          Markup.button.callback('🔒 Show Private Key', `show_private_key_${telegramId}`)
        ])
      );
    }
  } catch (error) {
    console.error('Error in /wallet command:', error);
    ctx.reply('❌ An error occurred while processing your request. Please try again later.');
  }
});

// Action Handler for Showing Private Key
bot.action(/show_private_key_(\d+)/, async (ctx) => {
  const telegramId = parseInt(ctx.match[1]);

  try {
    await connectToDatabase();

    // Verify the user
    const user = await User.findOne({ telegramId });

    if (!user) {
      return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
    }

    // Decrypt the private key
    const decryptedPrivateKey = decrypt(user.walletPrivateKey);

    // Confirm before sending the private key
    await ctx.reply(
      '⚠️ *WARNING:* Sharing your private key can compromise your wallet. Only proceed if you understand the risks.',
      Markup.inlineKeyboard([
        Markup.button.callback('✅ Confirm', `confirm_show_private_key_${telegramId}`),
        Markup.button.callback('❌ Cancel', `cancel_show_private_key_${telegramId}`)
      ]),
      { parse_mode: 'Markdown' }
    );

    // Remove the initial button
    await ctx.deleteMessage();
  } catch (error) {
    console.error('Error in show_private_key action:', error);
    ctx.reply('❌ An error occurred. Please try again later.');
  }
});

// Action Handler for Confirming Private Key Display
bot.action(/confirm_show_private_key_(\d+)/, async (ctx) => {
  const telegramId = parseInt(ctx.match[1]);

  try {
    await connectToDatabase();

    const user = await User.findOne({ telegramId });

    if (!user) {
      return ctx.reply('❌ Wallet not found.');
    }

    // Decrypt the private key
    const decryptedPrivateKey = decrypt(user.walletPrivateKey);

    // Send the private key
    ctx.replyWithMarkdown(
      `🔑 *Your Solana Wallet Private Key:*\n\`${decryptedPrivateKey}\``
    );

    // Remove the confirmation buttons
    await ctx.deleteMessage();
  } catch (error) {
    console.error('Error in confirm_show_private_key action:', error);
    ctx.reply('❌ An error occurred. Please try again later.');
  }
});

// Action Handler for Canceling Private Key Display
bot.action(/cancel_show_private_key_(\d+)/, async (ctx) => {
  try {
    await ctx.reply('✅ Private key display canceled.');
    await ctx.deleteMessage();
  } catch (error) {
    console.error('Error in cancel_show_private_key action:', error);
    ctx.reply('❌ An error occurred. Please try again later.');
  }
});

// Suppress Mongoose Deprecation Warning
mongoose.set('strictQuery', true);

// Export the webhook handler for Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
};
