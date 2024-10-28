const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN; // Add your bot token in Vercel environment variables

// Telegram webhook route
app.post('/webhook', (req, res) => {
    const message = req.body.message;
    if (message) {
        const chatId = message.chat.id;
        const text = message.text;

        if (text === '/start') {
            // Send a quick launch message
            sendMessage(chatId, "Welcome to Phoenix! 🐦‍🔥 You can launch Solana tokens quick.");
        }
        // Add more commands as needed
    }
    res.sendStatus(200);
});

// Send message function
const sendMessage = (chatId, text) => {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
};

module.exports = app;
