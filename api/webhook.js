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
    // Check if referrer exists and is not the user themselves
    const referrer = await User.findOne({ telegramId: parseInt(referralCode) });
    if (referrer && referrer.telegramId !== ctx.from.id) {
      // Inform the user to use /wallet with referral code
      await ctx.reply(
        `Welcome to Phoenix! 🔥\n\nUse /wallet to create your Solana wallet and receive a referral bonus when you make a paid transaction!`
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
    `🔥 *Phoenix Bot* 🔥\n\nPhoenix Bot allows you to create and manage your Solana wallets directly within Telegram. Invite friends using your referral link and earn a 50% commission on their transaction fees!\n\nJoin our community: [t.me/phoenixbotsol](https://t.me/phoenixbotsol)`
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
/customwallet - Create a custom wallet by paying 0.02 SOL.
/balance - Check your wallet balance
/send <address> <amount> - Send SOL to another address with a 0.1% fee
/schedule <address> <amount> <delay_in_minutes> - Schedule a transaction to send SOL after a delay with a 0.9% fee
/bumpbot start <contract_address> <amount_in_SOL> - Start the bumpbot for a specific token
/bumpbot stop <contract_address> - Stop the bumpbot for a specific token
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

    // Send public key to the user
    await ctx.replyWithMarkdown(
      `🪙 *Your new Solana wallet has been created!*\n\n*Public Key:* \`${publicKey}\``
    );
  } catch (error) {
    console.error('Error in /wallet command:', error);
    await ctx.reply('❌ An error occurred while processing your request. Please try again later.');
  }
});

// /customwallet Command Handler with 50% referral reward
bot.command('customwallet', async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    // Check if user has a main wallet
    let user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❌ You need to create a main wallet first using /wallet.');
    }

    // Prompt user for the last 4 digits of their desired custom wallet
    await ctx.reply('🛠️ Please enter the last 4 digits of your desired custom wallet:');

    // Listen for the next message from the user
    const collector = new Promise((resolve) => {
      bot.on('text', async (innerCtx) => {
        if (innerCtx.from.id !== telegramId) return;

        const input = innerCtx.message.text.trim();

        // Validate input: should be exactly 4 digits
        if (!/^\d{4}$/.test(input)) {
          await innerCtx.reply('❌ Invalid input. Please enter exactly 4 digits.');
          return resolve(null);
        }

        resolve(input);
      });
    });

    const last4Digits = await collector;
    if (!last4Digits) return;

    // Check if the user has at least 0.02 SOL in their main wallet
    const userWallet = new PublicKey(user.walletPublicKey);
    const balanceLamports = await connection.getBalance(userWallet);
    const balanceSOL = balanceLamports / 1e9;

    if (balanceSOL < 0.02) {
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

    // Ensure the last 4 digits match the user's input (simplified for demonstration)
    const modifiedPublicKey = customPublicKey.slice(0, -4) + last4Digits;

    // Encrypt the custom wallet's private key
    const encryptedCustomPrivateKey = encrypt(JSON.stringify(customPrivateKey));

    // Assign the custom wallet to the user (you might want to store it separately)
    user.customWalletPublicKey = modifiedPublicKey;
    user.customWalletPrivateKey = encryptedCustomPrivateKey; // Store if needed
    await user.save();

    // Inform the user
    await ctx.replyWithMarkdown(
      `🛠️ *Your custom wallet has been created!*\n\n*Custom Wallet Address:* \`${modifiedPublicKey}\`\n\n*Note:* This process might take some time.`
    );
  } catch (error) {
    console.error('Error in /customwallet command:', error);
    await ctx.reply('❌ An error occurred while creating your custom wallet. Please try again later.');
  }
});

// The rest of your bot's code remains the same...

// Export the webhook handler
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
};
