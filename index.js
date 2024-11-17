// index.js

const { Telegraf } = require('telegraf');
const startCommand = require('./commands/start');

// Initialize environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;

// Validate BOT_TOKEN
if (!BOT_TOKEN) {
  console.error(`[${new Date().toISOString()}] ❌ Environment variable BOT_TOKEN is not defined.`);
  process.exit(1);
}

// Initialize Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);

// Middleware to log all updates
bot.use(async (ctx, next) => {
  console.log(`[${new Date().toISOString()}] 📥 Received update:`, JSON.stringify(ctx.update, null, 2));
  await next();
});

// Load /start command
try {
  if (startCommand.command && typeof startCommand.execute === 'function') {
    bot.command(startCommand.command, startCommand.execute);
    console.log(`[${new Date().toISOString()}] ✅ Loaded command: /${startCommand.command}`);
  } else {
    console.warn(`[${new Date().toISOString()}] ⚠️ Skipping command: /${startCommand.command} - Missing 'command' or 'execute'`);
  }
} catch (error) {
  console.error(`[${new Date().toISOString()}] ❌ Error loading command: /start`, error);
}

// Handle unknown commands
bot.on('text', (ctx) => {
  console.log(`[${new Date().toISOString()}] 🧐 Unknown command received: ${ctx.message.text} from user ${ctx.from.id}`);
  ctx.reply('❓ Unknown command. Available commands:\n• `/start`', { parse_mode: 'Markdown' });
});

// Error Handling Middleware
bot.catch((err, ctx) => {
  console.error(`[${new Date().toISOString()}] ❌ Telegraf Error for ${ctx.updateType}:`, err);
});

// Vercel Serverless Function Handler with Enhanced Logging
module.exports = (req, res) => {
  const { method, url, headers, body } = req;
  console.log(`[${new Date().toISOString()}] 📥 Received ${method} request for ${url}`);
  console.log(`[${new Date().toISOString()}] 📄 Headers:`, JSON.stringify(headers, null, 2));

  if (method === 'POST' && url === '/webhook') {
    console.log(`[${new Date().toISOString()}] ✅ Processing POST request to /webhook`);
    console.log(`[${new Date().toISOString()}] 📦 Body:`, JSON.stringify(body, null, 2));

    bot.handleUpdate(body)
      .then(() => {
        console.log(`[${new Date().toISOString()}] 🟢 Update processed successfully.`);
        res.status(200).end();
      })
      .catch((error) => {
        console.error(`[${new Date().toISOString()}] ❌ Error processing update:`, error);
        res.status(500).send('Internal Server Error');
      });
  } else {
    console.log(`[${new Date().toISOString()}] ℹ️ Non-webhook request received. Responding with status 200.`);
    res.status(200).send('Phoenix Bot Webhook is active.');
  }
};
