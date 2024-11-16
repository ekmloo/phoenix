const { PublicKey, Transaction, SystemProgram, Keypair } = require('@solana/web3.js');
const { connection } = require('../utils/globals'); // Make sure `connection` is properly initialized
const User = require('../models/user'); // Ensure this points to your database model
const { decrypt } = require('../utils/crypto'); // Ensure this decryption method is valid
require('dotenv').config();

module.exports = (bot) => {
  bot.command('send', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const args = ctx.message.text.split(' ').slice(1);

      if (args.length < 2) {
        return ctx.reply('❌ Usage: /send <recipient_address> <amount_in_SOL>');
      }

      const [recipient, amountSOL] = args;
      const amount = parseFloat(amountSOL);

      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Please enter a valid amount of SOL.');
      }

      // Fetch user data
      const user = await User.findOne({ telegramId });
      if (!user || !user.walletPrivateKey) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      // Decrypt user's private key
      const decryptedPrivateKey = decrypt(user.walletPrivateKey);
      const privateKeyArray = JSON.parse(decryptedPrivateKey);
      const userKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

      const userPublicKey = userKeypair.publicKey;
      const recipientPublicKey = new PublicKey(recipient);

      // Check user's balance
      const balanceLamports = await connection.getBalance(userPublicKey);
      const balanceSOL = balanceLamports / 1e9;

      if (balanceSOL < amount) {
        return ctx.reply('❌ Insufficient funds.');
      }

      // Transaction creation
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: recipientPublicKey,
          lamports: Math.round(amount * 1e9),
        })
      );

      // Send transaction
      const signature = await connection.sendTransaction(transaction, [userKeypair]);
      await connection.confirmTransaction(signature, 'confirmed');

      return ctx.reply(`✅ Transaction successful!\n\nTransaction Signature:\n${signature}`);
    } catch (error) {
      console.error('Error in /send command:', error);
      return ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
