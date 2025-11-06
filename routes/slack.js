const express = require('express');
const router = express.Router();

function initializeRouter(slackApp) {
  if (!slackApp) {
    console.warn('Slack app not initialized. Slack routes will not be available.');
    return router;
  }

  // Slack events endpoint - handles all Slack interactions
  router.post('/events', async (req, res) => {
    try {
      // Let Slack Bolt handle the request
      const receiver = slackApp.receiver;
      await receiver.requestHandler(req, res);
    } catch (error) {
      console.error('Error handling Slack event:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { router, initializeRouter };
