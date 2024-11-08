// api/webhook.js

const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const User = require('../models/user');
const connectDB = require('../utils/database');
const { createWallet } = require('../utils/solana');
const {
  Connection,
  clusterApiUrl,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
} = require('@solana/web3.js');
const mongoose = require('mongoose');
const schedule = require('node-schedule');

// Load environment variables
// No need for dotenv in production on Vercel

// Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be exactly 32 characters
const MONGODB_URI = process.env.MONGODB_URI;
const BOT_WALLET_PRIVATE_KEY = process.env.BOT_WALLET_PRIVATE_KEY; // JSON array as string

// Validate Environment Variables
if (
  !BOT_TOKEN ||
  !ENCRYPTION_KEY ||
  ENCRYPTION_KEY.length !== 32 ||
  !MONGODB_URI ||
  !BOT_WALLET_PRIVATE_KEY
) {
  console.error('[-] Missing or invalid environment variables.');
  process.exit(1);
}

// Initialize Telegraf Bot
const bot = new Telegraf(BOT_TOKEN);

// Initialize Solana Connection
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

// Initialize Bot's Keypair
let botKeypair;
try {
  const botSecretKey = Uint8Array.from(JSON.parse(BOT_WALLET_PRIVATE_KEY));
  botKeypair = Keypair.fromSecretKey(botSecretKey);
} catch (error) {
  console.error('[-] Invalid BOT_WALLET_PRIVATE_KEY. It should be a JSON array of numbers.');
  process.exit(1);
}

// Encryption Function with Random IV
const encrypt = (text) => {
  const iv = crypto.randomBytes(16); // Random IV for each encryption
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Return IV and encrypted data
  return iv.toString('hex') + ':' + encrypted;
};

// Decryption Function
const decrypt = (encrypted) => {
  const textParts = encrypted.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Suppress Mongoose Deprecation Warning
mongoose.set('strictQuery', true);

// Connect to Database
connectDB();

// /start Command Handler
bot.start(async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const referralCode = args[0]; // Expected to be the referrer's telegramId

  if (referralCode) {
    // Check if referrer exists
    const referrer = await User.findOne({ telegramId: parseInt(referralCode) });
    if (referrer && referrer.telegramId !== ctx.from.id) {
      // Inform the user to use /wallet with referral code
      await ctx.reply(
        `Welcome to Phoenix! 🔥\n\nUse /wallet ${referralCode} to create your Solana wallet and receive a referral bonus!`
      );
      return;
    }
  }

  await ctx.reply(
    'Welcome to Phoenix! 🔥\n\nUse /wallet to create or view your Solana wallet.'
  );
});

// /referral Command Handler
bot.command('referral', async (ctx) => {
  const telegramId = ctx.from.id;
  const referralLink = `https://t.me/phoenixlaunchbot?start=${telegramId}`;
  await ctx.replyWithMarkdown(`🔗 *Your referral link:*\n[Click here](${referralLink})`);
});

// /about Command Handler
bot.command('about', async (ctx) => {
  await ctx.replyWithMarkdown(
    `🔥 *Phoenix Bot* 🔥\n\nPhoenix Bot allows you to create and manage your Solana wallets directly within Telegram. Invite friends using your referral link and earn a 50% commission on their fees!\n\nJoin our community: [t.me/phoenixbotsol](https://t.me/phoenixbotsol)`
  );
});

// /help Command Handler
bot.command('help', async (ctx) => {
  const helpMessage = `
*Available Commands:*
/start - Start the bot
/referral - Get your referral link
/about - About the bot
/wallet [referral_code] - Create or view your Solana wallet. Optionally include a referral code.
/balance - Check your wallet balance
/send <address> <amount> - Send SOL to another address
/schedule <address> <amount> <delay_in_minutes> - Schedule a transaction to send SOL after a delay
/help - Show this help message

Join our community: [t.me/phoenixbotsol](https://t.me/phoenixbotsol)
  `;
  await ctx.replyWithMarkdown(helpMessage);
});

