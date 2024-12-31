const { Telegraf, Scenes, session } = require('telegraf');
const startCommand = require('./commands/start');
const walletCommand = require('./commands/wallet');
const sendScene = require('./commands/send');
const balanceCommand = require('./commands/balance');
const helpCommand = require('./commands/help');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ Environment variable BOT_TOKEN is not defined.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Initialize Stage without setting a default scene
const stage = new Scenes.Stage([sendScene]);

// Use session middleware
bot.use(session());

// Use stage middleware
bot.use(stage.middleware());

// Middleware to log all updates
bot.use(async (ctx, next) => {
  console.log(`[${new Date().toISOString()}] 📥 Received update:`, JSON.stringify(ctx.update, null, 2));
  await next();
});

// Register /start command
bot.command(startCommand.command, startCommand.execute);
console.log(`[${new Date().toISOString()}] ✅ Loaded command: /${startCommand.command}`);

// Register /wallet command
bot.command(walletCommand.command, walletCommand.execute);
console.log(`[${new Date().toISOString()}] ✅ Loaded command: /${walletCommand.command}`);

// Register /balance command
bot.command(balanceCommand.command, balanceCommand.execute);
console.log(`[${new Date().toISOString()}] ✅ Loaded command: /${balanceCommand.command}`);

//help
bot.command(helpCommand.command, helpCommand.execute); // Add this line
console.log(`[${new Date().toISOString()}] ✅ Loaded command: /${helpCommand.command}`);

// Register /send command to enter the send-wizard scene
bot.command('send', (ctx) => {
    console.log(`[${new Date().toISOString()}] 🔄 Entering send-wizard scene`);
    return ctx.scene.enter('send-wizard');
});
console.log(`[${new Date().toISOString()}] ✅ Loaded command: /send`);

// Handle unknown commands only if not in a scene
bot.on('text', (ctx) => {
  if (ctx.scene && ctx.scene.current) {
    // The user is currently in a scene; don't handle unknown commands
    return;
  }
  console.log(`[${new Date().toISOString()}] 🧐 Unknown command received: ${ctx.message.text} from user ${ctx.from.id}`);
  ctx.reply('❓ Unknown command. Available commands:\n• `/start`\n• `/wallet`\n• `/send`\n• `/balance`', { parse_mode: 'Markdown' });
});

// Error Handling Middleware
bot.catch((err, ctx) => {
  console.error(`[${new Date().toISOString()}] ❌ Telegraf Error for ${ctx.updateType}:`, err);
});

// Export the webhook handler for Vercel
module.exports = async (req, res) => {
  const { method, url } = req;

  console.log(`[${new Date().toISOString()}] 📥 Incoming request: ${method} ${url}`);

  if (method === 'POST') {
    console.log(`[${new Date().toISOString()}] ✅ Processing webhook POST request`);
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
      console.log(`[${new Date().toISOString()}] 🟢 Successfully processed webhook`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing webhook:`, error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    console.log(`[${new Date().toISOString()}] ℹ️ Non-webhook request received.`);
    res.status(200).send('Phoenix Bot is active.');
  }
};
