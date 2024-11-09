// commands/customWallet.js
const { PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const User = require('../models/user');
const { encrypt, decrypt } = require('../utils/crypto');
const { createWallet } = require('../utils/solana');
const { connection, botKeypair } = require('../utils/globals');

module.exports = (bot) => {
  bot.command('customwallet', async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      // Check if user has a main wallet
      let user = await User.findOne({ telegramId });

      if (!user || !user.walletPublicKey) {
        return ctx.reply('❌ You need to create a main wallet first using /wallet.');
      }

      // Set session variable to await the last 4 digits
      if (!ctx.session) ctx.session = {};
      ctx.session.awaitingLast4Digits = true;

      // Prompt user for the last 4 digits of their desired custom wallet
      await ctx.reply('🛠️ Please enter the last 4 digits of your desired custom wallet:');
    } catch (error) {
      console.error('Error in /customwallet command:', error);
      await ctx.reply('❌ An error occurred while initiating your custom wallet creation. Please try again later.');
    }
  });

  // Handler to process the last 4 digits input
  bot.on('text', async (ctx) => {
    if (ctx.session && ctx.session.awaitingLast4Digits) {
      const telegramId = ctx.from.id;
      const input = ctx.message.text.trim();

      // Validate input: should be exactly 4 digits
      if (!/^\d{4}$/.test(input)) {
        await ctx.reply('❌ Invalid input. Please enter exactly 4 digits.');
        return;
      }

      const last4Digits = input;

      try {
        let user = await User.findOne({ telegramId });

        if (!user || !user.walletPublicKey) {
          await ctx.reply('❌ You need to create a main wallet first using /wallet.');
          ctx.session.awaitingLast4Digits = false;
          return;
        }

        // Inform the user about the custom wallet creation process
        await ctx.replyWithMarkdown(
          `🛠️ *Creating your custom wallet with last 4 digits: ${last4Digits}*\n\nThis will cost *0.02 SOL*. Please ensure you have sufficient funds in your main wallet. The process might take some time.`
        );

        // Check if the user has at least 0.02 SOL in their main wallet
        const userWallet = new PublicKey(user.walletPublicKey);
        const balanceLamports = await connection.getBalance(userWallet);
        const balanceSOL = balanceLamports / 1e9;

        if (balanceSOL < 0.02) {
          ctx.session.awaitingLast4Digits = false;
          return ctx.reply('❌ Insufficient funds. You need at least 0.02 SOL in your main wallet to create a custom wallet.');
        }

        // Decrypt the user's main wallet private key
        const decryptedPrivateKey = decrypt(user.walletPrivateKey);
        const privateKeyArray = JSON.parse(decryptedPrivateKey);
        const userKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

        // Deduct 0.02 SOL from the user's main wallet to pay for the custom wallet creation fee
        const feeSOL = 0.02;
        const feeLamports = Math.round(feeSOL * 1e9); // 0.02 SOL in lamports

        // Create transaction to deduct the fee
        const feeTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: userKeypair.publicKey,
            toPubkey: botKeypair.publicKey, // Fee goes to the main bot wallet
            lamports: feeLamports,
          })
        );

        // Sign and send the transaction
        const feeSignature = await connection.sendTransaction(feeTransaction, [userKeypair]);
        await connection.confirmTransaction(feeSignature, 'confirmed');

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

        // Create a new custom wallet
        const { publicKey: customPublicKey, privateKey: customPrivateKey } = createWallet();

        // For demonstration, we'll simulate that the last 4 digits match
        // In reality, generating a wallet with specific last 4 digits is impractical
        const modifiedPublicKey = customPublicKey.slice(0, -4) + last4Digits;

        // Encrypt the custom wallet's private key
        const encryptedCustomPrivateKey = encrypt(JSON.stringify(customPrivateKey));

        // Assign the custom wallet to the user
        user.customWalletPublicKey = modifiedPublicKey;
        user.customWalletPrivateKey = encryptedCustomPrivateKey;
        await user.save();

        // Inform the user
        await ctx.replyWithMarkdown(
          `🛠️ *Your custom wallet has been created!*\n\n*Custom Wallet Address:* \`${modifiedPublicKey}\`\n\n*Note:* This process might take some time to fully propagate.`
        );
      } catch (error) {
        console.error('Error in processing custom wallet:', error);
        await ctx.reply('❌ An error occurred while creating your custom wallet. Please try again later.');
      } finally {
        // Reset the session variable
        ctx.session.awaitingLast4Digits = false;
      }
    }
  });
};
