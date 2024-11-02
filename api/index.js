const express = require('express');
const { Telegraf } = require('telegraf');

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN; // Ensure this is set correctly
const bot = new Telegraf(BOT_TOKEN);

// Set up the webhook
app.use(bot.webhookCallback('/webhook'));

// Set the webhook with Telegram
bot.telegram.setWebhook(`${process.env.URL}/webhook`);

// Start command handler
bot.start((ctx) => {
  console.log(`[+] Received /start from chat ID: ${ctx.chat.id}`);
  ctx.reply('Welcome to Phoenix! 🐦‍🔥 You can launch Solana tokens quickly.');
});

// Additional commands and handlers
// e.g., bot.command('create_token', (ctx) => { /* ... */ });

// Start the Express server
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running.'));
app.listen(PORT, () => {
  console.log(`[+] Server is running on port ${PORT}`);
});
