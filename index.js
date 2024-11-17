// index.js

const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

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
let startCommand;
try {
  startCommand = require('./commands/start');
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
module.exports = async (req, res) => {
  const { method, url, headers } = req;
  console.log(`[${new Date().toISOString()}] 📥 Received ${method} request for ${url}`);
  console.log(`[${new Date().toISOString()}] 📄 Headers:`, JSON.stringify(headers, null, 2));
  
  // Collect the body data
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    if (method === 'POST' && url === '/webhook') {
      console.log(`[${new Date().toISOString()}] ✅ Processing POST request to /webhook`);
      console.log(`[${new Date().toISOString()}] 📦 Body:`, body);
      try {
        const update = JSON.parse(body);
        await bot.handleUpdate(update, res);
        console.log(`[${new Date().toISOString()}] 🟢 Update processed successfully.`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error processing update:`, error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      console.log(`[${new Date().toISOString()}] ℹ️ Non-webhook request received. Responding with status 200.`);
      res.status(200).send('Phoenix Bot Webhook is active.');
    }
  });

  // Handle request errors
  req.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] ❌ Error receiving request:`, error);
    res.status(400).send('Bad Request');
  });
};
