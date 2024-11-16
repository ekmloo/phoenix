// utils/monitor.js
const { PublicKey } = require('@solana/web3.js');
const { connection, botKeypair } = require('./globals');
const User = require('../models/user');
const Telegraf = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const lastSignatures = {};

const monitorIncomingTransfers = async () => {
  const users = await User.find({ walletPublicKey: { $exists: true, $ne: null } });

  for (const user of users) {
    const publicKey = new PublicKey(user.walletPublicKey);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });

    if (!lastSignatures[user.telegramId]) {
      lastSignatures[user.telegramId] = signatures[0]?.signature;
    }

    for (const sig of signatures) {
      if (sig.signature === lastSignatures[user.telegramId]) {
        break;
      }

      const transaction = await connection.getTransaction(sig.signature);
      if (transaction && !transaction.meta.err) {
        transaction.transaction.message.instructions.forEach((instr) => {
          if (instr.programId.toBase58() === '11111111111111111111111111111111') { // System Program
            const lamports = instr.parsed?.info?.lamports || 0;
            const amountSOL = lamports / 1e9;
            if (amountSOL > 0.001) {
              bot.telegram.sendMessage(
                user.telegramId,
                `📥 You received ${amountSOL} SOL!`
              );
            }
          }
        });
      }

      if (signatures.length > 0) {
        lastSignatures[user.telegramId] = signatures[0].signature;
      }
    }
  }
};

// Start monitoring every minute
setInterval(monitorIncomingTransfers, 60000);

module.exports = () => {
  // Initialize bot
  bot.launch();
  console.log('Monitoring incoming transfers...');
};
