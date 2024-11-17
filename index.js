// index.js

const { Telegraf } = require('telegraf');

// Initialize environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;

// Validate BOT_TOKEN
if (!BOT_TOKEN) {
  console.error('❌ Environment variable BOT_TOKEN is not defined.');
  process.exit(1);
}

// Initialize Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);

// /start Command Handler
bot.start((ctx) => {
  console.log(`Received /start command from user ${ctx.from.id}`);
  ctx.reply('👋 Welcome to the Phoenix Bot! Use `/start` to initiate.');
});

// Error Handling Middleware
bot.catch((err, ctx) => {
  console.error(`❌ Telegraf Error for ${ctx.updateType}`, err);
});

// Vercel Serverless Function Handler
module.exports = async (req, res) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  
  if (req.method === 'POST' && req.url === '/webhook') {
    try {
      console.log('✅ Processing POST request');
      await bot.handleUpdate(req.body, res);
    } catch (error) {
      console.error('❌ Error handling update:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(200).send('Phoenix Bot Webhook is active.');
  }
};
