// api/webhook.js

const bot = require('../index');

// Export the webhook handler
module.exports = (req, res) => {
  if (req.method === 'POST') {
    bot.handleUpdate(req.body)
      .then(() => {
        res.status(200).end();
      })
      .catch((err) => {
        console.error('Error handling update:', err);
        res.status(500).end();
      });
  } else {
    res.status(200).send('Webhook is working!');
  }
};
