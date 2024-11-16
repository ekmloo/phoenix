// utils/globals.js

const BOT_WALLET_PRIVATE_KEY = process.env.BOT_WALLET_PRIVATE_KEY;

if (!BOT_WALLET_PRIVATE_KEY) {
  throw new Error('BOT_WALLET_PRIVATE_KEY is not defined in environment variables.');
}

let privateKeyArray;
try {
  // Ensure that the environment variable is a string representing a JSON array
  if (typeof BOT_WALLET_PRIVATE_KEY !== 'string') {
    throw new Error('BOT_WALLET_PRIVATE_KEY should be a string.');
  }

  privateKeyArray = JSON.parse(BOT_WALLET_PRIVATE_KEY);

  if (!Array.isArray(privateKeyArray)) {
    throw new Error('BOT_WALLET_PRIVATE_KEY should be a JSON array.');
  }

  // Validate that all elements are numbers
  const isValid = privateKeyArray.every(num => typeof num === 'number');
  if (!isValid) {
    throw new Error('All elements in BOT_WALLET_PRIVATE_KEY should be numbers.');
  }
} catch (error) {
  console.error('Error parsing BOT_WALLET_PRIVATE_KEY:', error.message);
  throw new Error('Invalid BOT_WALLET_PRIVATE_KEY. It should be a JSON array of numbers.');
}

module.exports = {
  BOT_WALLET_PRIVATE_KEY: privateKeyArray,
  // other globals
};
