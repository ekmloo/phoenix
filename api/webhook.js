// api/webhook.js

const { Telegraf } = require('telegraf');
const startCommand = require('../commands/start');

// Initialize environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not defined.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Register /start command
bot.command(startCommand.command, startCommand.execute);

// Export webhook handler
module.exports = bot.webhookCallback('/api/webhook');
