// utils/solana.js
const { Keypair } = require('@solana/web3.js');

/**
 * Creates a new Solana wallet (Keypair).
 * @returns {Object} An object containing the public key and private key array.
 */
const createWallet = () => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: Array.from(keypair.secretKey), // Convert Uint8Array to Array
  };
};

module.exports = { createWallet };
