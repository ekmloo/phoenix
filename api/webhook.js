const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// Bot command handlers
bot.start((ctx) => {
  ctx.reply('Welcome to Phoenix! 🔥 You can launch Solana tokens quickly.');
});

// Additional commands
// bot.command('create_token', ...);

// Export the webhook handler
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
};
