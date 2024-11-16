// commands/balance.js

const { PublicKey } = require('@solana/web3.js');
const { connection } = require('../utils/globals'); // Ensure correct path
const User = require('../models/user');

const execute = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user || !user.walletPublicKey) {
      return ctx.reply('You do not have a wallet associated with your account.');
    }

    const publicKey = new PublicKey(user.walletPublicKey);
    
    // Ensure connection is defined
    if (!connection) {
      console.error('Connection object is undefined.');
      return ctx.reply('Server is currently unable to fetch your balance. Please try again later.');
    }

    const balance = await connection.getBalance(publicKey); // Line 18

    const solBalance = balance / 1e9;

    ctx.reply(`Your balance is ${solBalance} SOL.`);
  } catch (error) {
    console.error('Error in /balance command:', error);
    ctx.reply('An error occurred while fetching your balance. Please try again later.');
  }
};

module.exports = {
  command: 'balance',
  execute,
};