// /wallet Command Handler with optional referral
bot.command('wallet', async (ctx) => {
  const telegramId = ctx.from.id;
  const args = ctx.message.text.split(' ').slice(1);
  const referralCode = args[0]; // Assume referral code is the referrer's telegramId

  try {
    // Check if user already has a wallet
    let user = await User.findOne({ telegramId });

    if (user && user.walletPublicKey) {
      // User exists, return their public key
      await ctx.replyWithMarkdown(
        `✅ *Your Solana wallet address:*\n\`${user.walletPublicKey}\``
      );
      return;
    }

    // If user exists but doesn't have a wallet yet, update referredBy if not set
    if (user && !user.walletPublicKey) {
      if (referralCode) {
        const referrer = await User.findOne({ telegramId: parseInt(referralCode) });
        if (referrer && referrer.telegramId !== telegramId) {
          user.referredBy = referrer.telegramId;
        }
      }
    } else if (!user) {
      // Create a new user
      user = new User({
        telegramId,
      });

      if (referralCode) {
        const referrer = await User.findOne({ telegramId: parseInt(referralCode) });
        if (referrer && referrer.telegramId !== telegramId) {
          user.referredBy = referrer.telegramId;
        }
      }
    }

    // Create a new Solana wallet
    const { publicKey, privateKey } = createWallet();

    // Encrypt the private key
    const encryptedPrivateKey = encrypt(JSON.stringify(privateKey));

    // Update user with wallet info
    user.walletPublicKey = publicKey;
    user.walletPrivateKey = encryptedPrivateKey;

    await user.save();

    // Handle referral bonus if referredBy exists
    if (user.referredBy) {
      const referrer = await User.findOne({ telegramId: user.referredBy });
      if (referrer) {
        referrer.referrals += 1;
        await referrer.save();

        // Define fee amount (e.g., 0.02 SOL)
        const feeSOL = 0.02;
        const feeLamports = feeSOL * 1e9;

        // Create transaction to send 50% of the fee to referrer
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: botKeypair.publicKey,
            toPubkey: new PublicKey(referrer.walletPublicKey),
            lamports: feeLamports / 2, // 50% of the fee
          })
        );

        // Schedule the transaction after 10 minutes
        schedule.scheduleJob(Date.now() + 10 * 60 * 1000, async () => {
          try {
            const signature = await connection.sendTransaction(transaction, [botKeypair]);
            await connection.confirmTransaction(signature, 'confirmed');

            // Notify referrer
            await bot.telegram.sendMessage(
              referrer.telegramId,
              `🎉 You received a referral bonus of ${feeSOL / 2} SOL for inviting a new user!\n\n🔗 Transaction Signature:\n${signature}\n\nView on Solana Explorer: https://explorer.solana.com/tx/${signature}`
            );
          } catch (err) {
            console.error('Error sending referral bonus:', err);
          }
        });
      }
    }

    // Send public key to the user
    await ctx.replyWithMarkdown(
      `🪙 *Your new Solana wallet has been created!*\n\n*Public Key:* \`${publicKey}\``
    );
  } catch (error) {
    console.error('Error in /wallet command:', error);
    await ctx.reply('❌ An error occurred while processing your request. Please try again later.');
  }
});

// /balance Command Handler
bot.command('balance', async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
    }

    const publicKey = new PublicKey(user.walletPublicKey);

    // Get balance in lamports
    const balanceLamports = await connection.getBalance(publicKey);

    const balanceSOL = balanceLamports / 1e9; // Convert lamports to SOL

    await ctx.reply(`💰 Your wallet balance is: ${balanceSOL} SOL`);
  } catch (error) {
    console.error('Error in /balance command:', error);
    await ctx.reply('❌ An error occurred while fetching your balance.');
  }
});

// /send Command Handler with 0.1% fee and referral
bot.command('send', async (ctx) => {
  const telegramId = ctx.from.id;
  const args = ctx.message.text.split(' ').slice(1);

  if (args.length < 2) {
    return ctx.reply('Usage: /send <recipient_address> <amount_in_SOL>');
  }

  const recipientAddress = args[0];
  const amountSOL = parseFloat(args[1]);

  if (isNaN(amountSOL) || amountSOL <= 0) {
    return ctx.reply('Please enter a valid amount of SOL.');
  }

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
    }

    // Define fee amount (0.1%)
    const feePercentage = 0.1;
    const feeSOL = (amountSOL * feePercentage) / 100;
    const feeLamports = feeSOL * 1e9;

    // Decrypt the private key
    const decryptedPrivateKey = decrypt(user.walletPrivateKey);
    const privateKeyArray = JSON.parse(decryptedPrivateKey);
    const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

    // Check if the bot has enough balance to cover the fee
    const botBalance = await connection.getBalance(botKeypair.publicKey);
    if (botBalance < feeLamports) {
      return ctx.reply('❌ The bot does not have enough SOL to cover the transaction fee.');
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: new PublicKey(recipientAddress),
        lamports: amountSOL * 1e9, // Convert SOL to lamports
      })
    );

    // Add fee transfer to referrer if applicable
    if (user.referredBy) {
      const referrer = await User.findOne({ telegramId: user.referredBy });
      if (referrer && referrer.walletPublicKey) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: botKeypair.publicKey,
            toPubkey: new PublicKey(referrer.walletPublicKey),
            lamports: feeLamports / 2, // 50% of the fee
          })
        );
      }
    } else {
      // If no referrer, keep the fee in the bot's wallet or handle as needed
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: botKeypair.publicKey,
          toPubkey: botKeypair.publicKey, // Essentially, no transfer
          lamports: feeLamports / 2,
        })
      );
    }

    // Sign and send the transaction
    const signature = await connection.sendTransaction(transaction, [fromKeypair, botKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');

    await ctx.reply(
      `✅ Transaction sent!\n\n🔗 Transaction Signature:\n${signature}\n\nYou can view the transaction on Solana Explorer: https://explorer.solana.com/tx/${signature}`
    );
  } catch (error) {
    console.error('Error in /send command:', error);
    await ctx.reply(
      '❌ An error occurred while sending the transaction. Please check the recipient address and your balance.'
    );
  }
});

