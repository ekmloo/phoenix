// utils/globals.js
const { Connection, clusterApiUrl, Keypair } = require('@solana/web3.js');

const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

// Initialize Bot's Keypair
let botKeypair;
try {
  const BOT_WALLET_PRIVATE_KEY = process.env.BOT_WALLET_PRIVATE_KEY;
  if (!BOT_WALLET_PRIVATE_KEY) {
    throw new Error('BOT_WALLET_PRIVATE_KEY is not defined in environment variables.');
  }
  const botSecretKey = Uint8Array.from(JSON.parse(BOT_WALLET_PRIVATE_KEY));
  botKeypair = Keypair.fromSecretKey(botSecretKey);
} catch (error) {
  console.error('[-] Invalid BOT_WALLET_PRIVATE_KEY. It should be a JSON array of numbers.');
  throw error;
}

// Initialize Fee Wallet Keypair
let feeKeypair;
try {
  const FEE_WALLET_PRIVATE_KEY = process.env.FEE_WALLET_PRIVATE_KEY;
  if (!FEE_WALLET_PRIVATE_KEY) {
    throw new Error('FEE_WALLET_PRIVATE_KEY is not defined in environment variables.');
  }
  const feeSecretKey = Uint8Array.from(JSON.parse(FEE_WALLET_PRIVATE_KEY));
  feeKeypair = Keypair.fromSecretKey(feeSecretKey);
} catch (error) {
  console.error('[-] Invalid FEE_WALLET_PRIVATE_KEY. It should be a JSON array of numbers.');
  throw error;
}

module.exports = { connection, botKeypair, feeKeypair };
