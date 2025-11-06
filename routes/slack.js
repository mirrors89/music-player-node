const express = require('express');

function initializeRouter(slackApp) {
  const router = express.Router();

  if (!slackApp) {
    console.warn('Slack app not initialized. Slack routes will not be available.');
    router.all('*', (req, res) => {
      res.status(503).json({
        error: 'Slack integration is not initialized',
        message: 'Please configure SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET'
      });
    });
    return router;
  }

  // Add error logging middleware
  router.use((req, res, next) => {
    console.log(`[Slack] ${req.method} ${req.path}`);
    console.log('[Slack] Headers:', JSON.stringify(req.headers, null, 2));

    // Log request body for debugging (only for POST requests)
    if (req.method === 'POST') {
      const originalJson = res.json;
      res.json = function(data) {
        console.log('[Slack] Response:', JSON.stringify(data, null, 2));
        originalJson.call(this, data);
      };
    }
    next();
  });

  // Mount the Slack receiver's router
  // The receiver handles /events endpoint internally
  router.use(slackApp.receiver.router);

  // Error handler
  router.use((err, req, res, next) => {
    console.error('[Slack] Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  });

  return router;
}

module.exports = { initializeRouter };
