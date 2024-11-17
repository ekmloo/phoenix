// index.js

const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Initialize environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;

// Validate BOT_TOKEN
if (!BOT_TOKEN) {
  console.error('❌ Environment variable BOT_TOKEN is not defined.');
  process.exit(1);
}

// Initialize Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);

// Load command files dynamically from the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.command && typeof command.execute === 'function') {
    bot.command(command.command, command.execute);
    console.log(`✅ Loaded command: /${command.command}`);
  } else {
    console.warn(`⚠️ Skipping file ${file}: Missing 'command' or 'execute'`);
  }
}

// Handle unknown commands
bot.on('text', (ctx) => {
  ctx.reply('❓ Unknown command. Available commands:\n• `/start`', { parse_mode: 'Markdown' });
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
