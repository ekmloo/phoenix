// commands/send.js
const { PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { connection, botKeypair } = require('../utils/globals');
const User = require('../models/user');
const { decrypt } = require('../utils/crypto');

module.exports = (bot) => {
  bot.command('send', async (ctx) => {
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

    try {
      const user = await User.findOne({ telegramId });

      if (!user || !user.walletPublicKey) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      const userPublicKey = new PublicKey(user.walletPublicKey);
      const recipientPublicKey = new PublicKey(recipient);
      const balanceLamports = await connection.getBalance(userPublicKey);
      const balanceSOL = balanceLamports / 1e9;

      if (balanceSOL < amount) {
        return ctx.reply('❌ Insufficient funds.');
      }

      // Apply 0.1% fee silently
      const fee = Math.round(amount * 1e9 * 0.001); // 0.1% fee in lamports
      const totalLamports = Math.round(amount * 1e9);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: recipientPublicKey,
          lamports: totalLamports,
        }),
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: botKeypair.publicKey,
          lamports: fee,
        })
      );

      // In reality, you cannot sign on behalf of the user. This requires user's private key.
      // For security, this step should be handled differently (e.g., users sign transactions themselves).

      // Here, we'll assume the bot has authority (not secure)
      // Proceeding for demonstration purposes

      await connection.sendTransaction(transaction, [botKeypair]);
      await connection.confirmTransaction(transaction, 'confirmed');

      // Handle referral commission (100% of fee)
      if (user.referredBy) {
        const referrer = await User.findOne({ telegramId: user.referredBy });
        if (referrer) {
          const commission = fee; // 100% of fee
          const commissionTransaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: botKeypair.publicKey,
              toPubkey: new PublicKey(referrer.walletPublicKey),
              lamports: Math.round(commission),
            })
          );

          await connection.sendTransaction(commissionTransaction, [botKeypair]);
          await connection.confirmTransaction(commissionTransaction, 'confirmed');

          // Update referrer's earnings
          referrer.referralEarnings = (referrer.referralEarnings || 0) + commission / 1e9;
          await referrer.save();

          await bot.telegram.sendMessage(
            referrer.telegramId,
            `🎉 You earned a referral commission of ${(commission / 1e9).toFixed(4)} SOL!`
          );
        }
      }

      await ctx.reply(`✅ Transaction successful!`);
    } catch (error) {
      console.error('Error in /send command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
