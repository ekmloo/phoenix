// api/webhook.js

const { Telegraf, session } = require('telegraf');
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

// Enable session middleware
bot.use(session());

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
        `Welcome to Phoenix! 🔥\n\nUse /wallet ${referralCode} to create your Solana wallet and ensure your referrer receives a bonus when you perform paid actions!`
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
    `🔥 *Phoenix Bot* 🔥\n\nPhoenix Bot allows you to create and manage your Solana wallets directly within Telegram. Invite friends using your referral link and earn a 50% commission on their transaction fees when they perform paid actions!\n\nJoin our community: [t.me/phoenixbotsol](https://t.me/phoenixbotsol)`
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
/customwallet - Create a custom wallet.
/balance - Check your wallet balance
/send <address> <amount> - Send SOL to another address
/schedule <address> <amount> <delay_in_minutes> - Schedule a transaction to send SOL after a delay
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

// /customwallet Command Handler
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

// /balance Command Handler
bot.command('balance', async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
    }

    const userWallet = new PublicKey(user.walletPublicKey);
    const balanceLamports = await connection.getBalance(userWallet);
    const balanceSOL = balanceLamports / 1e9;

    await ctx.replyWithMarkdown(`💰 *Your wallet balance is:* ${balanceSOL} SOL`);
  } catch (error) {
    console.error('Error in /balance command:', error);
    await ctx.reply('❌ An error occurred while fetching your balance. Please try again later.');
  }
});

// /send Command Handler with 0% fee and referral when they perform paid actions
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

    // Decrypt the private key
    const decryptedPrivateKey = decrypt(user.walletPrivateKey);
    const privateKeyArray = JSON.parse(decryptedPrivateKey);
    const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

    // Check if the user's wallet has enough balance
    const userBalanceLamports = await connection.getBalance(fromKeypair.publicKey);
    const totalLamportsNeeded = Math.round(amountSOL * 1e9);
    if (userBalanceLamports < totalLamportsNeeded) {
      return ctx.reply('❌ Insufficient funds in your wallet to cover the amount.');
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

// /schedule Command Handler
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
    return ctx.reply('❌ Please enter a valid amount of SOL.');
  }

  if (isNaN(delayMinutes) || delayMinutes <= 0) {
    return ctx.reply('❌ Please enter a valid delay time in minutes.');
  }

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
    }

    // Decrypt the private key
    const decryptedPrivateKey = decrypt(user.walletPrivateKey);
    const privateKeyArray = JSON.parse(decryptedPrivateKey);
    const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

    // Check if the user's wallet has enough balance
    const userBalanceLamports = await connection.getBalance(fromKeypair.publicKey);
    const totalLamportsNeeded = Math.round(amountSOL * 1e9);
    if (userBalanceLamports < totalLamportsNeeded) {
      return ctx.reply('❌ Insufficient funds in your wallet to cover the amount.');
    }

    // Schedule the transaction
    schedule.scheduleJob(new Date(Date.now() + delayMinutes * 60 * 1000), async () => {
      try {
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

        // Notify user
        await bot.telegram.sendMessage(
          telegramId,
          `⏰ *Scheduled transaction executed!*\n\n🔗 *Transaction Signature:*\n\`${signature}\`\n\nView on Solana Explorer: [Click Here](https://explorer.solana.com/tx/${signature})`
        );
      } catch (err) {
        console.error('Error executing scheduled transaction:', err);
        await bot.telegram.sendMessage(
          telegramId,
          '❌ An error occurred while executing your scheduled transaction.'
        );
      }
    });

    // Notify user about the scheduled transaction
    await ctx.replyWithMarkdown(
      `🕒 *Your transaction of ${amountSOL} SOL to ${recipientAddress} has been scheduled and will execute in ${delayMinutes} minutes.*\n\n🔗 *Once executed*, you will receive a confirmation message with the transaction signature.`
    );
  } catch (error) {
    console.error('Error in /schedule command:', error);
    await ctx.reply('❌ An error occurred while scheduling your transaction. Please try again later.');
  }
});

// /bumpbot Command Handler
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
      const job = schedule.scheduleJob(jobName, '* * * * *', async () => {
        try {
          const currentUser = await User.findOne({ telegramId });

          if (!currentUser) return;

          const userBumpbot = currentUser.bumpbots.find(
            (bumpbot) => bumpbot.contractAddress === contractAddress && bumpbot.active
          );

          if (!userBumpbot) return;

          // Decrypt the bumpbot's private key
          const decryptedBumpbotPrivateKey = decrypt(encryptedBumpbotPrivateKey);
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
      const job = schedule.scheduledJobs[jobName];
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

// Export the webhook handler for Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Internal Server Error');
  }
};
