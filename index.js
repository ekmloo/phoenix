const { Telegraf } = require('telegraf');
const User = require('./models/user'); // Ensure your User model is correctly imported
const { decrypt } = require('./utils/crypto'); // Ensure decrypt logic is imported
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Middleware to check if user exists and has a wallet
bot.use(async (ctx, next) => {
  if (ctx.from && ctx.from.id) {
    const telegramId = ctx.from.id;

    try {
      const user = await User.findOne({ telegramId });

      if (!user || !user.walletPrivateKey) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      // Optionally, you can decrypt and attach the keypair to the context for further use
      const decryptedPrivateKey = decrypt(user.walletPrivateKey);
      const privateKeyArray = JSON.parse(decryptedPrivateKey);

      ctx.userKeypair = {
        publicKey: user.walletPublicKey,
        privateKey: Uint8Array.from(privateKeyArray),
      };

      // Pass control to the next middleware or command
      return next();
    } catch (error) {
      console.error('Error in middleware:', error);
      return ctx.reply('❌ An error occurred. Please try again later.');
    }
  } else {
    return ctx.reply('❌ Unable to identify user.');
  }
});

// Import and use your commands
const sendCommand = require('./commands/send');
sendCommand(bot);

// Launch bot
bot.launch()
  .then(() => console.log('Bot is running'))
  .catch((err) => console.error('Bot launch error:', err));
