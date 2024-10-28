const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;

app.post('/webhook', (req, res) => {
    const message = req.body.message;
    if (message) {
        const chatId = message.chat.id;
        const text = message.text;

        if (text === '/start') {
            sendMessage(chatId, "Welcome to Phoenix! 🐦‍🔥 You can launch Solana tokens quick.");
        }
    }
    res.sendStatus(200);
});

const sendMessage = (chatId, text) => {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
};

module.exports = app;  // Ensure app is exported like this
