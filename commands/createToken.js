const { Connection, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

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

module.exports = { createSPLToken };
