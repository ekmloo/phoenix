const { Connection, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const User = require('../models/User'); // Import the User model

async function createSPLToken(userKeypair) {
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
  return mint.publicKey.toString();
}

// Function to handle token creation command
async function handleCreateTokenCommand(ctx) {
  const userId = ctx.from.id;
  const fee = 0.015; // Set the fee for creating the token

  // Check if the user exists in the database
  const user = await User.findOne({ telegramId: userId });

  // Check if the user has enough balance
  if (!user) {
    return ctx.reply('⚠️ You need to create a wallet first using the /wallet command.');
  }

  if (user.paidVolume < fee) {
    return ctx.reply('⚠️ You do not have enough balance to create a token. Please add funds to your account.');
  }

  // Deduct the fee
  user.paidVolume -= fee; 
  await user.save();

  // Create the SPL token
  const userKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(user.walletPrivateKey))); // Use the user's keypair
  const tokenAddress = await createSPLToken(userKeypair); // Pass the user's keypair
  ctx.reply(`Token created successfully! Token address: ${tokenAddress}`);
}

module.exports = { createSPLToken, handleCreateTokenCommand };
