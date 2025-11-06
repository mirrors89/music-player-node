const express = require('express');
const router = express.Router();

function initializeRouter(slackApp) {
  if (!slackApp) {
    console.warn('Slack app not initialized. Slack routes will not be available.');
    return router;
  }

  // Use the ExpressReceiver's router directly
  // The receiver already handles /slack/events path
  return slackApp.receiver.router;
}

module.exports = { router, initializeRouter };
