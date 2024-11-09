// commands/bumpbot.js
const { PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { decrypt, encrypt } = require('../utils/crypto');
const { connection, botKeypair } = require('../utils/globals');
const { createWallet } = require('../utils/solana');
const User = require('../models/user');
const scheduleJob = require('node-schedule');

module.exports = (bot) => {
  bot.command('bumpbot', async (ctx) => {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length === 0) {
      return ctx.reply('❌ Usage: /bumpbot <start|stop> <contract_address> <amount_in_SOL>');
    }

    const action = args[0].toLowerCase();

    if (action === 'start') {
      if (args.length < 3) {
        return ctx.reply('❌ Usage: /bumpbot start <contract_address> <amount_in_SOL>');
      }

      const contractAddress = args[1];
      const amountSOL = parseFloat(args[2]);

      if (isNaN(amountSOL) || amountSOL <= 0) {
        return ctx.reply('❌ Please enter a valid amount of SOL.');
      }

      try {
        const user = await User.findOne({ telegramId });

        if (!user || !user.walletPublicKey) {
          return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
        }

        // Check if user has enough balance (0.04 SOL fee + amountSOL)
        const userWallet = new PublicKey(user.walletPublicKey);
        const balanceLamports = await connection.getBalance(userWallet);
        const balanceSOL = balanceLamports / 1e9;

        if (balanceSOL < 0.04 + amountSOL) {
          return ctx.reply('❌ Insufficient funds. You need at least 0.04 SOL plus the bump amount in your wallet.');
        }

        // Decrypt the user's main wallet private key
        const decryptedPrivateKey = decrypt(user.walletPrivateKey);
        const privateKeyArray = JSON.parse(decryptedPrivateKey);
        const userKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

        // Deduct 0.04 SOL fee from the user's main wallet
        const feeSOL = 0.04;
        const feeLamports = Math.round(feeSOL * 1e9);

        const feeTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: userKeypair.publicKey,
            toPubkey: botKeypair.publicKey,
            lamports: feeLamports,
          })
        );

        await connection.sendTransaction(feeTransaction, [userKeypair]);
        await connection.confirmTransaction(feeTransaction, 'confirmed');

        // Deduct the specified amount from the user's main wallet to fund the bumpbot
        const bumpAmountLamports = Math.round(amountSOL * 1e9); // Convert SOL to lamports

        // Create a new bumpbot wallet for the user
        const { publicKey: bumpbotPublicKey, privateKey: bumpbotPrivateKey } = createWallet();

        // Encrypt the bumpbot wallet's private key
        const encryptedBumpbotPrivateKey = encrypt(JSON.stringify(bumpbotPrivateKey));

        // Transfer funds to the bumpbot wallet
        const fundTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: userKeypair.publicKey,
            toPubkey: new PublicKey(bumpbotPublicKey),
            lamports: bumpAmountLamports,
          })
        );

        await connection.sendTransaction(fundTransaction, [userKeypair]);
        await connection.confirmTransaction(fundTransaction, 'confirmed');

        // Add the bumpbot to the user's bumpbots array
        if (!user.bumpbots) user.bumpbots = [];
        user.bumpbots.push({
          contractAddress,
          amountSOL,
          active: true,
        });

        await user.save();

        // Schedule the bumpbot operations (micro buys and sells)
        const jobName = `bumpbot_${telegramId}_${contractAddress}`;
        scheduleJob.scheduleJob(jobName, '* * * * *', async () => {
          try {
            const currentUser = await User.findOne({ telegramId });

            if (!currentUser) return;

            const userBumpbot = currentUser.bumpbots.find(
              (bumpbot) => bumpbot.contractAddress === contractAddress && bumpbot.active
            );

            if (!userBumpbot) return;

            // Decrypt the bumpbot's private key
            const decryptedBumpbotPrivateKey = decrypt(currentUser.customWalletPrivateKey);
            const bumpbotPrivateKeyArray = JSON.parse(decryptedBumpbotPrivateKey);
            const bumpbotKeypair = Keypair.fromSecretKey(Uint8Array.from(bumpbotPrivateKeyArray));

            // Perform a micro buy of 0.011 SOL
            const buyTransaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: bumpbotKeypair.publicKey,
                toPubkey: new PublicKey(contractAddress),
                lamports: Math.round(0.011 * 1e9), // 0.011 SOL
              })
            );

            const buySignature = await connection.sendTransaction(buyTransaction, [bumpbotKeypair]);
            await connection.confirmTransaction(buySignature, 'confirmed');

            // Perform a micro sell of 0.011 SOL back to the bumpbot wallet
            const sellTransaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: new PublicKey(contractAddress),
                toPubkey: bumpbotKeypair.publicKey,
                lamports: Math.round(0.011 * 1e9), // 0.011 SOL
              })
            );

            const sellSignature = await connection.sendTransaction(sellTransaction, [botKeypair]);
            await connection.confirmTransaction(sellSignature, 'confirmed');

            // Notify the user about the bumpbot activity
            await bot.telegram.sendMessage(
              telegramId,
              `📈 *Bumpbot Activity Executed!*\n\n🔗 *Buy Signature:*\n\`${buySignature}\`\n🔗 *Sell Signature:*\n\`${sellSignature}\`\n\nView on Solana Explorer: [Buy](https://explorer.solana.com/tx/${buySignature}) | [Sell](https://explorer.solana.com/tx/${sellSignature})`
            );
          } catch (err) {
            console.error('Error in bumpbot transaction:', err);
          }
        });

        // Inform the user
        await ctx.replyWithMarkdown(
          `🚀 *Bumpbot Started!*\n\nYour bumpbot for contract address *${contractAddress}* has been activated and will perform micro buys and sells of *0.011 SOL* every minute.\n\n*Note:* Ensure you have enough funds in your bumpbot wallet to keep it running.`
        );
      } catch (error) {
        console.error('Error in /bumpbot start command:', error);
        await ctx.reply('❌ An error occurred while starting the bumpbot. Please try again later.');
      }
    } else if (action === 'stop') {
      if (args.length < 2) {
        return ctx.reply('❌ Usage: /bumpbot stop <contract_address>');
      }

      const contractAddress = args[1];

      try {
        const user = await User.findOne({ telegramId });

        if (!user) {
          return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
        }

        // Find the bumpbot for the given contract address
        const bumpbotIndex = user.bumpbots.findIndex(
          (bumpbot) => bumpbot.contractAddress === contractAddress && bumpbot.active
        );

        if (bumpbotIndex === -1) {
          return ctx.reply('❌ Active bumpbot for this contract address not found.');
        }

        // Deactivate the bumpbot
        user.bumpbots[bumpbotIndex].active = false;
        await user.save();

        // Cancel the scheduled job
        const jobName = `bumpbot_${telegramId}_${contractAddress}`;
        const job = scheduleJob.scheduledJobs[jobName];
        if (job) {
          job.cancel();
        }

        // Inform the user
        await ctx.reply('🛑 *Bumpbot Stopped.*\n\nYour bumpbot has been successfully stopped.');
      } catch (error) {
        console.error('Error in /bumpbot stop command:', error);
        await ctx.reply('❌ An error occurred while stopping the bumpbot. Please try again later.');
      }
    } else {
      await ctx.reply('❌ Invalid action. Usage: /bumpbot <start|stop> <contract_address> <amount_in_SOL>');
    }
  });
};
