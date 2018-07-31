const Promise = require('promise');
const Slack = require('slack-node');
const fs = require('fs');

let properties = require('./properties.json');

const sendNotification = function (message) {
  return new Promise(function (res, rej) {
    getPropertiesFile().then((property) => {
      let properties = JSON.parse(property);
      sendSlackNotification(properties.apiToken, message);
    }).catch((error) => {
      console.error(error);
    });
  });
}

const getPropertiesFile = function () {
  return new Promise(function (res, rej) {
    fs.readFile(__dirname + '/properties.json', 'utf8', function (err, data) {
      res(data);
    });
  });
}

const sendSlackNotification = function (apiToken, message) {
  if (properties.skipSlack) {
    console.log('Slack was turned off!');
    return;
  }
  return;
  let Slack = require('slack-node');
  slack = new Slack(apiToken);
  slack.api('chat.postMessage', {
    text: message,
    channel: '#notifications'
  }, function (err, response) {
    if (err) {
      console.log('Error sending slack message: ', response);
    }
  });
}

exports.send = sendNotification;