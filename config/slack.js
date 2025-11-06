const { App, ExpressReceiver } = require('@slack/bolt');

let slackApp = null;

function initializeSlackApp() {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
    console.warn('Slack credentials not configured. Slack integration will be disabled.');
    return null;
  }

  // Use ExpressReceiver for Express integration
  // Setting endpoints to '/events' so when mounted on /slack, it becomes /slack/events
  const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    endpoints: '/events'
  });

  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver: receiver
  });

  return slackApp;
}

function getSlackApp() {
  return slackApp;
}

module.exports = { initializeSlackApp, getSlackApp };
