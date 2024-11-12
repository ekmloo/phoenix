// commands/wallet.js
const User = require('../models/user');
const { Keypair } = require('@solana/web3.js');
const { encrypt } = require('../utils/crypto');

module.exports = (bot) => {
  bot.command('wallet', async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      let user = await User.findOne({ telegramId });

      if (!user) {
        // Create a new wallet
        const keypair = Keypair.generate();
        const walletPublicKey = keypair.publicKey.toBase58();
        const walletPrivateKey = encrypt(JSON.stringify(Array.from(keypair.secretKey)));

        user = new User({
          telegramId,
          walletPublicKey,
          walletPrivateKey,
        });

        await user.save();

        await ctx.replyWithMarkdown(
          `🎉 *Your new Solana wallet has been created!*\n\n*Public Key:* \`${walletPublicKey}\``
        );
      } else {
        // Show existing wallet
        await ctx.replyWithMarkdown(
          `💼 *Your Solana Wallet:*\n\n*Public Key:* \`${user.walletPublicKey}\``
        );
      }
    } catch (error) {
      console.error('Error in /wallet command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
