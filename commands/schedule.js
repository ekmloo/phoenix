// commands/schedule.js
const { PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const User = require('../models/user');
const { connection, botKeypair } = require('../utils/globals');

module.exports = (bot) => {
  bot.command('schedule', async (ctx) => {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3) {
      return ctx.reply('❌ Usage: /schedule <recipient_address> <amount_in_SOL> <delay_in_minutes>');
    }

    const [recipient, amountSOL, delayMinutes] = args;
    const delay = parseInt(delayMinutes) * 60 * 1000; // Convert minutes to milliseconds

    if (isNaN(delay) || delay <= 0) {
      return ctx.reply('❌ Please enter a valid delay in minutes.');
    }

    try {
      const user = await User.findOne({ telegramId });

      if (!user || !user.walletPublicKey) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      const amount = parseFloat(amountSOL);
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Please enter a valid amount of SOL.');
      }

      // Schedule the transfer
      setTimeout(async () => {
        try {
          // Apply 0.9% fee
          const fee = Math.round(amount * 1e9 * 0.009); // 0.9% fee in lamports
          const transferLamports = Math.round(amount * 1e9);

          const userPublicKey = new PublicKey(user.walletPublicKey);
          const recipientPublicKey = new PublicKey(recipient);

          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: userPublicKey,
              toPubkey: recipientPublicKey,
              lamports: transferLamports,
            }),
            SystemProgram.transfer({
              fromPubkey: userPublicKey,
              toPubkey: botKeypair.publicKey,
              lamports: fee,
            })
          );

          // Note: The bot cannot sign transactions on behalf of the user.
          // This requires the user's private key, which should never be shared.
          // Proper SOL transfer implementation would require user signatures.

          // Here, we proceed under the assumption that the bot has the authority,
          // which is not secure. Implement proper security measures in production.

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

          await bot.telegram.sendMessage(
            telegramId,
            `✅ Scheduled transfer of ${amount} SOL to ${recipient} has been completed.`
          );
        } catch (error) {
          console.error('Error executing scheduled transfer:', error);
          await bot.telegram.sendMessage(
            telegramId,
            '❌ An error occurred while executing the scheduled transfer.'
          );
        }
      }, delay);

      await ctx.reply('✅ Transfer scheduled successfully!');
    } catch (error) {
      console.error('Error in /schedule command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
