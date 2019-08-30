const Slack = require('slack-node');
let properties = require('../../resources/properties.json');

const sendNotification = (notification) => {
  if (properties.skipSlack) {
    consoleLog(notification);
  } else {
    sendSlackNotification(notification.slackMessage);
  }
}

const consoleLog = (notification) => {
  console.log(notification.timestamp, notification.consoleMessage);
}

const sendSlackNotification = (message) => {
  slack = new Slack(properties.apiToken);
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