// commands/send.js
const { PublicKey, Transaction, SystemProgram, Keypair } = require('@solana/web3.js');
const { connection } = require('../utils/globals');
const User = require('../models/user');
const { decrypt } = require('../utils/crypto');

module.exports = (bot) => {
  bot.command('send', async (ctx) => {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 2) {
      return ctx.reply('❌ Usage: /send <recipient_address> <amount_in_SOL>');
    }

    const recipient = args[0];
    const amountSOL = parseFloat(args[1]);

    if (isNaN(amountSOL) || amountSOL <= 0) {
      return ctx.reply('❌ Please enter a valid amount of SOL.');
    }

    try {
      const user = await User.findOne({ telegramId });

      if (!user || !user.walletPublicKey) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      const decryptedPrivateKey = decrypt(user.walletPrivateKey);
      const privateKeyArray = JSON.parse(decryptedPrivateKey);
      const userKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userKeypair.publicKey,
          toPubkey: new PublicKey(recipient),
          lamports: Math.round(amountSOL * 1e9),
        })
      );

      const signature = await connection.sendTransaction(transaction, [userKeypair]);
      await connection.confirmTransaction(signature, 'confirmed');

      await ctx.reply(`✅ Transaction successful!\nSignature: \`${signature}\``, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error in /send command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
