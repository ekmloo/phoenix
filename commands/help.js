// commands/help.js
module.exports = (bot) => {
  bot.command('help', async (ctx) => {
    const helpMessage = `
*Available Commands:*
/start - Start the bot
/referral - Get your referral link
/about - About the bot
/wallet [referral_code] - Create or view your Solana wallet. Optionally include a referral code.
/customwallet - Create a custom wallet.
/balance - Check your wallet balance
/send <address> <amount> - Send SOL to another address
/schedule <address> <amount> <delay_in_minutes> - Schedule a transaction to send SOL after a delay
/bumpbot start <contract_address> <amount_in_SOL> - Start the bumpbot for a specific token
/bumpbot stop <contract_address> - Stop the bumpbot for a specific token
/help - Show this help message

Join our community: [t.me/phoenixbotsol](https://t.me/phoenixbotsol)
    `;
    await ctx.replyWithMarkdown(helpMessage);
  });
};
