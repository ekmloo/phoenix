const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN; // Ensure this is set correctly

// Telegram webhook route
app.post('/webhook', (req, res) => {
    console.log("[+] Received a request to /webhook");
    const message = req.body.message;
    if (message) {
        const chatId = message.chat.id;
        const text = message.text;
        console.log(`[+] Received message: "${text}" from chat ID: ${chatId}`);
        if (text === '/start') {
            sendMessage(chatId, "Welcome to Phoenix! 🐦‍🔥 You can launch Solana tokens quickly.");
        }
    } else {
        console.log("[-] No message found in request");
    }
    res.sendStatus(200); // Ensure response is sent
});

// Send message function
const sendMessage = (chatId, text) => {
    console.log(`[+] Sending message "${text}" to chat ID ${chatId}`);
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            console.log("[+] Message sent successfully:", data);
        } else {
            console.error("[-] Failed to send message:", data);
        }
    })
    .catch(error => {
        console.error("[-] Error sending message:", error);
    });
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[+] Server is running on port ${PORT}`);
});
