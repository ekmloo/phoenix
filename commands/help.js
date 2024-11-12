// commands/help.js
module.exports = (bot) => {
  bot.help(async (ctx) => {
    const helpMessage = `
📋 *Available Commands:*

/start [referral_code] - Start the bot and optionally use a referral code.
/help - Show this help message.
/about - Learn more about Phoenix Bot.
/wallet - Create or view your Solana wallet.
/balance - Check your wallet balance.
/send <address> <amount> - Send SOL to another address.
/createtoken - Create a new token on Solana.
/referral - View your referral stats.
/schedule <recipient_address> <amount_in_SOL> <delay_in_minutes> - Schedule a SOL transfer.
    `;
    await ctx.replyWithMarkdown(helpMessage);
  });
};
