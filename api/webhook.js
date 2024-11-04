// webhook.js

const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { Keypair } = require('@solana/web3.js');

// Log environment variables (temporary)
console.log('BOT_TOKEN is set:', !!process.env.BOT_TOKEN);
console.log('MONGODB_URI is set:', !!process.env.MONGODB_URI);
console.log('ENCRYPTION_KEY is set:', !!process.env.ENCRYPTION_KEY);

// Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be exactly 32 characters

// Validate Environment Variables
if (!BOT_TOKEN || !MONGODB_URI || !ENCRYPTION_KEY) {
  console.error('[-] Missing necessary environment variables. Please set BOT_TOKEN, MONGODB_URI, and ENCRYPTION_KEY in Vercel.');
  process.exit(1);
}

// Initialize Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('[+] Connected to MongoDB'))
  .catch(err => {
    console.error('[-] MongoDB connection error:', err);
    process.exit(1);
  });

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  walletPublicKey: { type: String, required: true, unique: true },
  walletPrivateKey: { type: String, required: true }, // Encrypted private key
});

const User = mongoose.model('User', userSchema);

// Encryption Function
const encrypt = (text) => {
  const iv = Buffer.alloc(16, 0); // Initialization vector (should be random in production)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// /start Command Handler
bot.start((ctx) => {
  ctx.reply('Welcome to Phoenix! 🔥 You can launch Solana tokens quickly.\n\nUse /wallet to create or view your Solana wallet.');
});

// /wallet Command Handler
bot.command('wallet', async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    // Check if user already has a wallet
    let user = await User.findOne({ telegramId });

    if (user) {
      // User exists, return their public key
      ctx.reply(`✅ *Your Solana wallet address:*\n\`${user.walletPublicKey}\``, { parse_mode: 'Markdown' });
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

      // Send public key to the user
      ctx.reply(`🪙 *Your new Solana wallet has been created!*\n\n` +
        `*Public Key:* \`${publicKey}\`\n\n` +
        `*IMPORTANT:* Your private key is securely stored and encrypted. Do not share it with anyone.`, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error in /wallet command:', error);
    ctx.reply('❌ An error occurred while processing your request. Please try again later.');
  }
});

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
