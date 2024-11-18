// api/webhook.js

const { Telegraf, Scenes: { Stage }, session } = require('telegraf');
const startCommand = require('../commands/start');
const sendScene = require('../commands/send');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not defined.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Create stage for scenes
const stage = new Stage([sendScene]);

// Register middleware and scenes
bot.use(session());
bot.use(stage.middleware());

// Register /start command
bot.command(startCommand.command, startCommand.execute);

// Register /send command to enter the scene
bot.command('send', (ctx) => ctx.scene.enter('send-wizard'));

// Export the webhook handler
module.exports = (req, res) => {
  if (req.method === 'POST') {
    bot.handleUpdate(req.body)
      .then(() => {
        res.status(200).end();
      })
      .catch((err) => {
        console.error('Error handling update:', err);
        res.status(500).end();
      });
  } else {
    res.status(200).send('Webhook is working!');
  }
};
