// bot.js
const express = require('express');
const { Telegraf } = require('telegraf');
require('dotenv').config(); // Ensure you have dotenv installed if using a .env file

const app = express();
app.use(express.json());

// Validate Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const URL = process.env.URL;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('Error: BOT_TOKEN is not set in environment variables.');
  process.exit(1);
}

if (!URL) {
  console.error('Error: URL is not set in environment variables.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Set up the webhook callback path
const WEBHOOK_PATH = '/webhook';

// Middleware to verify the webhook path
app.use(WEBHOOK_PATH, bot.webhookCallback(WEBHOOK_PATH));

// Function to set the webhook with proper error handling
const setBotWebhook = async () => {
  try {
    const webhookURL = `${URL}${WEBHOOK_PATH}`;
    const response = await bot.telegram.setWebhook(webhookURL);
    if (response) {
      console.log(`[+] Webhook set successfully to ${webhookURL}`);
    } else {
      console.error('[-] Failed to set webhook.');
    }
  } catch (error) {
    console.error('[-] Error setting webhook:', error);
  }
};

// Initialize the webhook before starting the server
setBotWebhook();

// Start command handler
bot.start((ctx) => {
  console.log(`[+] Received /start from chat ID: ${ctx.chat.id}`);
  ctx.reply('Welcome to Phoenix! 🔥 You can launch Solana tokens quickly.');
});

// Example of an additional command
bot.command('create_token', async (ctx) => {
  try {
    // Your token creation logic here
    await ctx.reply('Token creation feature is under development.');
  } catch (error) {
    console.error('Error in /create_token command:', error);
    await ctx.reply('An error occurred while creating the token.');
  }
});

// Fallback route for health checks or other purposes
app.get('/', (req, res) => res.send('Bot is running.'));

// Error handling middleware for Express
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).send('Internal Server Error');
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`[+] Server is running on port ${PORT}`);
});
