// utils/crypto.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be exactly 32 characters

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.error('[-] ENCRYPTION_KEY must be exactly 32 characters long.');
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters long.');
}

// Encryption Function with Random IV
const encrypt = (text) => {
  const iv = crypto.randomBytes(16); // Random IV for each encryption
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Return IV and encrypted data
  return iv.toString('hex') + ':' + encrypted;
};

// Decryption Function
const decrypt = (encrypted) => {
  const textParts = encrypted.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = { encrypt, decrypt };
