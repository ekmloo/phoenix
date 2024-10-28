const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;

// Telegram webhook route with added logging
app.post('/webhook', (req, res) => {
    console.log("Received a request to /webhook");  // Log incoming webhook hit

    const message = req.body.message;
    console.log("Request body:", req.body);  // Log the full request body for inspection

    if (message) {
        const chatId = message.chat.id;
        const text = message.text;

        console.log(`Received message: ${text} from chat ID: ${chatId}`);  // Log message details

        if (text === '/start') {
            console.log("Sending welcome message to user");  // Log action taken
            sendMessage(chatId, "Welcome to Phoenix! 🐦‍🔥 You can launch Solana tokens quick.");
        }
    } else {
        console.log("No message found in request");  // Log if message is missing
    }

    res.sendStatus(200);  // Ensure response is sent
});

// Send message function with logging for errors and success
const sendMessage = (chatId, text) => {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            console.log("Message sent successfully:", data);  // Log successful send
        } else {
            console.error("Failed to send message:", data);  // Log failure response
        }
    })
    .catch(error => {
        console.error("Error sending message:", error);  // Log errors with fetch
    });
};

module.exports = app;
