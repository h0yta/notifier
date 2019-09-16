const Slack = require('slack-node');
let properties = require('../../resources/properties.json');
let config = require('../../resources/config.json');

const sendNotification = (notification) => {

  // Always print message to console.log
  consoleLog(notification);

  if (!properties.skipSlack) {
    sendSlackNotification(notification.slackMessage);
  } else {
    console.log('Slack is turned off');
  }
}

const consoleLog = (notification) => {
  console.log(notification.timestamp, notification.consoleMessage);
}

const sendSlackNotification = (message) => {
  slack = new Slack(config.apiToken);
  slack.api('chat.postMessage', {
    text: message,
    channel: '#notifications'
  }, function (err, response) {
    if (err) {
      console.log('Error sending slack message: ', response);
    }
  });
}

exports.notify = sendNotification;