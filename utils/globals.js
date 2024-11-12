// utils/globals.js
const { Connection, clusterApiUrl, Keypair } = require('@solana/web3.js');

const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

const BOT_WALLET_PRIVATE_KEY = process.env.BOT_WALLET_PRIVATE_KEY;
const botSecretKey = Uint8Array.from(JSON.parse(BOT_WALLET_PRIVATE_KEY));
const botKeypair = Keypair.fromSecretKey(botSecretKey);

module.exports = { connection, botKeypair };
