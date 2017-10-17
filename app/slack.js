var Promise = require('promise');
var Slack = require('slack-node');
var fs = require('fs');

var sendNotification = function(message) {
  return new Promise(function(res, rej) {
    getPropertiesFile().then((property) => {
      let properties = JSON.parse(property);
      sendSlackNotification(properties.apiToken, message);
    }).catch((error) => {
      console.error(error);
    });
  });
}

var getPropertiesFile = function() {
  return new Promise(function(res, rej) {
    fs.readFile(__dirname+'/properties.json', 'utf8', function(err, data) {
      res(data);
    });
  });
}

var sendSlackNotification = function(apiToken, message) {
  var Slack = require('slack-node');
  slack = new Slack(apiToken);
  slack.api('chat.postMessage', {
    text:message,
    channel:'#notifications'
  }, function(err, response){
    if (err) {
      console.log('Error sending slack message: ', response);
    }
  });
}

exports.send = sendNotification;