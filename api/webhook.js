// api/webhook.js
require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const connectDB = require('../utils/database');
const bot = new Telegraf(process.env.BOT_TOKEN, { telegram: { webhookReply: false } });

// Enable session middleware
bot.use(session());

// Log all incoming updates for debugging
bot.use((ctx, next) => {
  console.log('Received update:', JSON.stringify(ctx.update, null, 2));
  return next();
});

// Connect to Database
connectDB();

// Load all command handlers
require('../commands/start')(bot);
require('../commands/referral')(bot);
require('../commands/about')(bot);
require('../commands/help')(bot);
require('../commands/wallet')(bot);
require('../commands/customWallet')(bot);
require('../commands/balance')(bot);
require('../commands/send')(bot);
require('../commands/schedule')(bot);
// Removed bumpbot.js to fix issues

// Export the webhook handler for Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).end(); // Ensure the response is properly closed
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(200).end(); // Respond with 200 to prevent Telegram from resending
  }
};
