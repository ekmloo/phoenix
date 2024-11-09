// api/webhook.js

const { Telegraf, session } = require('telegraf');
const connectDB = require('../utils/database');
const bot = new Telegraf(process.env.BOT_TOKEN);

// Enable session middleware
bot.use(session());

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
require('../commands/bumpbot')(bot);

// Export the webhook handler for Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
};
