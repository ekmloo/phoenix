// utils/solana.js
const { Keypair } = require('@solana/web3.js');

const createWallet = () => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: Array.from(keypair.secretKey),
  };
};

module.exports = { createWallet };
