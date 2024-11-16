const { PublicKey, Transaction, SystemProgram, Keypair } = require('@solana/web3.js');
const { connection } = require('../utils/globals');
require('dotenv').config();

module.exports = (bot) => {
  bot.command('send', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 2) {
      return ctx.reply('❌ Usage: /send <recipient_address> <amount_in_SOL>');
    }

    const [recipient, amountSOL] = args;
    const amount = parseFloat(amountSOL);

    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Please enter a valid amount of SOL.');
    }

    try {
      const { publicKey, privateKey } = ctx.userKeypair; // Use the keypair from middleware
      const userKeypair = Keypair.fromSecretKey(privateKey);

      const recipientPublicKey = new PublicKey(recipient);
      const balanceLamports = await connection.getBalance(new PublicKey(publicKey));
      const balanceSOL = balanceLamports / 1e9;

      if (balanceSOL < amount) {
        return ctx.reply('❌ Insufficient funds.');
      }

      const transferLamports = Math.round(amount * 1e9);

      // Create and send transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userKeypair.publicKey,
          toPubkey: recipientPublicKey,
          lamports: transferLamports,
        })
      );

      const signature = await connection.sendTransaction(transaction, [userKeypair]);
      await connection.confirmTransaction(signature, 'confirmed');

      return ctx.reply(`✅ Transaction successful!\n\nTransaction Signature:\n${signature}`);
    } catch (error) {
      console.error('Error in /send command:', error);
      return ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
