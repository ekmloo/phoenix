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

      if (!user || !user.walletPublicKey || !user.walletPrivateKey) {
        return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
      }

      // Decrypt user's private key
      const decryptedPrivateKey = decrypt(user.walletPrivateKey);
      const privateKeyArray = JSON.parse(decryptedPrivateKey);
      const userKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

      const userPublicKey = userKeypair.publicKey;
      const recipientPublicKey = new PublicKey(recipient);
      const balanceLamports = await connection.getBalance(userPublicKey);
      const balanceSOL = balanceLamports / 1e9;

      if (balanceSOL < amount) {
        return ctx.reply('❌ Insufficient funds.');
      }

      // Apply 0.1% fee silently
      const feeLamports = Math.round(amount * 1e9 * 0.001); // 0.1% fee in lamports
      const totalLamports = Math.round(amount * 1e9);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: recipientPublicKey,
          lamports: totalLamports,
        }),
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: botKeypair.publicKey,
          lamports: feeLamports,
        })
      );

      // Send transaction
      const signature = await connection.sendTransaction(transaction, [userKeypair]);
      await connection.confirmTransaction(signature, 'confirmed');

      // Handle referral commission (100% of fee)
      if (user.referredBy) {
        const referrer = await User.findOne({ telegramId: user.referredBy });
        if (referrer && referrer.walletPublicKey) {
          const commissionTransaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: botKeypair.publicKey,
              toPubkey: new PublicKey(referrer.walletPublicKey),
              lamports: feeLamports,
            })
          );

          const commissionSignature = await connection.sendTransaction(commissionTransaction, [botKeypair]);
          await connection.confirmTransaction(commissionSignature, 'confirmed');

          // Update referrer's earnings
          referrer.referralEarnings = (referrer.referralEarnings || 0) + feeLamports / 1e9;
          await referrer.save();

          await bot.telegram.sendMessage(
            referrer.telegramId,
            `🎉 You earned a referral commission of ${(feeLamports / 1e9).toFixed(4)} SOL!`
          );
        }
      }

      await ctx.reply(`✅ Transaction successful!\n\nTransaction Signature:\n${signature}`);
    } catch (error) {
      console.error('Error in /send command:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  });
};
