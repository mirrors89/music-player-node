const { App } = require('@slack/bolt');

let slackApp = null;

function initializeSlackApp() {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
    console.warn('Slack credentials not configured. Slack integration will be disabled.');
    return null;
  }

  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
  });

  return slackApp;
}

function getSlackApp() {
  return slackApp;
}

module.exports = { initializeSlackApp, getSlackApp };