// /schedule Command Handler with 0.9% fee
bot.command('schedule', async (ctx) => {
  const telegramId = ctx.from.id;
  const args = ctx.message.text.split(' ').slice(1);

  if (args.length < 3) {
    return ctx.reply('Usage: /schedule <recipient_address> <amount_in_SOL> <delay_in_minutes>');
  }

  const recipientAddress = args[0];
  const amountSOL = parseFloat(args[1]);
  const delayMinutes = parseInt(args[2]);

  if (isNaN(amountSOL) || amountSOL <= 0) {
    return ctx.reply('Please enter a valid amount of SOL.');
  }

  if (isNaN(delayMinutes) || delayMinutes <= 0) {
    return ctx.reply('Please enter a valid delay time in minutes.');
  }

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
    }

    // Define fee amount (0.9%)
    const feePercentage = 0.9;
    const feeSOL = (amountSOL * feePercentage) / 100;
    const feeLamports = feeSOL * 1e9;

    // Decrypt the private key
    const decryptedPrivateKey = decrypt(user.walletPrivateKey);
    const privateKeyArray = JSON.parse(decryptedPrivateKey);
    const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

    // Check if the bot has enough balance to cover the fee
    const botBalance = await connection.getBalance(botKeypair.publicKey);
    if (botBalance < feeLamports) {
      return ctx.reply('❌ The bot does not have enough SOL to cover the transaction fee.');
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: new PublicKey(recipientAddress),
        lamports: amountSOL * 1e9, // Convert SOL to lamports
      })
    );

    // Add fee transfer to referrer if applicable
    if (user.referredBy) {
      const referrer = await User.findOne({ telegramId: user.referredBy });
      if (referrer && referrer.walletPublicKey) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: botKeypair.publicKey,
            toPubkey: new PublicKey(referrer.walletPublicKey),
            lamports: feeLamports / 2, // 50% of the fee
          })
        );
      }
    } else {
      // If no referrer, keep the fee in the bot's wallet or handle as needed
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: botKeypair.publicKey,
          toPubkey: botKeypair.publicKey, // Essentially, no transfer
          lamports: feeLamports / 2,
        })
      );
    }

    // Schedule the transaction
    schedule.scheduleJob(Date.now() + delayMinutes * 60 * 1000, async () => {
      try {
        const signature = await connection.sendTransaction(transaction, [fromKeypair, botKeypair]);
        await connection.confirmTransaction(signature, 'confirmed');

        // Notify user
        await bot.telegram.sendMessage(
          telegramId,
          `⏰ Scheduled transaction executed!\n\n🔗 Transaction Signature:\n${signature}\n\nView on Solana Explorer: https://explorer.solana.com/tx/${signature}`
        );
      } catch (err) {
        console.error('Error executing scheduled transaction:', err);
      }
    });

    // Notify user about the scheduled transaction
    await ctx.replyWithMarkdown(
      `🕒 Your transaction of ${amountSOL} SOL to ${recipientAddress} has been scheduled and will execute in ${delayMinutes} minutes.\n\n🔗 Once executed, you will receive a confirmation message with the transaction signature.`
    );
  } catch (error) {
    console.error('Error in /schedule command:', error);
    await ctx.reply('❌ An error occurred while scheduling your transaction. Please try again later.');
  }
});

// Export the webhook handler for Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
};
