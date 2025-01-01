const { Connection, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const User = require('../models/User'); // Import the User model

async function createSPLToken(userKeypair, tokenName, tokenSymbol) {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // Create a new token
  const mint = await Token.createMint(
    connection,
    userKeypair,
    userKeypair.publicKey,
    null,
    9, // Decimals
    TOKEN_PROGRAM_ID
  );

  console.log(`Created new token with mint address: ${mint.publicKey.toString()}`);
  console.log(`Token Name: ${tokenName}, Token Symbol: ${tokenSymbol}`);
  return mint.publicKey.toString();
}

// Function to handle token creation command
async function handleCreateTokenCommand(ctx) {
  const userId = ctx.from.id;
  const fee = 0.002; // Set the fee for creating the token

  // Check if the user exists in the database
  const user = await User.findOne({ telegramId: userId });

  // Check if the user has enough balance
  if (!user) {
    return ctx.reply('⚠️ You need to create a wallet first using the /wallet command.');
  }

  if (user.paidVolume < fee) {
    return ctx.reply('⚠️ You do not have enough balance to create a token. Please add funds to your account.');
  }

  // Deduct the fee from the user's paid volume
  user.paidVolume -= fee; 
  await user.save();

  // Prompt for token details
  await ctx.reply('Please provide the token name:');
  const tokenName = await ctx.reply(); // Assume user provides name in next message
  await ctx.reply('Please provide the token symbol (ticker):');
  const tokenSymbol = await ctx.reply(); // Assume user provides symbol in next message

  // Create the SPL token
  const userKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(user.walletPrivateKey))); // Use the user's keypair
  const tokenAddress = await createSPLToken(userKeypair, tokenName, tokenSymbol); // Pass the user's keypair

  // Handle referral logic immediately after creating the token
  if (user.referrerId) {
    const referrer = await User.findOne({ telegramId: user.referrerId });
    if (referrer) {
      referrer.feesEarned += fee; // Add the fee to the referrer's earned fees
      await referrer.save(); // Save the referrer's updated fees
    }
  }

  // Update the user's paid volume
  user.paidVolume += fee; // Add the fee to the user's paid volume
  await user.save();

  ctx.reply(`Token created successfully! Token address: ${tokenAddress}`);
}

module.exports = { createSPLToken, handleCreateTokenCommand };
