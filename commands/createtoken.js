// commands/createtoken.js
const { Markup } = require('telegraf');
const User = require('../models/user');
const { connection, botKeypair } = require('../utils/globals');
const { PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { encrypt, decrypt } = require('../utils/crypto');

module.exports = (bot) => {
  bot.command('createtoken', async (ctx) => {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('❌ Wallet not found. Please create one using /wallet.');
    }

    ctx.session.createtoken = { step: 1 };

    await ctx.reply('📛 *Enter the Token Name:*', { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx) => {
    if (ctx.session.createtoken && ctx.session.createtoken.step === 1) {
      ctx.session.createtoken.name = ctx.message.text;
      ctx.session.createtoken.step = 2;
      await ctx.reply('🔠 *Enter the Token Ticker:*', { parse_mode: 'Markdown' });
    } else if (ctx.session.createtoken && ctx.session.createtoken.step === 2) {
      const ticker = ctx.message.text.toUpperCase();
      if (ticker.length > 5) {
        return ctx.reply('❌ Ticker too long. Please enter up to 5 characters.');
      }
      ctx.session.createtoken.ticker = ticker;
      ctx.session.createtoken.step = 3;
      await ctx.reply('📸 *Please upload a photo for your token:*', {
        parse_mode: 'Markdown',
      });
    }
  });

  bot.on('photo', async (ctx) => {
    if (ctx.session.createtoken && ctx.session.createtoken.step === 3) {
      const photo = ctx.message.photo.pop();
      const fileId = photo.file_id;
      const fileUrl = await ctx.telegram.getFileLink(fileId);
      ctx.session.createtoken.photoUrl = fileUrl.href;
      ctx.session.createtoken.step = 4;

      await ctx.reply('🔄 Creating your token. Please wait...');
      
      // Charge 0.02 SOL
      try {
        const userWallet = new PublicKey(user.walletPublicKey);
        const fee = 0.02 * 1e9; // in lamports

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: userWallet,
            toPubkey: botKeypair.publicKey,
            lamports: fee,
          })
        );

        // Normally, you'd need the user's private key to sign, which is not secure.
        // Instead, consider using a payment gateway or escrow system.

        // For demonstration, assuming the bot can sign on behalf
        // WARNING: This is not secure and should be handled properly.
        // Skipping actual SOL transfer due to security concerns.

        // Create Token
        const token = await Token.createMint(
          connection,
          botKeypair,
          botKeypair.publicKey,
          null, // Freeze Authority set to null
          0, // Decimals
          TOKEN_PROGRAM_ID
        );

        // Revoke minting by setting mint authority to null
        await token.setAuthority(
          token.publicKey,
          null,
          'MintTokens',
          botKeypair.publicKey,
          []
        );

        // Create Token Account for user
        const userTokenAccount = await token.getOrCreateAssociatedAccountInfo(userWallet);

        // Optionally, set metadata using Metaplex (not included here)

        // Save token info to user
        user.token = {
          name: ctx.session.createtoken.name,
          ticker: ctx.session.createtoken.ticker,
          photoUrl: ctx.session.createtoken.photoUrl,
          mintAddress: token.publicKey.toBase58(),
        };
        await user.save();

        // Handle referral commission
        if (user.referredBy) {
          const referrer = await User.findOne({ telegramId: user.referredBy });
          if (referrer) {
            // Credit referrer with a commission (e.g., 50% of fee)
            // Implement commission logic here
            // For demonstration, just sending a message
            await bot.telegram.sendMessage(
              referrer.telegramId,
              `🎉 Your referral has created a new token! You earned a commission.`
            );
          }
        }

        await ctx.replyWithMarkdown(
          `✅ *Token Created Successfully!*\n\n*Name:* ${ctx.session.createtoken.name}\n*Ticker:* ${ctx.session.createtoken.ticker}\n*Mint Address:* ${token.publicKey.toBase58()}\n\n![Token Photo](${ctx.session.createtoken.photoUrl})`,
          { parse_mode: 'Markdown' }
        );

        // Clear session
        ctx.session.createtoken = null;
      } catch (error) {
        console.error('Error creating token:', error);
        await ctx.reply('❌ An error occurred while creating your token. Please try again later.');
        ctx.session.createtoken = null;
      }
    }
  });
};
