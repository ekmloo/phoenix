// utils/globals.js
const { Connection, clusterApiUrl, Keypair } = require('@solana/web3.js');

const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

// Initialize Bot's Keypair
let botKeypair;
try {
  const BOT_WALLET_PRIVATE_KEY = process.env.BOT_WALLET_PRIVATE_KEY; // JSON array as string
  const botSecretKey = Uint8Array.from(JSON.parse(BOT_WALLET_PRIVATE_KEY));
  botKeypair = Keypair.fromSecretKey(botSecretKey);
} catch (error) {
  console.error('[-] Invalid BOT_WALLET_PRIVATE_KEY. It should be a JSON array of numbers.');
  process.exit(1);
}

module.exports = { connection, botKeypair };
