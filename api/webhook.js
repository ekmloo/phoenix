// api/webhook.js
import 'dotenv/config';
import { Telegraf, session } from 'telegraf';
import connectDB from '../utils/database.js';
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
import startCommand from '../commands/start.js';
import referralCommand from '../commands/referral.js';
import aboutCommand from '../commands/about.js';
import helpCommand from '../commands/help.js';
import walletCommand from '../commands/wallet.js';
import customWalletCommand from '../commands/customWallet.js';
import balanceCommand from '../commands/balance.js';
import sendCommand from '../commands/send.js';
import scheduleCommand from '../commands/schedule.js';

startCommand(bot);
referralCommand(bot);
aboutCommand(bot);
helpCommand(bot);
walletCommand(bot);
customWalletCommand(bot);
balanceCommand(bot);
sendCommand(bot);
scheduleCommand(bot);

// Export the webhook handler for Vercel
export default async function handler(req, res) {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).end(); // Ensure the response is properly closed
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
}
