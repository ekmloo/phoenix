// api/webhook.js
require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const connectDB = require('../utils/database');
const bot = new Telegraf(process.env.BOT_TOKEN, { telegram: { webhookReply: false } });

bot.use(session());

bot.use((ctx, next) => {
  console.log('Received update:', JSON.stringify(ctx.update, null, 2));
  return next();
});

connectDB();

require('../commands/start')(bot);
require('../commands/wallet')(bot);
require('../commands/balance')(bot);
require('../commands/send')(bot);

module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).end();
  } catch {
    res.status(200).end();
  }
};
