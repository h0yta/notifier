const { WebClient } = require('@slack/web-api');
let properties = require('../../resources/properties.json');
let config = require('../../resources/config.json');

const sendNotification = async (notification) => {

  // Always print message to console.log
  consoleLog(notification);

  if (!properties.skipSlack) {
    await sendSlackNotification(notification.slackMessage);
  } else {
    console.log('Slack is turned off');
  }
}

const consoleLog = (notification) => {
  console.log(notification.timestamp, notification.consoleMessage);
}

const sendSlackNotification = async (message) => {
  const web = new WebClient(config.apiKey);
  await web.chat.postMessage({
    channel: '#notifications',
    text: message,
  }).catch(err => {
    console.log(err);
  });
}

exports.notify = sendNotification;