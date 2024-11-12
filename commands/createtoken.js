// commands/createtoken.js
const { PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const User = require('../models/user');
const { connection, botKeypair } = require('../utils/globals');
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

      try {
        const user = await User.findOne({ telegramId: ctx.from.id });

        // Create Token
        const token = await Token.createMint(
          connection,
          botKeypair,
          botKeypair.publicKey,
          null, // Freeze Authority revoked
          0, // Decimals
          TOKEN_PROGRAM_ID
        );

        // Revoke minting authority
        await token.setAuthority(
          token.publicKey,
          null,
          'MintTokens',
          botKeypair.publicKey,
          []
        );

        // Create Token Account for user
        const userTokenAccount = await token.getOrCreateAssociatedAccountInfo(
          new PublicKey(user.walletPublicKey)
        );

        // Mint 1 token to user
        await token.mintTo(
          userTokenAccount.address,
          botKeypair.publicKey,
          [],
          1
        );

        // Save token info to user
        user.token = {
          name: ctx.session.createtoken.name,
          ticker: ctx.session.createtoken.ticker,
          photoUrl: ctx.session.createtoken.photoUrl,
          mintAddress: token.publicKey.toBase58(),
        };

        // Handle referral commission (100% to referrer)
        if (user.referredBy) {
          const referrer = await User.findOne({ telegramId: user.referredBy });
          if (referrer) {
            // Transfer commission to referrer
            const commission = Math.round(0.02 * 1e9); // 0.02 SOL fee in lamports
            const commissionTransaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: botKeypair.publicKey,
                toPubkey: new PublicKey(referrer.walletPublicKey),
                lamports: commission,
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

        await user.save();

        await ctx.replyWithMarkdown(
          `✅ *Token Created Successfully!*

*Name:* ${ctx.session.createtoken.name}
*Ticker:* ${ctx.session.createtoken.ticker}
*Mint Address:* ${token.publicKey.toBase58()}

![Token Photo](${ctx.session.createtoken.photoUrl})`,
          { parse_mode: 'Markdown' }
        );

        ctx.session.createtoken = null;
      } catch (error) {
        console.error('Error creating token:', error);
        await ctx.reply('❌ An error occurred while creating your token. Please try again later.');
        ctx.session.createtoken = null;
      }
    }
  });
};
