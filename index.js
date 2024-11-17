// index.js

const { Telegraf } = require('telegraf');
const connectToDatabase = require('./db');
const startCommand = require('./commands/start');
const walletCommand = require('./commands/wallet');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ Environment variable BOT_TOKEN is not defined.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Register middleware to log all updates
bot.use(async (ctx, next) => {
  console.log(`[${new Date().toISOString()}] 📥 Received update:`, JSON.stringify(ctx.update, null, 2));
  await next();
});

// Register /start command
bot.command(startCommand.command, startCommand.execute);
console.log(`[${new Date().toISOString()}] ✅ Loaded command: /${startCommand.command}`);

// Register /wallet command
bot.command(walletCommand.command, walletCommand.execute);
console.log(`[${new Date().toISOString()}] ✅ Loaded command: /${walletCommand.command}`);

// Handle unknown commands
bot.on('text', (ctx) => {
  console.log(`[${new Date().toISOString()}] 🧐 Unknown command received: ${ctx.message.text} from user ${ctx.from.id}`);
  ctx.reply('❓ Unknown command. Available commands:\n• `/start`\n• `/wallet`', { parse_mode: 'Markdown' });
});

// Error Handling Middleware
bot.catch((err, ctx) => {
  console.error(`[${new Date().toISOString()}] ❌ Telegraf Error for ${ctx.updateType}:`, err);
});

// Export the webhook handler
module.exports = async (req, res) => {
  const { method, url } = req;

  if (method === 'POST' && url === '/webhook') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Error handling update:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(200).send('Phoenix Bot is active.');
  }
};
