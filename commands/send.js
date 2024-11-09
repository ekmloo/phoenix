// commands/send.js
const { PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { decrypt } = require('../utils/crypto');
const { connection, botKeypair } = require('../utils/globals');
const User = require('../models/user');

module.exports = (bot) => {
  bot.command('send', async (ctx) => {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 2) {
      return ctx.reply('Usage: /send <recipient_address> <amount_in_SOL>');
    }

    const recipientAddress = args[0];
    const amountSOL = parseFloat(args[1]);

    if (isNaN(amountSOL) || amountSOL <= 0) {
      return ctx.reply('❌ Please enter a valid amount of SOL.');
    }

    try {
      const user = await User.findOne({ telegramId });

      if (!user || !user.walletPublicKey) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      // Define fee amount (0.1%)
      const feePercentage = 0.1;
      const feeSOL = (amountSOL * feePercentage) / 100;
      const feeLamports = Math.round(feeSOL * 1e9); // Ensure integer lamports

      // Decrypt the private key
      const decryptedPrivateKey = decrypt(user.walletPrivateKey);
      const privateKeyArray = JSON.parse(decryptedPrivateKey);
      const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

      // Check if the user's wallet has enough balance
      const userBalanceLamports = await connection.getBalance(fromKeypair.publicKey);
      const totalLamportsNeeded = Math.round(amountSOL * 1e9) + feeLamports;
      if (userBalanceLamports < totalLamportsNeeded) {
        return ctx.reply('❌ Insufficient funds in your wallet to cover the amount and fee.');
      }

      // Create transaction to send SOL to recipient
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: new PublicKey(recipientAddress),
          lamports: Math.round(amountSOL * 1e9),
        })
      );

      // Sign and send the transaction
      const signature = await connection.sendTransaction(transaction, [fromKeypair]);
      await connection.confirmTransaction(signature, 'confirmed');

      // Transfer fee to bot's wallet
      const feeTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: botKeypair.publicKey,
          lamports: feeLamports,
        })
      );

      await connection.sendTransaction(feeTransaction, [fromKeypair]);
      await connection.confirmTransaction(feeTransaction, 'confirmed');

      // Handle referral bonus if referredBy exists
      if (user.referredBy) {
        const referrer = await User.findOne({ telegramId: user.referredBy });
        if (referrer && referrer.walletPublicKey) {
          // Send 50% of the fee to the referrer
          const referralAmountLamports = Math.round(feeLamports / 2); // 50% of the fee

          const referralTransaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: botKeypair.publicKey,
              toPubkey: new PublicKey(referrer.walletPublicKey),
              lamports: referralAmountLamports,
            })
          );

          // Sign and send the referral transaction
          const referralSignature = await connection.sendTransaction(referralTransaction, [botKeypair]);
          await connection.confirmTransaction(referralSignature, 'confirmed');

          // Notify the referrer
          await bot.telegram.sendMessage(
            referrer.telegramId,
            `🎉 *Referral Bonus Received!*\n\nYou earned ${(feeSOL / 2).toFixed(4)} SOL as a referral bonus from user [${telegramId}](tg://user?id=${telegramId}).\n\n🔗 *Transaction Signature:*\n\`${referralSignature}\`\n\nView on Solana Explorer: [Click Here](https://explorer.solana.com/tx/${referralSignature})`
          );
        }
      }

      await ctx.replyWithMarkdown(
        `✅ *Transaction sent!*\n\n🔗 *Transaction Signature:*\n\`${signature}\`\n\nYou can view the transaction on Solana Explorer: [Click Here](https://explorer.solana.com/tx/${signature})`
      );
    } catch (error) {
      console.error('Error in /send command:', error);
      await ctx.reply(
        '❌ An error occurred while sending the transaction. Please check the recipient address and your balance.'
      );
    }
  });
};
