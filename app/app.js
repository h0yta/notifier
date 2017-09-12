
var fs = require('fs');

var bookNotifier = require('./bookNotifier.js');

var books;
var properties;

var init = function() {
  var argv = require('minimist')(process.argv.slice(2));
  argv._.forEach((notifierName) => {
    runNotifier(notifierName);
  })
}

var runNotifier = function(notifierName) {
  return new Promise(function(res, rej) {
    switch(notifierName) {
      case 'book':
        bookNotifier.run().then(() => {
          res();
        });
      break;
    }
  })
}

init();